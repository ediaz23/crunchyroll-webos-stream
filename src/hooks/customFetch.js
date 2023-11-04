
import 'webostvjs'
import utils from '../utils'
import logger from '../logger'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

const serviceURL = 'luna://com.crunchyroll.stream.app.service/'


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
    }
    get url() {
        return this.originUrl
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
        const config = { ...options }
        if (config.body && config.body instanceof URLSearchParams) {
            config.body = config.body.toString()
        }
        const onSuccess = (data) => {
            const { status, statusText, content, headers } = data
            const binaryString = atob(content)
            const bytes = new Uint8Array(binaryString.length)

            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            logger.debug(`res okey ${status} ${url}`)
            res(new ResponseHack(new window.Blob([bytes]), {
                status,
                statusText,
                headers,
                url,
            }))
        }
        const onFailure = (error) => {
            logger.error('res error')
            logger.error(error)
            rej(error)
        }
        logger.debug(`${config.method} ${url}`)
        if (utils.isTv()) {
            webOS.service.request(serviceURL, {
                method: 'forwardRequest',
                parameters: { url, ...config },
                onSuccess,
                onFailure
            })
        } else {
            window.fetchBak('http://localhost:8052/webos2', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, ...config }),
            }).then(res2 => res2.json()).then(onSuccess).catch(onFailure)
        }
    })
}

/**
 * Function to bypass cors issues
 * @param {String} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
const replaceFetch = async (url, options = {}) => {
    if (url instanceof Request) {
        if (url.headers.get('is-front-hls') === 'true') {
            url.headers.delete('is-front-hls')
            const { method, body, headers } = url
            return customFetch(url.url, {
                method: method || 'get',
                body,
                headers
            })
        }
    }
    return window.fetchBak(url, options)
}

if (!window.fetchBak) {
    window.fetchBak = window.fetch
    window.fetch = replaceFetch
}


const useCustomFetch = () => customFetch

export default useCustomFetch
