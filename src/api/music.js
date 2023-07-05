
import { api } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError, getContentParam } from './utils'


/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Array<String>} artistIds
 * @return {Promise}
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
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Array<String>} concertIds
 * @return {Promise}
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
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Array<String>} musicIds
 * @return {Promise}
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
