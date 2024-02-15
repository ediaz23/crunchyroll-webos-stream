
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

export default {
    isTv,
    stringifySorted,
    formatDurationMs,
    getDuration,
    supportDRM
}
