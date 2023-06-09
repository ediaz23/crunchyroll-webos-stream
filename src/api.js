
import 'webostvjs'
import $L from '@enact/i18n/$L'
import Locale from 'ilib/lib/Locale'
import logger from './logger'
import {
    localStore, CrunchyrollError, api, config,
    utils as crunchUtils
} from 'crunchyroll-js-api'
import CONST from './const'
import getMockData from './mock-data/mockData'


/**
 * @typedef ApiStorageSub
 * @type {Object}
 * @property {Date} installed
 * @property {Date} nextDonation
 * @typedef {ApiStorageSub & import('crunchyroll-js-api/src/localStore').Storage} ApiStorage
 */
/** @type {ApiStorage} */
const storage = localStore.storage

const { LOAD_MOCK_DATA } = CONST

/**
 * Initialize storage
 * @returns {Promise}
 */
const init = async () => {
    logger.info('in  => database init')
    await localStore.loadFromLocal()
    logger.info('out => database init')
}

/**
 * Set custom fetch function to api
 * @param {Function} fetchFn
 */
const setCustomFetch = (fetchFn) => {
    crunchUtils.setFetchFunction(fetchFn)
}

/**
 * Return if it is new installation
 * @return {Promise<Boolean>}
 */
const isNewInstallation = async () => !storage.installed

/**
 * Set initial data after installed
 * @return {Promise}
 */
const setInstalled = async () => {
    const today = new Date()
    const nextDate = new Date()

    nextDate.setDate(today.getDate() + 3)
    await localStore.setNewData({ installed: today, nextDonation: nextDate })
}

/**
 * Return next date to show contact screen
 * @returns {Promise<Date>}
 */
const getNextContactDate = async () =>
    storage.nextDonation ? new Date(storage.nextDonation) : undefined

/**
 * Set next date to show contact screen
 * @returns {Promise}
 */
const setNextContactDate = async () => {
    const today = new Date()
    const nextDate = new Date()
    nextDate.setMonth(today.getMonth() + 3)  // mounth is 0-based
    await localStore.setNewData({ nextDonation: nextDate })
}

/**
 * Set credentials
 * @param {import('crunchyroll-js-api/src/types').Credential} credential
 * @returns {Promise}
 */
const setCredentials = async (credential) => {
    await localStore.setNewData({ credential })
}

/**
 * Return saved credentials
 * @returns {Promise<import('crunchyroll-js-api/src/types').Credential>}
 */
const getCredentials = async () => storage.credential

/**
 * Return current session
 * @returns {Promise<import('crunchyroll-js-api/src/types').TokenObj>}
 */
const getSession = async () => storage.token

/**
 * Convert error code to human language
 * @param {CrunchyrollError} error
 */
const translateError = async (error) => {
    let newError = error
    if (error instanceof CrunchyrollError) {
        if (error.code === CONST.invalid_email_password) {
            newError = new CrunchyrollError($L('Please check your email and password.'), error.code)
        } else if (error.code === CONST.invalid_password) {
            newError = new CrunchyrollError($L('Wrong password.'), error.code)
        } else if (error.code === CONST.invalid_refresh_token) {
            newError = new CrunchyrollError($L('Invalid access token, try to log in again.'), error.code)
            await localStore.setNewData({ token: null })
        } else if (error.code === CONST.invalid_auth_token) {
            newError = new CrunchyrollError($L('Invalid access token, try to log in again.'), error.code)
            await localStore.setNewData({ token: null })
        }
        logger.error(error)
    }
    throw newError
}

/**
 * Send a login request
 * @returns {Promise<import('crunchyroll-js-api/src/types').TokenObj>}
 */
const login = async () => {
    let token = null
    try {
        token = await localStore.getToken()
    } catch (error) {
        await translateError(error)
    }
    return token
}

/**
 * Send logout
 * @returns {Promise}
 */
const logout = async () => {
    try {
        await localStore.revokeToken()
    } catch (error) {
        await translateError(error)
    }
}

/**
 * Return account info
 * @returns {Promise<import('crunchyroll-js-api/src/types').AccountObj>}
 */
const getAccount = async () => {
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
 * @returns {Promise<Array<import('crunchyroll-js-api/src/types').Profile>>}
 */
const getProfiles = async () => {
    let profile = []
    try {
        if (__DEV__ && LOAD_MOCK_DATA) {
            profile = [await getMockData('profile.json')]
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
 * Return avatar list
 * @returns {Promise<Array<String>>}
 */
const getAvatarList = async () => {
    let avatarList = null
    try {
        const { items } = await api.assets.getAvatar({ token: await localStore.getAuthToken() })
        avatarList = items
    } catch (error) {
        await translateError(error)
    }
    return avatarList
}

/**
 * Update a profile
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @returns {Promise}
 */
const updateProfile = async (profile) => {
    try {
        await api.account.updateProfile({ token: await localStore.getAuthToken(), data: profile })
    } catch (error) {
        await translateError(error)
    }
}

/**
 * Return avatar url
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @returns {String}
 */
const getAvatarUrl = profile => `${config.configApp.url_static}/assets/avatar/170x170/${profile.avatar}`

/**
 * Return audio lang list supported
 * @returns {Array<String>}
 */
const getAudioLangList = async () => config.i18n.audio_languages

/**
 * Return subtitles lang list supported
 * @returns {Array<String>}
 */
const getSubtitleLangList = async () => config.i18n.text_languages

/**
 * Return content lang list supported
 * @returns {Array<String>}
 */
const getContentLangList = async () => config.i18n.supported

/**
 * Return basic params to query api
 */
const getContentParam = async () => {
    const token = await localStore.getAuthToken()
    const localeObj = new Locale()
    const locale = localeObj.getSpec()
    const accountId = (await localStore.getToken()).accountId
    return { account: { token, locale, accountId } }
}

/**
 * Get index data
 * @return {Promise}
 */
const getHomeFeed = async () => {
    let out = null
    try {
        const param = await getContentParam()
        out = await api.content.getHomeFeed(param)
    } catch (error) {
        await translateError(error)
    }
    return out
}


export default {
    init,
    setCustomFetch,
    isNewInstallation,
    getNextContactDate,
    setInstalled,
    setNextContactDate,
    setCredentials,
    getCredentials,
    login,
    logout,
    getSession,
    getAccount,
    getProfiles,
    updateProfile,
    getAvatarList,
    getAvatarUrl,
    getAudioLangList,
    getSubtitleLangList,
    getContentLangList,
    getHomeFeed,
}
