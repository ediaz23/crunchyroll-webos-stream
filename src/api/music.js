
import { api } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError, getContentParam } from './utils'


/**
 * Get feed
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @return {Promise<{data: {total: Number, data: Array}, type:'legacy'|'new'}>}
 */
export const getFeed = async (profile) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('musicFeed')
        } else {
            const account = await getContentParam(profile)
            out = await api.music.getFeed({ account })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Array<String>} artistIds
 * @return {Promise<{total: Number, data: Array}>}
 */
export const getArtists = async (profile, artistIds) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('artist', artistIds)
        } else {
            const account = await getContentParam(profile)
            out = await api.music.getArtist({ account, artistIds })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Array<String>} concertIds
 * @return {Promise<{total: Number, data: Array}>}
 */
export const getConcerts = async (profile, concertIds) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('concerts', concertIds)
        } else {
            const account = await getContentParam(profile)
            out = await api.music.getConcerts({ account, concertIds })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Array<String>} musicIds
 * @return {Promise<{total: Number, data: Array}>}
 */
export const getVideos = async (profile, musicIds) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('musicVideo', musicIds)
        } else {
            const account = await getContentParam(profile)
            out = await api.music.getVideo({ account, musicIds })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}


/**
 * Get streams for a season
 * @param {import('crunchyroll-js-api').Types.Profile} profile
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
            out = await api.music.getStreamsWithURL({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get streams for a season
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {String} params.contentId
 * @return {Promise}
 */
export const getStreams = async (profile, params) => {
    let out = null
    try {
        const account = await getContentParam(profile)
        out = await api.music.getStreams({ account, ...params })
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get featured
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {String} params.contentId
 * @returns {Promise<{data: Array<Object>, total: Number}>}
 */
export const getFeatured = async (profile, params) => {
    let out = null
    try {
        const account = await getContentParam(profile)
        out = await api.music.getFeatured({ account, ...params })
    } catch (error) {
        await translateError(error)
    }
    return out
}
