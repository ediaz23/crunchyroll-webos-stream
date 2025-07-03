/* global self */

/**
 * @param {String} content
 * @returns {Uint8Array}
 */
function stringToUint8Array(content) {
    const buffer = new ArrayBuffer(content.length)
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < content.length; i++) {
        bytes[i] = content.charCodeAt(i) & 0xff
    }
    return bytes
}

/**
 * @param {Uint8Array} uint8Array
 * @returns {String}
 */
function uint8ArrayToString(uint8Array) {
    return [...uint8Array].map(byte => String.fromCharCode(byte)).join('')
}

/**
 * @param {Uint8Array|ArrayBuffer} body
 * @returns {String}
 */
function arrayToBase64(body) {
    const uint8Array = body instanceof Uint8Array ? body : new Uint8Array(body)
    const str = uint8ArrayToString(uint8Array)
    return btoa(str)
}

/**
 * @param {String} content
 * @returns {Uint8Array}
 */
function base64toArray(content) {
    const binaryString = atob(content)
    const buffer = new ArrayBuffer(binaryString.length)
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i) & 0xff
    }
    return bytes
}

/**
 * @param {Object} obj
 * @param {String} obj.content
 * @param {Boolean} obj.compress
 * @return {Uint8Array}
 */
function decodeResponse({ content, compress }) {
    /** @type {{fflate:  import('fflate')}} */
    const { fflate } = self

    let out
    if (compress) {
        out = fflate.gunzipSync(base64toArray(content))
    } else {
        out = base64toArray(content)
    }
    return out
}

/**
 * @param {Object} data
 * @return {String}
 */
function encodeRequest(data) {
    /** @type {{fflate:  import('fflate')}} */
    const { fflate } = self

    return arrayToBase64(fflate.gzipSync(stringToUint8Array(JSON.stringify(data))))
}

const workObj = {
    arrayToBase64,
    base64toArray,
    stringToUint8Array,
    uint8ArrayToString,
    decodeResponse,
    encodeRequest,
}

if (typeof module !== 'undefined') {
    module.exports = workObj
} else {
    self.workObj = workObj
}
