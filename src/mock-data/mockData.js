
import { stringifySorted } from '../utils'

/**
 * Set mock data in data object
 * The key is comment this function to build in production
 * @param {String} name
 */
async function setData(data, name) {
    data[name] = await import(`./${name}`)
}

/**
 * Convert a object to string
 * @param {Object} obj
 * @returns {String}
 */
function objectToStringForFileName(obj) {
    for (const vals of Object.values(obj)) {
        if (Array.isArray(vals)) {
            vals.sort()
        }
    }
    return stringifySorted(obj)
        .replace(/[{}"[\]]/g, '')
        .replace(/:/g, '-')
        .replace(/,/g, '_');
}

/**
 * Returno filename to mockdata
 * @param {String} name
 * @param {Array<String>} [objectIds]
 * @returns {String}
 */
export function getMockFilename(name, objectIds) {
    let suff = ''
    if (objectIds) {
        if (objectIds instanceof String || typeof objectIds === 'string') {
            objectIds = objectIds.split('-')
        } else if (Array.isArray(objectIds)) {
            // nothing
        } else {
            objectIds = [objectToStringForFileName(objectIds)]
        }
        suff = '-' + [...objectIds].sort().join('-').substring(0, 200)
    }
    return `${name}${suff}.json`
}

/**
 * Return mock data for name
 * @param {String} name
 * @param {Array<String>} [objectIds]
 * @returns {Promise<Object>}
 */
export async function getMockData(name, objectIds) {
    const data = {}
    const filename = getMockFilename(name, objectIds)
    await setData(data, filename)
    return data[filename]
}

export default {}
