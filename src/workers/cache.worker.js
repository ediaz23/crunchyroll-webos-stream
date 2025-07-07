/* global self */

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

const MAX_MEMORY = 6 * 1024 * 1024;  // 6MB
/** @type {import('quick-lru').default<String, ReqEntry>} */
const lru = new QuickLRU({ maxSize: MAX_MEMORY, size: v => v.size, })

const gcTimer = setInterval(() => {
    for (const [key, entry] of lru) {
        if (expired(entry)) {
            lru.delete(key)
        }
    }
}, 60 * 1)

/**
 * @param {import('../hooks/customFetch').ResponseProxy} obj
 * @return {Number}
 */
function parseMaxAge({ headers }) {
    const cc = headers['cache-control'] || headers['Cache-Control'] || ''
    const m = cc.match(/max-age=(\d+)/i)
    return m ? parseInt(m[1], 10) : 60 * 30  // 30 mins
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
    const entry = lru.get(key)
    if (entry && !expired(entry)) {
        out = { taskId, ...entry }
    } else {
        if (entry) {
            Promise.resolve().then(() => lru.delete(key))
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
    if (size < MAX_MEMORY) {
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
        lru.set(key, entry)
    }
}

self.onmessage = (e) => {
    const { type } = e.data
    if (type === 'get') {
        self.postMessage(handleGet(e.data))
    } else if (type === 'save') {
        handleSave(e.data)
    } else if (type === 'close') {
        clearInterval(gcTimer)
    }
}
