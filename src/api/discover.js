
import { api } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError, getContentParam } from './utils'


/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {Number} [params.quantity] Number of records in a result
 * @param {Number} [params.start] Offset to request
 * @param {Array<String>} [params.category] Category
 * @param {String} [params.query] Search pattern
 * @param {String} [params.seasonTag] season tag
 * @param {String} [params.sort] sort results
 * @param {String} [params.type] type for search, example episode
 * @param {Boolean} [params.ratings]
 * @returns {Promise<{total: Number, data: Array<Object>, meta: Object}>}
 */
export const getBrowseAll = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA && !('noMock' in params)) {
            out = await getMockData('browse', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getBrowseAll({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {Number} [params.quantity] Number of records in a result
 * @param {Number} [params.start] Offset to request
 * @param {String} [params.query] Search pattern
 * @param {Array<String>} [params.type] type for search, example episode
 * @returns {Promise<{total: Number, data: Array<Object>, meta: Object}>}
 */
export const search = async (profile, params) => {
    let out = null
    try {
        if ('type' in params) {
            if (!Array.isArray(params.type)) {
                params.type = [params.type]
            }
        }
        if (LOAD_MOCK_DATA && !('noMock' in params)) {
            out = await getMockData('search', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.search({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}



/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {Number} [params.contentId]
 * @returns {Promise<{total: Number, data: Array<Object>, meta: Object}>}
 */
export const getCategories = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('categories', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getCategories({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {Number} [params.quantity]
 * @param {Boolean} [params.ratings]
 * @return {Promise}
 */
export const getHistory = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('discoverHistory', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getHistory({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get index data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<{data: {total: Number, data: Array}, type:'legacy'|'new'}>}
 */
export const getHomeFeed = async (profile) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('homefeed')
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getHomeFeed({ account })
        }
    } catch (error) {
        await translateError(error)
    }
    return { data: out, type: 'legacy' }
}

/**
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<{data: import('crunchyroll-js-api').Types.HomeItem, type:'legacy'|'new'}>}
 */
export const getNewHomeFeed = async (profile) => {
    /** @type {import('crunchyroll-js-api').Types.HomeItem} */
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('homefeedNew2')
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getHome({ account })
        }
    } catch (error) {
        await translateError(error)
    }
    return { data: out, type: 'new' }
}

/**
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {Number} params.collectionId
 * @param {Boolean} params.ratings
 * @param {Number} [params.vendor]
 * @return {Promise<{recommendations: Array}>}
 */
export const getPersonalRecomendation = async (profile, params) => {
    /** @type {import('crunchyroll-js-api').Types.HomeItem} */
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('personalRecomendation')
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getPersonalRecomendation({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}


/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {Number} [params.quantity]
 * @param {Number} [params.start]
 * @param {Boolean} [params.ratings]
 * @return {Promise}
 */
export const getRecomendation = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('discoverRecomendantion', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getRecommendations({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {String} params.contentId
 * @param {Number} [params.quantity]
 * @param {Number} [params.start]
 * @param {Boolean} [params.ratings]
 * @return {Promise<{total: Number, data: Array<Object>, meta: Object}>}
 */
export const getSimilar = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('similar', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getSimilar({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {String} params.contentId
 * @param {import('crunchyroll-js-api').Types.FetchConfig} [params.fnConfig]
 * @return {Promise<{total: Number, data: Array<Object>, meta: Object}>}
 */
export const getNext = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            const { contentId } = params
            out = await getMockData('upNext', { contentId })
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getNext({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    if (out) {
        out.data = out.data.map(val => {
            const { panel } = val
            const newVal = { ...panel, ...val }
            delete newVal.panel
            return newVal
        })
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {String} params.contentId
 * @param {import('crunchyroll-js-api').Types.FetchConfig} [params.fnConfig]
 * @return {Promise<{total: Number, data: Array<Object>, meta: Object}>}
 */
export const getPrev = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            const { contentId } = params
            out = await getMockData('prev', { contentId })
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getPrev({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    if (out) {
        out.data = out.data.map(val => {
            const { panel } = val
            const newVal = { ...panel, ...val }
            delete newVal.panel
            return newVal
        })
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {Number} [params.quantity]
 * @param {Number} [params.start]
 * @return {Promise<{total: Number, data: Array<Object>}>}
 */
export const getWatchlist = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('discoverWatchlist', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getWatchlist({ account, fnConfig: { cache: false }, ...params, order: 'desc' })
        }
    } catch (error) {
        await translateError(error)
    }
    if (out) {
        out.data = out.data.map(val => {
            const { panel } = val
            const newVal = { ...panel, ...val }
            delete newVal.panel
            return newVal
        })
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @returns {Promise<{data: Array<{id: String, localization: Object}>}>}
 */
export const getSeasonList = async (profile) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('seasons')
        } else {
            const account = await getContentParam(profile)
            out = await api.discover.getSeasonList({ account })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Mark as watched
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {String} contentId
 * @returns {Promise>}
 */
export const markAsWatched = async (profile, contentId) => {
    try {
        const account = await getContentParam(profile)
        await api.discover.markAsWatched({ account, contentId })
    } catch (error) {
        await translateError(error)
    }
}
