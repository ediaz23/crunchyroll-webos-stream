/* global Worker */

import 'webostvjs'
import utilsImpl from './utils.impl'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window
const worker = new Worker(new URL('./workers/util.worker.js', import.meta.url), { type: 'module' })
let taskCounter = 0
const taskMap = new Map()


worker.onmessage = ({ data }) => {
    const { taskId, result, error, success } = data
    const { res, rej, stack } = taskMap.get(taskId) || {}
    taskMap.delete(taskId)

    if (success) {
        res(result)
    } else {
        console.error(data)
        console.error(stack)
        rej(new Error(error))
    }
}

/**
 * Rreturn if is a tv device
 * @returns {Boolean}
 */
export const isTv = () => !!window.PalmServiceBridge


/**
 * @param {String} type
 * @param {Array} args
 * @return {Promise}
 */
const callWorker = (type, ...args) => {
    return new Promise((res, rej) => {
        const taskId = `task-${++taskCounter}`
        taskMap.set(taskId, { res, rej, stack: new Error().stack })

        worker.postMessage({ type, taskId, payload: args })
    })
}

/**
 * @param {Uint8Array|ArrayBuffer} body
 * @returns {Promise<String>}
 */
export const arrayToBase64Async = body => callWorker('arrayToBase64', body)
export const arrayToBase64 = utilsImpl.arrayToBase64

/**
 * @param {String} content
 * @returns {Promise<Uint8Array>}
 */
export const base64toArrayAsync = content => callWorker('base64toArray', content)
export const base64toArray = utilsImpl.base64toArray

/**
 * @param {String} content
 * @returns {Promise<Uint8Array>}
 */
export const stringToUint8ArrayAsync = content => callWorker('stringToUint8Array', content)
export const stringToUint8Array = utilsImpl.stringToUint8Array

/**
 * @param {Uint8Array} content
 * @returns {Promise<String>}
 */
export const uint8ArrayToStringAsync = content => callWorker('uint8ArrayToString', content)
export const uint8ArrayToString = utilsImpl.uint8ArrayToString

/**
 * @param {Object} obj
 * @param {String} obj.content
 * @param {Boolean} obj.compress
 * @return {Promise<Uint8Array>}
 */
export const decodeResponseAsync = ({ content, compress }) => callWorker('decodeResponse', { content, compress })
export const decodeResponse = utilsImpl.decodeResponse

/**
 * @param {Object} content
 * @return {Promise<String>}
 */
export const encodeRequestAsync = content => callWorker('encodeRequest', content)
export const encodeRequest = utilsImpl.encodeRequest

/**
 * Convert object to json but sort keys before
 * @param {Object} obj
 * @return {String}
 */
export const stringifySorted = (obj) => {
    const orderedObj = {}
    Object.keys(obj).sort().forEach(key => {
        orderedObj[key] = obj[key]
    })
    return JSON.stringify(orderedObj)
}

/**
 * Format milliseconds
 * @param {Number} milliseconds
 * @returns {String}
 */
export const formatDurationMs = (milliseconds) => {
    if (!milliseconds) return ''
    // Calculate the time components
    const seconds = Math.floor((milliseconds / 1000) % 60)
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60)
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))

    // Format the result as a string
    let formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    if (hours > 0) {
        formattedTime = `${hours.toString().padStart(2, '0')}:${formattedTime}`
    }

    return formattedTime
}

/**
 * Search durationMs in content
 * @param {Object} content
 * @returns {Number}
 */
export const getDuration = (content) => {
    let duration = undefined

    if (content.type === 'episode') {
        if (content.episode_metadata) {
            duration = content.episode_metadata.duration_ms || content.duration_ms
        } else {
            duration = content.duration_ms
        }
    } else if (['musicConcert', 'musicVideo', 'movie'].includes(content.type)) {
        duration = content.durationMs
    }
    return duration
}

/**
 * Test drm system support
 * @return {Promise}
 */
export const supportDRM = async () => {
    const config = [{
        initDataTypes: ['cenc'],
        audioCapabilities: [{
            contentType: 'audio/mp4;codecs="mp4a.40.2"'
        }],
        videoCapabilities: [{
            contentType: 'video/mp4;codecs="avc1.42E01E"'
        }]
    }]
    for await (const key of ['com.microsoft.playready', 'com.widevine.alpha', 'com.apple.fps']) {
        try {
            await window.navigator.requestMediaKeySystemAccess(key, config)
            console.log(key, 'supported')
        } catch (e) {
            console.log(key, 'not supported')
            console.log(e)
        }
    }
}

/**
 * Load data from local folder
 * @param {String} file
 * @param {Boolean} ab
 * @return {Promise<Object>}
 */
export const loadData = async (file, ab = false) => {
    return new Promise((res, rej) => {
        const path = webOS.fetchAppRootPath()
        const xhr = new window.XMLHttpRequest()
        if (file.startsWith('file://')) {
            xhr.open('GET', file, true)
        } else {
            xhr.open('GET', `${path}${file}`, true)
        }
        xhr.responseType = ab ? 'arraybuffer' : 'text'
        xhr.onload = () => {
            if (xhr.status === 0 || xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 0) {
                    res(ab ? xhr.response : JSON.parse(xhr.responseText))
                } else {
                    rej(xhr)
                }
            } else {
                rej(xhr)
            }
        }
        xhr.onerror = rej
        xhr.send()
    })
}

/**
 * Load data from node_module
 * @param {String} file
 * @param {Boolean} ab
 * @return {Promise<Object>}
 */
export const loadLibData = async (file, ab = false) => {
    return loadData(`node_modules/${file}`, ab)
}

/**
 * Load data from translation lib
 * @param {Promise<Object>} prom
 * @param {Function} fn
 * @returns {Object}
 */
export const loadBrowserTranslate = async (prom, fn) => {
    let out = {}
    try {
        out = await prom
    } catch (e) {
        console.error(e)
        try {
            if (fn) {
                loadBrowserTranslate(fn())
            }
        } catch (e1) {
            console.error(e1)
        }
    }
    return out
}

/**
 * Load data from translation lib
 * @param {String} lib
 * @param {String} lib
 * @returns {Object}
 */
export const loadTvTranslate = async (lib, lang) => {
    let out = {}
    try {
        out = await loadLibData(`${lib}/langs/${lang}.json`)
    } catch (e) {
        console.error(e)
        try {
            if (lang !== 'en') {
                out = await loadTvTranslate(lib, 'en')
            }
        } catch (e2) {
            console.error(e2)
        }
    }
    return out
}


/**
 * @param {Object} item
 * @returns {Boolean}
 */
export const getIsPremium = (item) => {
    return (item.episode_metadata || item.movie_metadata || {
        is_premium_only: item.isPremiumOnly || item.is_premium_only
    }).is_premium_only
}

/**
 * @param {String} ddrSizeString
 * @return {Number}
 */
export const parseRamSizeInGB = (ddrSizeString) => {
    const match = ddrSizeString.match(/([\d.]+)G/i);
    return match ? parseFloat(match[1]) : 0;
}


/**
 * @param {Object} obj
 * @param {Number} space
 * @returns {String}
 */
export function customStringify(obj, space = 2) {
    const seen = new WeakSet();

    function helper(value, level) {
        if (value === null) {
            return 'null';
        }

        if (typeof value === 'undefined') {
            return 'undefined';
        }

        if (typeof value === 'function') {
            return value.toString();
        }

        if (typeof value !== 'object') {
            return JSON.stringify(value);
        }

        if (seen.has(value)) {
            return '"[Circular]"';
        }
        seen.add(value);

        const indent = ' '.repeat(level * space);
        const indentInner = ' '.repeat((level + 1) * space);

        if (Array.isArray(value)) {
            const arrayItems = value.map(item => `${indentInner}${helper(item, level + 1)}`).join(',\n');
            return `[\n${arrayItems}\n${indent}]`;
        }

        const objectItems = Object.entries(value).map(([key, val]) => {
            return `${indentInner}"${key}": ${helper(val, level + 1)}`;
        }).join(',\n');

        return `{\n${objectItems}\n${indent}}`;
    }

    return helper(obj, 0);
}

export function isPlayable(type) {
    return ['episode', 'movie', 'musicConcert', 'musicVideo'].includes(type)
}

export function getIsBeginningSeason() {
    const date = new Date()
    const year = date.getFullYear()
    const seasonChanges = [
        new Date(year, 2, 21),   // March (month index 2)
        new Date(year, 5, 21),   // June  (month index 5)
        new Date(year, 8, 21),   // September (month index 8)
        new Date(year, 11, 21),  // December (month index 11)
    ];

    const threeWeeksInMs = 30 * 24 * 60 * 60 * 1000; // Three weeks in milliseconds
    // Check if today's date is within 3 weeks after any of the season change dates
    return seasonChanges.some(changeDate => {
        const start = changeDate.getTime()
        const end = start + threeWeeksInMs
        const today = date.getTime()
        return start <= today && today < end
    })
}

export class ResourcePool {
    constructor(slotIds) {
        this.freeSlots = new Set(slotIds)
        this.queue = []
    }

    async acquire() {
        if (this.freeSlots.size > 0) {
            const slot = this.freeSlots.values().next().value
            this.freeSlots.delete(slot)
            return slot
        }
        return new Promise(resolve => this.queue.push(resolve))
    }

    release(slotId) {
        if (this.queue.length > 0) {
            const next = this.queue.shift()
            next(slotId)
        } else {
            this.freeSlots.add(slotId)
        }
    }
}

export class OrderedSet {
    constructor() {
        this.map = new Map()
        this.list = []
    }

    add(item) {
        const count = this.map.get(item) || 0
        this.map.set(item, count + 1)
        this.list.push(item)
    }

    has(item) {
        return this.map.has(item)
    }

    remove(item) {
        if (!this.map.has(item)) return

        const count = this.map.get(item)
        if (count > 1) {
            this.map.set(item, count - 1)
        } else {
            this.map.delete(item)
        }

        const index = this.list.indexOf(item)
        if (index > -1) this.list.splice(index, 1)
    }

    indexOf(item) {
        return this.list.indexOf(item)
    }

    get lastElement() {
        return this.list.length ? this.list[this.list.length - 1] : null
    }

    getList() {
        return this.list
    }
}


export default {
    worker,
    isTv,
    stringifySorted,
    formatDurationMs,
    getDuration,
    getIsPremium,
    supportDRM,
    loadData,
    loadLibData,
    loadBrowserTranslate,
    loadTvTranslate,
    parseRamSizeInGB,
    customStringify,

    arrayToBase64,
    arrayToBase64Async,
    base64toArray,
    base64toArrayAsync,
    stringToUint8Array,
    stringToUint8ArrayAsync,
    uint8ArrayToString,
    uint8ArrayToStringAsync,
    decodeResponse,
    decodeResponseAsync,
    encodeRequest,
    encodeRequestAsync,
}
