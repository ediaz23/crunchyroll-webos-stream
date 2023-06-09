

/**
 * Set mock data in data object
 * The key is comment this function to build in production
 * @param {String} name
 */
async function setData(data, name) {
    data[name] = true  // hack to avoid unused warning
    data[name] = await import(`./${name}`)
}

/**
 * Returno filename to mockdata
 * @param {String} name
 * @param {Array<String>} [objectIds]
 * @returns {String}
 */
function getMockFilename(name, objectIds) {
    let suff = ''
    if (objectIds) {
        if (!Array.isArray(objectIds)) {
            objectIds = objectIds.split('-')
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
