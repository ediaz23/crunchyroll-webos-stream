
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
 * @returns {Promise<import('crunchyroll-js-api').Types.ProfileResponse>}
 */
export const getProfiles = async () => {
    /** @type {import('crunchyroll-js-api').Types.ProfileResponse} */
    let profile
    try {
        if (LOAD_MOCK_DATA) {
            profile = {
                max_profiles: 1,
                tier_max_profiles: 1,
                profiles: [await getMockData('profile')]
            }
            const account = await getAccount()
            profile.profiles[0].profile_id = account.accountId
        } else {
            profile = await api.account.getMultiProfiles({ token: await localStore.getAuthToken() })
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
