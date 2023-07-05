
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
