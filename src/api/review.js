
import { api } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError, getContentParam } from './utils'


/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.contentId
 * @param {String} params.contentType
 * @return {Promise}
 */
export const getRatings = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('ratings', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.review.getRatings({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.contentId
 * @param {String} params.rating
 * @param {String} params.contentType
 * @returns {Promise<import('../types').RatingStars>}
 */
export const updateRating = async (profile, params) => {
    let out = null
    try {
        const account = await getContentParam(profile)
        out = await api.review.addRating({account, ...params})
    } catch (error) {
        await translateError(error)
    }
    return out
}
