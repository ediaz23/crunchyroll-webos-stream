/* global Worker */

import 'webostvjs'
import { v4 as uuidv4 } from 'uuid'
import utils, { ResourcePool } from '../utils'
import logger from '../logger'
import { _LOCALHOST_SERVER_ } from '../const'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

export const worker = new Worker(new URL('../workers/cache.worker.js', import.meta.url), { type: 'module' })
export const serviceURL = 'luna://com.crunchyroll.stream.app.service/'
const pendingTasks = new Map()
// TODO: maybe decrease priority slots, maybe decide base on TV spec
const requestSlots = new ResourcePool([0, 1, 2, 3, 4, 5, 6, 7])  //  8 normal slot 2 priority
const requestSlotsPriority = new ResourcePool([8, 9])


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
            const maxSize = Math.max(MIN, Math.min(MAX, Math.floor(base)))
            logger.debug(`cache init memory ${maxSize}`)
            worker.postMessage({ type: 'init', maxSize })
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
 *
 * @typedef RequestSetup
 * @type {Object}
 * @property {String} slotId
 * @property {RequestInit} config
 * @property {Function} onSuccess
 * @property {Function} onFailure
 * @property {Function} [onProgress]
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
    const data = await prom
    logger.debug(`cache ${data ? 'hit' : 'miss'} ${url}`)
    return data
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
 * @param {Number} maxAge seconds
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
 * @param {RequestSetup} obj
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
 * @param {RequestSetup} obj
 * @param {Object} obj.parameters
 */
const _makeRequest = ({ config, parameters, onSuccess, onFailure, onProgress, slotId }) => {
    if (utils.isTv()) {
        const method = `forwardRequest${slotId}`
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
 * @param {RequestSetup} obj
 * @returns {Promise}
 */
const getSlot = async (obj, priority) => {
    const { onSuccess: superOnSuccess, onFailure: superOnFailure } = obj
    /** @type {ResourcePool} */
    const pool = priority ? requestSlotsPriority : requestSlots
    obj.slotId = await pool.acquire()
    logger.debug(`slot acquire ${obj.slotId} priority ${priority} free ${pool.freeSlots.size}`)
    obj.onSuccess = (data) => {
        logger.debug(`slot release ${obj.slotId} priority ${priority}`)
        pool.release(obj.slotId)
        if (superOnSuccess) {
            superOnSuccess(data)
        }
    }
    obj.onFailure = (data) => {
        logger.debug(`slot release ${obj.slotId} priority ${priority}`)
        pool.release(obj.slotId)
        if (superOnFailure) {
            superOnFailure(data)
        }
    }
}

/**
 * @param {RequestSetup} obj
 * @param {Boolean} cache
 * @returns {Promise}
 */
const getCacheEntry = async (obj, cache) => {
    const isGetMethod = !obj.config.method || obj.config.method === 'get'
    /** @type {Promise<import('../workers/cache.worker').ReqEntry>} */
    const cacheProm = isGetMethod && cache
        ? getCache(obj.config.url)
        : Promise.resolve(null)
    const entry = await cacheProm
    let response = null

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
            response = entry.response
        }
    }
    if (isGetMethod && cache) {
        const { onSuccess: superOnSuccess } = obj
        /** @param {ResponseProxy} data */
        const checkSaveCache = (data) => {
            if (data) {
                if (data.status === 200) {
                    saveCache(obj.config.url, data).catch(obj.onFailure)
                }
                if (entry && data.status === 304) {
                    data = entry.response
                }
            }
            superOnSuccess(data)
        }
        obj.onSuccess = checkSaveCache
    }

    return response
}

/**
 * @typedef MakeResquestConfig
 * @type {Object}
 * @property {Boolean} [sync] turn on sync mode
 * @property {Boolean} [cache] use cache
 *
 * Does request throught service or fetch
 * @param {RequestSetup} obj
 * @param {MakeResquestConfig} [fnConfig]
 */
export const makeRequest = (obj, fnConfig = {}) => {
    /** @type {MakeResquestConfig} */
    const { cache = true, sync = false, priority = false } = fnConfig
    obj.config.id = uuidv4()
    if (sync) {
        obj.parameters = { d: utils.encodeRequest(obj.config) }
        getSlot(obj, priority).then(() => _makeRequest(obj))
    } else {
        Promise.resolve().then(async () => {
            const response = await getCacheEntry(obj, cache)
            if (response) {
                obj.onSuccess(response)
            } else {
                if (obj.config.body instanceof FormData) {
                    obj.parameters = { d: utils.encodeRequest(obj.config) }
                } else {
                    obj.parameters = { d: await utils.encodeRequestAsync(obj.config) }
                }
                await getSlot(obj, priority)
                _makeRequest(obj)
            }
        })
    }
}

/**
 * @typedef FetchConfig
 * @type {Object}
 * @property {Boolean} [direct] turn on return response as raw content
 * @property {Boolean} [cache] use cache
 * @property {Boolean} [sync] turn on sync mode
 * @property {Boolean} [priority] user priority slots
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
    const { direct = false, cache = true, sync = false, priority = false } = fnConfig
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
    makeRequest({ config, onFailure, onSuccess }, { sync, cache, priority })
    return prom
}

const useCustomFetch = () => customFetch

export default useCustomFetch
