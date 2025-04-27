
import 'webostvjs'
import { v4 as uuidv4 } from 'uuid'
import { gzipSync, gunzipSync } from 'fflate/esm/browser.js'
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
 * @param {Object} obj
 * @param {String} obj.content
 * @param {Boolean} obj.compress
 * @return {Uint8Array}
 */
export const decodeResponse = ({ content, compress }) => {
    let out
    if (compress) {
        out = gunzipSync(utils.base64toArray(content))
    } else {
        out = utils.base64toArray(content)
    }
    return out
}

/**
 * @param {Object} data
 * @return {String}
 */
export const encodeRequest = (data) => {
    return utils.arrayToBase64(gzipSync(utils.stringToUint8Array(JSON.stringify(data))))
}

/**
 * fake progress event
 * @param {Function} [onProgress]
 * @returns {Function}
 */
export const makeFetchProgressXHR = (onProgress) => {
    /**
     * @param {string} url
     * @param {object} options
     * @returns {Promise}
     */
<<<<<<< HEAD
    return (url, options) => {
        return new Promise((resolve, reject) => {
            const xhr = new window.XMLHttpRequest();
            xhr.open(options.method || 'GET', url, true);
=======
    return async (res) => {
        let out = null
        if (onProgress) {
            const reader = res.body.getReader()
            const total = parseInt(res.headers.get('content-length'))
>>>>>>> refs/heads/master

            if (options.headers) {
                Object.entries(options.headers).forEach(([key, value]) => {
                    xhr.setRequestHeader(key, value);
                });
            }

            xhr.responseType = 'arraybuffer';

            let total = 0;
            let loaded = 0;

            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    total = event.total;
                    loaded = event.loaded;
                    onProgress({ loaded, total })
                }
<<<<<<< HEAD
            };

            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const arrayBuffer = xhr.response;
                    const resTmp = new window.Response(new window.Blob([arrayBuffer]))
                    const { status, statusText, content, headers, resUrl, compress } = await resTmp.json()
                    const buffContent = decodeResponse({ content, compress })
                    resolve({ status, statusText, content: buffContent.buffer, headers, resUrl });
                } else {
                    reject(new Error(`Error: ${xhr.statusText}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(options.body ? options.body : null);
        });
    };
};
=======
            }
            const resTmp = new window.Response(new window.Blob(chunks))
            const { status, statusText, content, headers, resUrl, compress } = await resTmp.json()
            const buffContent = decodeResponse({ content, compress })
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
>>>>>>> refs/heads/master

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
                const { loaded, total, status, content, compress } = res
                if (200 <= status && status < 300) {
                    chunks.push(decodeResponse({ content, compress }))
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
 * @param {Function} obj.onSuccess
 * @param {Function} obj.onFailure
 * @param {Function} [obj.onProgress]
 */
export const makeRequest = ({ config, onSuccess, onFailure, onProgress }) => {
    config.id = uuidv4()
    const parameters = { d: encodeRequest(config) }
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
        const fetchOptions = {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(parameters),
        }
        if (onProgress) {
            const fetchProgressXHR = makeFetchProgressXHR(onProgress);

            fetchProgressXHR(`${_LOCALHOST_SERVER_}/webos2`, fetchOptions)
                .then(onSuccess).catch(onFailure);
        } else {
            window.fetch(`${_LOCALHOST_SERVER_}/webos2`, fetchOptions)
                .then(res => res.json()).then(onSuccess).catch(onFailure)
        }
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
            const { status, statusText, content, headers, resUrl, compress } = data
            logger.debug(`req ${config.method || 'get'} ${config.url} ${status}`)
            const decodedContent = content ? decodeResponse({ content, compress }) : undefined
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
    })
}

const useCustomFetch = () => customFetch

export default useCustomFetch
