/* global self */

import './worker_polyfills.js'
import QuickLRU from 'quick-lru';

/**
 * @typedef ReqEntry
 * @type {Object}
 * @property {import('../hooks/customFetch').ResponseProxy} response
 * @property {Number} ts timespan
 * @property {Number} maxAge seconds, -1 = no max‑age
 * @property {Number} size butes
 * @property {String} [etag]
 * @property {String} [lastModified]
 */

/**
 * @type {{
    maxSize: Number,
    lru: import('quick-lru'),
    gcTimer: Number
}}
 */
const memoryCache = {
    maxSize: null,
    lru: null,
    gcTimer: null,
}


/**
 * @param {{maxSize: Number}}
 */
function init({ maxSize }) {
    memoryCache.maxSize = maxSize
    if (memoryCache.lru) {
        memoryCache.lru.clear()
    }
    memoryCache.lru = new QuickLRU({ maxSize, size: v => v.size, })
    if (memoryCache.gcTimer) {
        clearInterval(memoryCache.gcTimer)
    }
    memoryCache.gcTimer = setInterval(() => {
        for (const [key, entry] of memoryCache.lru) {
            if (expired(entry)) {
                memoryCache.lru.delete(key)
            }
        }
    }, 60 * 1)
}

/**
 * @param {import('../hooks/customFetch').ResponseProxy} obj
 * @return {Number}
 */
function parseMaxAge({ headers }) {
    const cc = headers['cache-control'] || headers['Cache-Control'] || ''
    const m = cc.match(/max-age=(\d+)/i)
    return m ? parseInt(m[1], 10) : 4 * 60  // 4 mins
}

/**
 * @param {import('../hooks/customFetch').ResponseProxy} obj
 * @param {String} name
 * @return {String}
 */
function extractHeader({ headers }, name) {
    const lower = name.toLowerCase()
    return headers[lower] || headers[name]
}

/**
 * @param {ReqEntry} entry
 * @return {Boolean}
 */
function expired(entry) {
    let out = false
    if (entry.maxAge >= 0) {
        out = (Date.now() - entry.ts) > entry.maxAge * 1000
    }
    return out
}

/**
 * @param {Object} obj
 * @param {String} obj.url
 * @param {String} taskId
 */
function handleGet({ url: key, taskId }) {
    let out = { taskId, response: false }
    if (memoryCache.lru) {
        const entry = memoryCache.lru.get(key)
        if (entry && !expired(entry)) {
            out = { taskId, ...entry }
        } else {
            if (entry) {
                Promise.resolve().then(() => memoryCache.lru.delete(key))
            }
        }
    }
    return out
}

/**
 * @param {Object} obj
 * @param {String} obj.url
 * @param {import('../hooks/customFetch').ResponseProxy} obj.response
 */
function handleSave({ url: key, response }) {
    const maxAge = parseMaxAge(response)
    const size = response.content?.byteLength || response.content?.length || 0;
    if (memoryCache.lru && size < memoryCache.maxSize) {
        const etag = extractHeader(response, 'ETag')
        const lastModified = extractHeader(response, 'Last-Modified')
        /** @type {ReqEntry} */
        const entry = {
            response,
            ts: Date.now(),
            maxAge,
            size,
            etag,
            lastModified,
        }
        memoryCache.lru.set(key, entry)
    }
}

self.onmessage = ({ data }) => {
    const { type } = data
    if (type === 'init') {
        init(data)
    } else if (type === 'get') {
        self.postMessage(handleGet(data))
    } else if (type === 'save') {
        handleSave(data)
    } else if (type === 'close') {
        clearInterval(memoryCache.gcTimer)
    } else if (type === 'clear') {
        memoryCache.lru.clear()
    }
}
