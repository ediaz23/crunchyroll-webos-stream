
import 'webostvjs'
import { gzipSync, gunzipSync } from 'fflate'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

/**
 * Rreturn if is a tv device
 * @returns {Boolean}
 */
export const isTv = () => !!window.PalmServiceBridge

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
 * @return {Promise<Object>}
 */
export const loadData = async (file) => {
    return new Promise((res, rej) => {
        const path = webOS.fetchAppRootPath()
        const xhr = new window.XMLHttpRequest()
        xhr.open('GET', `${path}${file}`, true)
        xhr.onload = () => {
            if (xhr.status === 0 || xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 0) {
                    res(JSON.parse(xhr.responseText))
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
 * @return {Promise<Object>}
 */
export const loadLibData = async (file) => {
    return loadData(`node_modules/${file}`)
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
 * @param {Uint8Array} uint8Array
 * @returns {String}
 */
export const uint8ArrayToString = (uint8Array) => {
    return [...uint8Array].map(byte => String.fromCharCode(byte)).join('')
}

/**
 * @param {String} content
 * @returns {Uint8Array}
 */
export const stringToUint8Array = (content) => {
    const buffer = new ArrayBuffer(content.length)
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < content.length; i++) {
        bytes[i] = content.charCodeAt(i) & 0xff
    }
    return bytes
}

/**
 * @param {Uint8Array|ArrayBuffer} body
 * @returns {String}
 */
export const arrayToBase64 = (body) => {
    const uint8Array = body instanceof Uint8Array ? body : new Uint8Array(body)
    const str = uint8ArrayToString(uint8Array)
    return btoa(str)
}

/**
 * @param {String} content
 * @returns {Uint8Array}
 */
export const base64toArray = (content) => {
    const binaryString = atob(content)
    const buffer = new ArrayBuffer(binaryString.length)
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i) & 0xff
    }
    return bytes
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

/**
 * @param {Object} obj
 * @param {String} obj.content
 * @param {Boolean} obj.compress
 * @return {Promise<Uint8Array>}
 */
const decodeResponse = async ({ content, compress }) => {
    let out
    if (compress) {
        out = gunzipSync(base64toArray(content))
    } else {
        out = base64toArray(content)
    }
    return out
}

/**
 * @param {Object} data
 * @return {Promise<String>}
 */
const encodeRequest = async (data) => {
    return arrayToBase64(gzipSync(stringToUint8Array(JSON.stringify(data))))
}

export default {
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
    arrayToBase64,
    base64toArray,
    uint8ArrayToString,
    stringToUint8Array,
    customStringify,
    decodeResponse,
    encodeRequest,
}
