
import 'webostvjs'
import { api, localStore } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA, ERROR_CODES } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError } from '../api/utils'


/**
 * Return user's benifits
 * @param {import('crunchyroll-js-api').Types.AccountObj} account
 * @returns {Promise<{items: Array<{benefit: String}>}>}
 */
export const getUserBenefits = async (account) => {
    let out
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('benefits')
        } else {
            const token = await localStore.getToken()
            out = await api.subscription.getUserBenefits({
                auth: { token: `${token.tokenType} ${token.accessToken}`, locale: 'en' },
                externalId: account.externalId,
            })
        }
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Forbidden' || error.code === ERROR_CODES.subscription_not_found) {
                out = { items: [] }
            } else {
                await translateError(error)
            }
        } else {
            await translateError(error)
        }
    }
    return out
}
