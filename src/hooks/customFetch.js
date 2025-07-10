/* global Worker */

import 'webostvjs'
import { v4 as uuidv4 } from 'uuid'
import utils from '../utils'
import logger from '../logger'
import { _LOCALHOST_SERVER_ } from '../const'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

export const worker = new Worker(new URL('../workers/cache.worker.js', import.meta.url), { type: 'module' })
export const serviceURL = 'luna://com.crunchyroll.stream.app.service/'
const pendingTasks = new Map()
const CONCURRENT_REQ_LIMIT = 10
let currentReqIndex = CONCURRENT_REQ_LIMIT


function setAdaptiveCacheSize() {
    const baseSize = 15 * 1024 * 1024  // 15MB
    if (utils.isTv()) {
        webOS.deviceInfo(deviceInfo => {
            const ramInGB = utils.parseRamSizeInGB(deviceInfo.ddrSize || '1G')
            const is4K = deviceInfo.screenWidth >= 3840 && deviceInfo.screenHeight >= 2160
            const hasHDR = !!(deviceInfo.hdr10 || deviceInfo.dolbyVision)

            let base = Math.floor(ramInGB * baseSize)  // 15MB per GB of RAM

            if (is4K) base *= 0.9  // reduce if 45
            if (hasHDR) base *= 0.9  // reduce HDR

            const MIN = 5 * 1024 * 1024  // 5 MB
            const MAX = 50 * 1024 * 1024  // 50 MB
            worker.postMessage({ type: 'init', maxSize: Math.max(MIN, Math.min(MAX, Math.floor(base))) })
        })
    } else {
        worker.postMessage({ type: 'init', maxSize: baseSize })
    }
    worker.active = true
}

if (!worker.active) { setAdaptiveCacheSize() }

/**
 * @typedef ResponseProxy
 * @type {Object}
 * @property {Number} status
 * @property {String} statusText
 * @property {String|Uint8Array} [content]  base64
 * @property {Object.<string, string>} headers
 * @property {String} resUrl
 * @property {Boolean} compress
 * @property {Number} [load]
 * @property {Number} [total]
 */

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

worker.addEventListener('message', ({ data }) => {
    /** @type {{taskId: String, response: ResponseProxy}} */
    const { taskId } = data
    if (taskId && pendingTasks.has(taskId)) {
        const resolve = pendingTasks.get(taskId)
        pendingTasks.delete(taskId)
        resolve(data.response ? data : null)
    }
})

/**
 * @param {String} url
 * @return {Promise<import('../workers/cache.worker').ReqEntry>}
 */
export async function getCache(url) {
    const taskId = uuidv4()
    const prom = new Promise((resolve) => {
        pendingTasks.set(taskId, resolve)
    })
    worker.postMessage({ type: 'get', url, taskId })
    return prom
}

/**
 * @param {String} url
 * @param {ResponseProxy} response
 */
export async function saveCache(url, response) {
    worker.postMessage({ type: 'save', url, response })
}

export function clearCache() {
    worker.postMessage({ type: 'clear' })
}

/**
 * @param {String} url
 * @return {Promise<Object>}
 */
export async function getCustomCache(url) {
    const item = await getCache(url)
    let out = null
    if (item) {
        out = JSON.parse(item.response.content)
    }
    return out
}

/**
 * Save cache custom cache
 * @param {String} url
 * @param {Object} data
 * @param {Number} maxAge
 * @return {Promise}
 */
export async function saveCustomCache(url, data, maxAge = 60) {
    /** @type {import('../workers/cache.worker').ResponseProxy} */
    const response = {
        status: 200,
        statusText: 'OK',
        content: typeof data === 'string' ? data : JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${maxAge}`
        },
        resUrl: url,
        compress: false
    }
    worker.postMessage({ type: 'save', url, response })
}


/**
 * @typedef SetUpRequestConfig
 * @type {Object}
 * @property {Boolean} [sync] turn on sync mode
 *
 * set up request to be done
 * @param {String | Request} url
 * @param {RequestInit} [options]
 * @param {SetUpRequestConfig} fnConfig
 * @return {RequestInit | Promise<RequestInit>}
 */
export const setUpRequest = (url, options = {}, fnConfig = {}) => {
    const { sync = true } = fnConfig
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
     * @returns {Promise<ResponseProxy>}
     */
    return async (res) => {
        /** @type {ResponseProxy} */
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
            /** @type {ResponseProxy} */
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
                /** @type {ResponseProxy} */
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
 * @typedef MakeResquestConfig
 * @type {Object}
 * @property {Boolean} [sync] turn on sync mode
 * @property {Boolean} [cache] use cache
 *
 * Does request throught service or fetch
 * @param {Object} obj
 * @param {RequestInit} obj.config
 * @param {Function} obj.onSuccess
 * @param {Function} obj.onFailure
 * @param {Function} [obj.onProgress]
 * @param {MakeResquestConfig} [fnConfig]
 */
export const makeRequest = (obj, fnConfig = {}) => {
    /** @type {MakeResquestConfig} */
    const { sync = false, cache = true } = fnConfig
    obj.config.id = uuidv4()
    if (sync) {
        obj.parameters = { d: utils.encodeRequest(obj.config) }
        _makeRequest(obj)
    } else {
        const isGetMethod = !obj.config.method || obj.config.method === 'get'
        /** @type {Promise<import('../workers/cache.worker').ReqEntry>} */
        const cacheProm = isGetMethod && cache
            ? getCache(obj.config.url)
            : Promise.resolve(null)
        cacheProm.then(async entry => {
            if (entry) {
                if (entry.etag || entry.lastModified) {
                    obj.config.headers = obj.config.headers || {}
                    if (entry.etag) {
                        obj.config.headers['If-None-Match'] = entry.etag
                    }
                    if (entry.lastModified) {
                        obj.config.headers['If-Modified-Since'] = entry.lastModified
                    }
                } else {
                    return obj.onSuccess(entry.response)
                }
            }
            const superOnSuccess = obj.onSuccess
            /** @param {ResponseProxy} data */
            const checkSaveCache = (data) => {
                if (data) {
                    if (isGetMethod && data.status === 200) {
                        saveCache(obj.config.url, data).catch(obj.onFailure)
                    }
                    if (entry && data.status === 304) {
                        data = entry.response
                    }
                }
                superOnSuccess(data)
            }
            obj.onSuccess = checkSaveCache
            if (obj.config.body instanceof FormData) {
                obj.parameters = { d: utils.encodeRequest(obj.config) }
            } else {
                obj.parameters = { d: await utils.encodeRequestAsync(obj.config) }
            }
            _makeRequest(obj)
        })
    }
}

/**
 * @typedef FetchConfig
 * @type {Object}
 * @property {Boolean} [direct] turn on return response as raw content
 * @property {Boolean} [cache] use cache
 *
 * Function to bypass cors issues
 * @param {String} url
 * @param {RequestInit} [options]
 * @param {FetchConfig} [fnConfig]
 * @returns {Promise<Response>}
 */
export const customFetch = async (url, options = {}, fnConfig = {}) => {
    let res, rej
    /** @type {FetchConfig} */
    const { direct = false, cache = true, sync = false } = fnConfig
    const prom = new Promise((resolve, reject) => { res = resolve; rej = reject })
    const configProm = setUpRequest(url, options, { sync })
    const config = sync ? configProm : await configProm
    /**
     * @param {ResponseProxy} data
     */
    const onSuccess = async (data) => {
        config.resStatus = 'done'
        /** @type {ResponseProxy} */
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
    makeRequest({ config, onFailure, onSuccess }, { sync, cache })
    return prom
}

const useCustomFetch = () => customFetch

export default useCustomFetch
