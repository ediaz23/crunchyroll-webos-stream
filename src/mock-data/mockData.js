

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
 * Return mock data for name
 * @param {String} name
 * @returns {Promise<Object>}
 */
async function getMockData(name) {
    const data = {}
    await setData(data, name)
    return data[name]
}

export default getMockData
