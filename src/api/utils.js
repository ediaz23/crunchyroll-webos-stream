
import { localStore, CrunchyrollError } from 'crunchyroll-js-api'
import $L from '@enact/i18n/$L'
import { ERROR_CODES } from '../const'
import logger from '../logger'


/**
 * Convert error code to human language
 * @param {CrunchyrollError} error
 */
export const translateError = async (error) => {
    let newError = error
    if (error instanceof CrunchyrollError) {
        if (error.code === ERROR_CODES.invalid_email_password) {
            newError = new CrunchyrollError($L('Please check your email and password.'), error.code)
        } else if (error.code === ERROR_CODES.invalid_password) {
            newError = new CrunchyrollError($L('Wrong password.'), error.code)
        } else if (error.code === ERROR_CODES.invalid_refresh_token) {
            newError = new CrunchyrollError($L('Invalid access token, try to log in again.'), error.code)
            await localStore.setNewData({ token: null })
        } else if (error.code === ERROR_CODES.invalid_auth_token) {
            newError = new CrunchyrollError($L('Invalid access token, try to log in again.'), error.code)
            await localStore.setNewData({ token: null })
        }
        logger.error(error)
    }
    throw newError
}

/**
 * Return basic params to query api
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @returns {Promise<import('crunchyroll-js-api/src/types').AccountAuth>}
 */
export const getContentParam = async (profile) => {
    const token = await localStore.getAuthToken()
    const accountId = (await localStore.getToken()).accountId
    return {
        token,
        accountId,
        locale: profile.preferred_communication_language,
        audioLanguage: profile.preferred_content_audio_language,
    }
}
