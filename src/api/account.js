
import 'webostvjs'
import { localStore, api } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError } from '../api/utils'


/**
 * Return account info
 * @returns {Promise<import('crunchyroll-js-api').Types.AccountObj>}
 */
export const getAccount = async () => {
    let account = null
    try {
        account = await localStore.getAccount()
    } catch (error) {
        await translateError(error)
    }
    return account
}

/**
 * Return profile
 * @returns {Promise<Array<import('crunchyroll-js-api').Types.Profile>>}
 */
export const getProfiles = async () => {
    let profile = []
    try {
        if (LOAD_MOCK_DATA) {
            profile = [await getMockData('profile')]
        } else {
            const tmpProfile = await api.account.getProfile({ token: await localStore.getAuthToken() })
            if (tmpProfile) {  // hack to allow multi-profile
                profile = [{ id: 0, ...tmpProfile }]
            }
        }
    } catch (error) {
        await translateError(error)
    }
    return profile
}

/**
 * Update a profile
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @returns {Promise}
 */
export const updateProfile = async (profile) => {
    try {
        await api.account.updateProfile({ token: await localStore.getAuthToken(), data: profile })
    } catch (error) {
        await translateError(error)
    }
}
