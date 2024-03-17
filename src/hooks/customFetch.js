
import 'webostvjs'
import utils from '../utils'
import logger from '../logger'
import { _LOCALHOST_SERVER_ } from '../const'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const serviceURL = 'luna://com.crunchyroll.stream.app.service/'
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
        }
    } else {
        config = { url, ...options }
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
 * Does request throught service or fetch
 * @param {Object} obj
 * @param {RquestInit} obj.config
 * @param {Function} obj.onSuccess
 * @param {Function} obj.onFailure
 */
export const makeRequest = ({ config, onSuccess, onFailure }) => {
    if (utils.isTv()) {
        const currentReq = currentReqIndex = (currentReqIndex + 1) % CONCURRENT_REQ_LIMIT

        webOS.service.request(serviceURL, {
            method: `forwardRequest${currentReq}`,
            parameters: config,
            onSuccess,
            onFailure,
        })
    } else {
        window.fetch(`${_LOCALHOST_SERVER_}/webos2`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config),
        }).then(res2 => res2.json()).then(onSuccess).catch(onFailure)
    }
}


/**
 * Function to bypass cors issues
 * @param {String} url
 * @param {RequestInit} [options]
 * * @param {Boolean} [direct]
 * @returns {Promise<Response>}
 */
export const customFetch = async (url, options = {}, direct = false) => {
    return new Promise((res, rej) => {
        const config = setUpRequest(url, options)
        const onSuccess = (data) => {
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
