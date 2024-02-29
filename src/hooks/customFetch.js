
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
 * Function to bypass cors issues
 * @param {String} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export const customFetch = async (url, options = {}) => {
    return new Promise((res, rej) => {
        let config
        if (url instanceof Request) {
            config = {
                method: url.method || 'get',
                body: url.body,
                headers: url.headers,
            }
            url = url.url
        } else {
            config = { ...options }
        }
        if (config.body) {
            if (config.body instanceof URLSearchParams) {
                config.body = config.body.toString()
            } else if (config.body instanceof Uint8Array || config.body instanceof ArrayBuffer) {
                const uint8Array = config.body instanceof Uint8Array ? config.body : new Uint8Array(config.body)
                const uint8ArrayToString = [...uint8Array].map(byte => String.fromCharCode(byte)).join('')
                config.body = btoa(uint8ArrayToString);
            }
        }
        const onSuccess = (data) => {
            const { status, statusText, content, headers, resUrl } = data
            logger.debug(`res ${config.method} ${url} ${status}`)
            let newBody = undefined
            if (content) {
                const binaryString = atob(content)
                const bytes = new Uint8Array(binaryString.length)

                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                newBody = new window.Blob([bytes])
            }
            res(new ResponseHack(newBody, {
                status,
                statusText,
                headers,
                url: resUrl || url,
            }))
        }
        const onFailure = (error) => {
            logger.error(`res error ${url}`)
            logger.error(error)
            if (error.error) {
                rej(new Error(error.error))
            } else {
                rej(error)
            }

        }
        if (utils.isTv()) {
            const currentReq = currentReqIndex = (currentReqIndex + 1) % CONCURRENT_REQ_LIMIT

            webOS.service.request(serviceURL, {
                method: `forwardRequest${currentReq}`,
                parameters: { url, ...config },
                onSuccess,
                onFailure,
            })
        } else {
            window.fetch(`${_LOCALHOST_SERVER_}/webos2`, {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, ...config }),
            }).then(res2 => res2.json()).then(onSuccess).catch(onFailure)
        }
    })
}

const useCustomFetch = () => customFetch

export default useCustomFetch
