
import logger from '../logger'
import { stringifySorted } from '../utils'

/**
 * Set mock data in data object
 * The key is comment this function to build in production
 * @param {Object} data
 * @param {String} name
 */
let setData = async () => { }
if (process.env.REACT_APP_SERVING === 'true') {
    setData = async (data, name) => {
        data[name] = { ...await import(`./data/${name}`) }
    }
}

/**
 * Convert a object to string
 * @param {Object} obj
 * @returns {String}
 */
function objectToStringForFileName(obj) {
    const newObj = { ...obj }
    for (const [key, vals] of Object.entries(newObj)) {
        if (Array.isArray(vals)) {
            newObj[key] = [...vals]
            newObj[key].sort()
        }
    }
    return stringifySorted(newObj)
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
    logger.debug(`mock ${filename}`)
    await setData(data, filename)
    return data[filename]
}

export default {}
