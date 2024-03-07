
import 'webostvjs'

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

/**
 * Rreturn if is a tv device
 * @returns {Boolean}
 */
export const isTv = () => window.PalmServiceBridge || window.PalmServiceBridge

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
 * @param {Uint8Array|ArrayBuffer} body
 * @returns {String}
 */
export const arrayToBase64 = (body) => {
    const uint8Array = body instanceof Uint8Array ? body : new Uint8Array(body)
    const uint8ArrayToString = [...uint8Array].map(byte => String.fromCharCode(byte)).join('')
    return btoa(uint8ArrayToString)
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


export default {
    isTv,
    stringifySorted,
    formatDurationMs,
    getDuration,
    supportDRM,
    loadData,
    loadLibData,
    arrayToBase64,
    base64toArray,
}
