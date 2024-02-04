
import { api } from 'crunchyroll-js-api'
//import { LOAD_MOCK_DATA } from '../const'
//import { getMockData } from '../mock-data/mockData'
import { translateError, getContentParam } from './utils'


/**
 * Get episodes for a season
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.episodeId
 * @param {String} [params.type] only null or music
 * @return {Promise}
 */
export const getStreams = async (profile, params) => {
    let out = null
    try {
        const account = await getContentParam(profile)
        out = await api.drm.getStream({ account, ...params })
    } catch (error) {
        await translateError(error)
    }
    return out
}


/**
 * Get episodes for a season
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.episodeId
 * @param {String} params.token
 * @return {Promise}
 */
export const deleteToken = async (profile, params) => {
    try {
        const account = await getContentParam(profile)
        await api.drm.deleteToken({ account, ...params })
    } catch (error) {
        await translateError(error)
    }
}


/**
 * Get episodes for a season
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.episodeId
 * @param {String} params.token
 * @param {Number} params.playhead
 * @return {Promise}
 */
export const keepAlive = async (profile, params) => {
    let out = null
    try {
        const account = await getContentParam(profile)
        out = await api.drm.keepAlive({ account, ...params })
    } catch (error) {
        await translateError(error)
    }
    return out
}
