
import { api } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError, getContentParam } from './utils'

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {Array<String>} params.objectIds
 * @param {Boolean} [params.ratings]
 * @return {Promise}
 */
export const getObjects = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('objects', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.cms.getObjects({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.serieId
 * @return {Promise<{total: Number, data: Array<Object>, meta: Object}>}
 */
export const getSeasons = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('seasons', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.cms.getSeasons({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.serieId
 * @return {Promise}
 */
export const getSerie = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('serie', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.cms.getSeries({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get episodes for a season
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.seasonId
 * @return {Promise<{total: Number, data: Array<Object>, meta: Object}>}
 */
export const getEpisodes = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('episodes', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.cms.getEpisodes({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get movies for a movie_listing
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.movieListingId
 * @returns {Promise<{total: Number, data: Array<Object>, meta: Object}>}
 */
export const getMovies = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('movies', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.cms.getMovies({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get episodes for a season
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.streamUrl
 * @return {Promise}
 */
export const getStreamsWithURL = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('streams-url', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.cms.getStreamsWithURL({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get episodes for a season
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.contentId
 * @return {Promise}
 */
export const getStreams = async (profile, params) => {
    let out = null
    try {
        const account = await getContentParam(profile)
        out = await api.cms.getStreams({ account, ...params })
    } catch (error) {
        await translateError(error)
    }
    return out
}
