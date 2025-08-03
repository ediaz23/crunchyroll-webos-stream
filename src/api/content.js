
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
 * @param {import('crunchyroll-js-api').Types.FetchConfig} params.fnConfig
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

/**
 * Caculate playhead progress
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Array<Object>} obj.episodesData
 */
export const calculatePlayheadProgress = async ({ profile, episodesData }) => {
    const epIds = episodesData.map(e => e.id)
    const { data: data2 } = await getPlayHeads(profile, { contentIds: epIds })
    const playheads = data2.reduce((total, value) => {
        total[value.content_id] = value
        return total
    }, {})
    for (const ep of episodesData) {
        if (playheads[ep.id]) {
            const duration = ep.duration_ms / 1000
            const playhead = playheads[ep.id].fully_watched ? duration : playheads[ep.id].playhead
            ep.playhead = {
                ...playheads[ep.id],
                progress: playhead / duration * 100
            }
        } else {
            ep.playhead = {
                playhead: 0,
                fully_watched: false,
                progress: 0,
            }
        }
    }
}
