
import 'webostvjs'
import { v4 as uuidv4 } from 'uuid'
import utils from '../utils'
import logger from '../logger'
import { _LOCALHOST_SERVER_ } from '../const'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

export const serviceURL = 'luna://com.crunchyroll.stream.app.service/'
const CONCURRENT_REQ_LIMIT = 10
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
 * @param {Boolean} sync
 * @return {RequestInit | Promise<RequestInit>}
 */
export const setUpRequest = (url, options = {}, sync = true) => {
    let config, out
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
    out = config
    if (config.body) {
        if (config.body instanceof URLSearchParams) {
            config.body = config.body.toString()
        } else if (config.body instanceof Uint8Array || config.body instanceof ArrayBuffer) {
            if (sync) {
                config.body = utils.arrayToBase64(config.body)
            } else {
                out = utils.arrayToBase64Async(config.body).then(body => {
                    config.body = body
                    return config
                })
            }
        }
    }
    return out
}

/**
 * fake progress event
 * @param {Function} [onProgress]
 * @returns {Function}
 */
const makeFetchProgress = (onProgress) => {
    /**
     * @param {Response} res
     * @returns {Promise}
     */
    return async (res) => {
        let out = null
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
            const { status, statusText, content, headers, resUrl, compress } = await resTmp.json()
            const buffContent = await utils.decodeResponseAsync({ content, compress })
            out = { status, statusText, content: buffContent.buffer, headers, resUrl }
        } else {
            out = await res.json()
            if (out.returnValue === false) {
                throw out
            }
        }
        return out
    }
}

/**
 * make face progress for a services
 * @param {Object} obj
 * @param {RequestInit} obj.config
 * @param {Function} obj.onSuccess
 * @param {Function} [obj.onProgress]
 * @returns {(res, sub) => Promise}
 */
const makeServiceProgress = ({ config, onSuccess, onProgress }) => {
    /** @type {Array<Uint8Array>} */
    let chunks = []
    /**
     * @param {Response} res
     * @param {Object} sub
     */
    return async (res, sub) => {
        if (res.id === config.id) {
            if (config.resStatus === 'active') {
                const { loaded, total, status, content, compress } = res
                if (200 <= status && status < 300) {
                    chunks.push(await utils.decodeResponseAsync({ content, compress }))
                    onProgress({ loaded, total })
                    if (loaded === total) {
                        const resTmp = new window.Response(new window.Blob(chunks))
                        resTmp.arrayBuffer().then(arr => {
                            res.compress = false
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
 * @param {Object} obj.parameters
 * @param {Function} obj.onSuccess
 * @param {Function} obj.onFailure
 * @param {Function} [obj.onProgress]
 */
const _makeRequest = ({ config, parameters, onSuccess, onFailure, onProgress }) => {
    if (utils.isTv()) {
        const currentReq = currentReqIndex = (currentReqIndex + 1) % CONCURRENT_REQ_LIMIT
        const method = `forwardRequest${currentReq}`
        if (onProgress) {
            const serviceProgress = makeServiceProgress({ config, onProgress, onSuccess, onFailure })
            const sub = webOS.service.request(serviceURL, {
                method,
                parameters,
                onSuccess: (res) => serviceProgress(res, sub),
                onFailure: (err) => {
                    sub.cancel()
                    onFailure(err)
                },
                subscribe: true,
            })
        } else {
            webOS.service.request(serviceURL, {
                method,
                parameters,
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
            body: JSON.stringify(parameters),
        }).then(fetchProgress).then(onSuccess).catch(onFailure)
    }
}

/**
 * Does request throught service or fetch
 * @param {Object} obj
 * @param {RequestInit} obj.config
 * @param {Function} obj.onSuccess
 * @param {Function} obj.onFailure
 * @param {Function} [obj.onProgress]
 * @param {Boolean} sync
 */
export const makeRequest = (obj, sync = true) => {
    obj.config.id = uuidv4()
    if (sync) {
        obj.parameters = { d: utils.encodeRequest(obj.config) }
        _makeRequest(obj)
    } else {
        utils.encodeRequestAsync(obj.config).then(d => {
            obj.parameters = { d }
            _makeRequest(obj)
        })
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
    let res, rej
    const prom = new Promise((resolve, reject) => { res = resolve; rej = reject })
    const configProm = setUpRequest(url, options, false)
    const config = await configProm
    const onSuccess = async (data) => {
        config.resStatus = 'done'
        const { status, statusText, content, headers, resUrl, compress } = data
        logger.debug(`req ${config.method || 'get'} ${config.url} ${status}`)
        /**  @type {Uint8Array} */
        const decodedContent = content ? await utils.decodeResponseAsync({ content, compress }) : undefined
        if (direct) {
            if (200 <= status && status < 300) {
                res(decodedContent)
            } else {
                rej({ status, statusText, headers })
            }
        } else {
            res(new ResponseHack(decodedContent, {
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
        if (error.error) {
            if (error.retry) {
                rej(error)
            } else {
                rej(new Error(error.error))
            }
        } else {
            rej(error)
        }
    }
    makeRequest({ config, onFailure, onSuccess })
    return prom
}

const useCustomFetch = () => customFetch

export default useCustomFetch
