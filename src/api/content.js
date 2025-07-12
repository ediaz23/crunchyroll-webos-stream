
import { api } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError, getContentParam } from './utils'

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {Array<String>} params.contentIds
 * @param {import('crunchyroll-js-api').Types.FetchConfig} params.fnConfig
 * @return {Promise<{data: Array<Object>}>}
 */
export const getPlayHeads = async (profile, params) => {
    let out = null
    try {
        params = params || {}
        if (LOAD_MOCK_DATA && !('noMock' in (params || {}))) {
            out = await getMockData('play-heads', params, [getPlayHeads, profile])
        } else {
            const account = await getContentParam(profile)
            out = await api.content.getPlayheads({ account, ...params })
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
 * @param {Number} params.playhead
 * @return {Promise}
 */
export const savePlayhead = async (profile, params) => {
    let out = null
    try {
        const account = await getContentParam(profile)
        out = await api.content.savePlayhead({ account, ...params })
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
 * @return {Promise}
 */
export const addWatchlistItem = async (profile, params) => {
    try {
        const account = await getContentParam(profile)
        await api.content.addWatchlistItem({ account, ...params })
    } catch (error) {
        await translateError(error)
    }
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} params
 * @param {Array<String>} params.contentIds
 * @return {Promise<{total: Number, data: Array<Object>}>}
 */
export const getWatchlistItems = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA && !('noMock' in (params || {}))) {
            out = await getMockData('watchlist-items', params, [getWatchlistItems, profile])
        } else {
            const account = await getContentParam(profile)
            out = await api.content.getWatchlistItems({ account, ...params })
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
 * @return {Promise}
 */
export const deleteWatchlistItem = async (profile, params) => {
    try {
        const account = await getContentParam(profile)
        await api.content.deleteWatchlistItem({ account, ...params })
    } catch (error) {
        await translateError(error)
    }
}

