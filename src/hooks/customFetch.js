
import 'webostvjs'
import { v4 as uuidv4 } from 'uuid'
import utils from '../utils'
import logger from '../logger'
import { _LOCALHOST_SERVER_ } from '../const'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

export const serviceURL = 'luna://com.crunchyroll.stream.app.service/'
const CONCURRENT_REQ_LIMIT = 8
let currentReqIndex = CONCURRENT_REQ_LIMIT

/**
 * Hack class to set url property
 */
class ResponseHack extends Response {
    constructor(body, options) {
        super(body, options)
        if (options && options.url) {
            this.originUrl = options.url
        } else {
            this.originUrl = ''
        }
        Object.defineProperty(this, 'url', {
            get: () => { return this.originUrl },
        })
    }
}

/**
 * set up request to be done
 * @param {String | Request} url
 * @param {RequestInit} [options]
 * @return {RequestInit}
 */
export const setUpRequest = (url, options = {}) => {
    let config
    if (url instanceof Request) {
        config = {
            url: url.url,
            method: url.method || 'get',
            body: url.body,
            headers: url.headers,
            resStatus: 'active',
            timeout: 5 * 1000,
        }
    } else {
        config = {
            url,
            resStatus: 'active',
            timeout: 5 * 1000,
            ...options,
        }
    }
    if (config.body) {
        if (config.body instanceof URLSearchParams) {
            config.body = config.body.toString()
        } else if (config.body instanceof Uint8Array || config.body instanceof ArrayBuffer) {
            config.body = utils.arrayToBase64(config.body)
        }
    }
    return config
}

/**
 * fake progress event
 * @param {Function} [onProgress]
 * @returns {Function}
 */
export const makeFetchProgress = (onProgress) => {
    /**
     * @param {Response} res
     * @returns {Promise}
     */
    return async (res) => {
        if (onProgress) {
            const reader = res.body.getReader()
            const total = parseInt(res.headers.get('content-length'))

            let loaded = 0
            let loading = true
            /** @type {Array<Uint8Array>} */
            let chunks = []

            while (loading) {
                const { done, value } = await reader.read()
                if (done) {
                    loading = false
                    onProgress({ loaded, total })
                } else {
                    loaded += value.length
                    chunks.push(value)
                    onProgress({ loaded, total })
                }
            }
            const resTmp = new window.Response(new window.Blob(chunks))
            const { status, statusText, content, headers, resUrl } = await resTmp.json()
            const buffContent = utils.base64toArray(content)
            return { status, statusText, content: buffContent.buffer, headers, resUrl }
        }
        return res.json()
    }
}

/**
 * make face progress for a services
 * @param {Object} obj
 * @param {RequestInit} obj.config
 * @param {Function} obj.onSuccess
 * @param {Function} [obj.onProgress]
 * * @param {Function} [obj.onFailure]
 */
export const makeServiceProgress = ({ config, onSuccess, onProgress }) => {
    /** @type {Array<Uint8Array>} */
    let chunks = []
    /**
     * @param {Response} res
     * @param {Object} sub
     */
    return (res, sub) => {
        if (res.id === config.id) {
            if (config.resStatus === 'active') {
                const { loaded, total, status, content } = res
                if (200 <= status && status < 300) {
                    chunks.push(utils.base64toArray(content))
                    onProgress({ loaded, total })
                    if (loaded === total) {
                        const resTmp = new window.Response(new window.Blob(chunks))
                        resTmp.arrayBuffer().then(arr => {
                            res.content = arr
                            sub.cancel()
                            onSuccess(res)
                        })
                    }
                } else {
                    sub.cancel()
                    onSuccess(res)
                }
            } else {
                sub.cancel()
            }
        }
    }
}

/**
 * Does request throught service or fetch
 * @param {Object} obj
 * @param {RequestInit} obj.config
 * @param {Function} obj.onSuccess
 * @param {Function} obj.onFailure
 * @param {Function} [obj.onProgress]
 */
export const makeRequest = ({ config, onSuccess, onFailure, onProgress }) => {
    if (utils.isTv()) {
        const currentReq = currentReqIndex = (currentReqIndex + 1) % CONCURRENT_REQ_LIMIT

        if (onProgress) {
            const serviceProgress = makeServiceProgress({ config, onProgress, onSuccess, onFailure })
            config.id = uuidv4()
            const sub = webOS.service.request(serviceURL, {
                method: `forwardRequest${currentReq}`,
                parameters: config,
                onSuccess: (res) => serviceProgress(res, sub),
                onFailure: (err) => {
                    Promise.resolve().then(() => sub.cancel())  // deferred
                    onFailure(err)
                },
                subscribe: true,
            })
        } else {
            webOS.service.request(serviceURL, {
                method: `forwardRequest${currentReq}`,
                parameters: config,
                onSuccess,
                onFailure,
            })
        }
    } else {
        const fetchProgress = makeFetchProgress(onProgress)
        window.fetch(`${_LOCALHOST_SERVER_}/webos2`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config),
        }).then(fetchProgress).then(onSuccess).catch(onFailure)
    }
}

/**
 * Function to bypass cors issues
 * @param {String} url
 * @param {RequestInit} [options]
 * * @param {Boolean} [direct] turn on return response as raw content
 * @returns {Promise<Response>}
 */
export const customFetch = async (url, options = {}, direct = false) => {
    return new Promise((res, rej) => {
        const config = setUpRequest(url, options)
        const onSuccess = (data) => {
            config.resStatus = 'done'
            const { status, statusText, content, headers, resUrl } = data
            logger.debug(`req ${config.method || 'get'} ${config.url} ${status}`)
            if (direct) {
                if (200 <= status && status < 300) {
                    res(content)
                } else {
                    rej({ status, statusText, headers })
                }
            } else {
                let newBody = undefined
                if (content) {
                    newBody = utils.base64toArray(content)
                }
                res(new ResponseHack(newBody, {
                    status,
                    statusText,
                    headers,
                    url: resUrl || config.url,
                }))
            }
        }
        const onFailure = (error) => {
            config.resStatus = 'fail'
            logger.error(`req ${config.method || 'get'} ${config.url}`)
            logger.error(error)
            if (error.error) {
                rej(new Error(error.error))
            } else {
                rej(error)
            }
        }
        makeRequest({ config, onFailure, onSuccess })
    })
}

const useCustomFetch = () => customFetch

export default useCustomFetch
