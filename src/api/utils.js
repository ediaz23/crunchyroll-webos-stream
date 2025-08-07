
import { localStore, CrunchyrollError } from 'crunchyroll-js-api'
import Locale from 'ilib/lib/Locale'
import { $L } from '../hooks/language'
import { ERROR_CODES } from '../const'
import logger from '../logger'
import { customFetch, getCustomCache, saveCustomCache, clearCache } from '../hooks/customFetch'

export { getCustomCache, saveCustomCache, clearCache }

/**
 * Expand a sort url
 * @param {String} url
 * @param {RequestInit} options
 * @param {import('crunchyroll-js-api').Types.FetchConfig} [fnConfig]
 * @return {Promise<Response>}
 */
export const fetchAuth = async (url, options = {}, fnConfig = {}) => {
    const token = await localStore.getAuthToken()
    const headers = { ...(options.headers || {}) }
    headers['Autorization'] = token
    return customFetch(url, { ...options, headers }, fnConfig)
}

/**
 * Convert error code to human language
 * @param {CrunchyrollError} error
 */
export const translateError = async (error) => {
    let newError = error
    if (error instanceof CrunchyrollError) {
        /** @type {Object.<String, String>} */
        let transtalteCode = {}
        try {
            const locale = new Locale()
            const lang = locale.getSpec().replace('-', '_')
            const res = await fetchAuth(`https://static.crunchyroll.com/i18n/cxweb/${lang}.json`)
            transtalteCode = await res.json()
        } catch (_e) {
            // ignore
        }

        if (transtalteCode[error.code]) {
            newError = new CrunchyrollError(transtalteCode[error.code], error.code)
        } else if (error.code === ERROR_CODES.invalid_email_password) {
            newError = new CrunchyrollError($L('Please check your email and password'), error.code)
        } else if (error.code === ERROR_CODES.invalid_password) {
            newError = new CrunchyrollError($L('Wrong password'), error.code)
        } else if (error.code === ERROR_CODES.subscription_not_found) {
            newError = new CrunchyrollError($L('Subscription not found'), error.code)
        } else if (error.code === ERROR_CODES.invalid_refresh_token) {
            newError = new CrunchyrollError($L('Invalid access token, try to log in again'), error.code)
            await localStore.setNewData({ token: null })
        } else if (error.code === ERROR_CODES.invalid_auth_token) {
            newError = new CrunchyrollError($L('Invalid access token, try to log in again'), error.code)
            await localStore.setNewData({ token: null })
        } else if (error.code === ERROR_CODES.invalid_client) {
            newError = new CrunchyrollError($L('Old app version, please check updates'), error.code)
            await localStore.setNewData({ token: null })
        } else if (error.code === ERROR_CODES.create_profile_error) {
            let extra = ''
            if (error.context && Array.isArray(error.context)) {
                extra = error.context.filter(e => e.field).map(e => e.field).join(', ')
                if (extra) {
                    extra = ' ' + $L('Check out') + ': ' + extra
                }
            }
            newError = new CrunchyrollError($L('Error creating profile.') + extra, error.code)
        }
        logger.error(error)
    }
    throw newError
}

/**
 * Return basic params to query api
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @returns {Promise<import('crunchyroll-js-api').Types.AccountAuth>}
 */
export const getContentParam = async (profile) => {
    const token = await localStore.getToken()
    return {
        token: `${token.tokenType} ${token.accessToken}`,
        accountId: token.accountId,
        locale: profile.preferred_communication_language,
        audioLanguage: profile.preferred_content_audio_language,
    }
}
