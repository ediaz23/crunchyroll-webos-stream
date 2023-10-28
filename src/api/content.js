
import { api } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError, getContentParam } from './utils'

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {Array<String>} params.contentIds
 * @return {Promise}
 */
export const getPlayHeads = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('play-heads', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.content.getPlayheads({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}
