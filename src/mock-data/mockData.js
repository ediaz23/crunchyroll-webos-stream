
import { _LOCALHOST_SERVER_ } from '../const'
import logger from '../logger'
import { stringifySorted } from '../utils'

/**
 * Set mock data in data object
 * The key is comment this function to build in production
 * @callback SetMockData
 * @param {Object} data
 * @param {String} name
 * @param {Object} param
 * @param {[Function, Array]} [originalFn]
 *
 * @type {SetMockData}
 */
let setData = async () => { }
if (process.env.REACT_APP_SERVING === 'true') {
    setData = async (data, name, param, originalFn) => {
        try {
            data[name] = { ...await import(`./data/${name}`) }
        } catch (e) {
            if (originalFn) {
                if (param != null) {
                    try {
                        if (typeof param === 'string' || param instanceof String) {
                            throw new Error('string no soported')
                        }
                        param = Array.isArray(param) ? [...param] : {...param}
                        param['noMock'] = true
                        data[name] = await originalFn[0](originalFn[1], param)
                        data[name] = data[name] || {}
                        fetch(`${_LOCALHOST_SERVER_}/save-mock-data`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ name, data: data[name] })
                        })
                        return;
                    } catch (_e2) {
                        console.error(name)
                    }
                }
            }
            throw e
        }
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
    return `${name}${suff}.json`.replace(/\//g, '-')
}

/**
 * Return mock data for name
 * @param {String} name
 * @param {Array<String>} [objectIds]
 * @param {[Function, Array]} [originalFn]
 * @returns {Promise<Object>}
 */
export async function getMockData(name, objectIds, originalFn) {
    const data = {}
    const filename = getMockFilename(name, objectIds)
    logger.debug(`mock ${filename}`)
    await setData(data, filename, objectIds, originalFn)
    return data[filename]
}

export default {}
