
import 'webostvjs'
import $L from '@enact/i18n/$L'
import logger from './logger'
import {
    localStore, CrunchyrollError, api, config,
    utils as crunchUtils
} from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA, ERROR_CODES } from './const'
import { getMockData } from './mock-data/mockData'


/**
 * @typedef ApiStorageSub
 * @type {Object}
 * @property {Date} installed
 * @property {Date} nextDonation
 * @typedef {ApiStorageSub & import('crunchyroll-js-api/src/localStore').Storage} ApiStorage
 */
/** @type {ApiStorage} */
const storage = localStore.storage

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
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @returns {Promise<import('crunchyroll-js-api/src/types').AccountAuth>}
 */
const getContentParam = async (profile) => {
    const token = await localStore.getAuthToken()
    const accountId = (await localStore.getToken()).accountId
    return {
        token,
        accountId,
        locale: profile.preferred_communication_language,
        audioLanguage: profile.preferred_content_audio_language,
    }
}

/**
 * Get index data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @return {Promise}
 */
const getHomeFeed = async (profile) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('homefeed')
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getHomeFeed({ account })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {Array<String>} params.objectIds
 * @param {Boolean} [params.ratings]
 * @return {Promise}
 */
const getObjects = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('objects', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getObjects({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Array<String>} artistIds
 * @return {Promise}
 */
const getMusicArtists = async (profile, artistIds) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('artist', artistIds)
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getMusicArtist({ account, artistIds })
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
const getMusicConcerts = async (profile, concertIds) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('concerts', concertIds)
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getMusicConcerts({ account, concertIds })
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
const getMusicVideos = async (profile, musicIds) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('musicVideo', musicIds)
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getMusicVideo({ account, musicIds })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {Number} [params.quantity]
 * @param {Boolean} [params.ratings]
 * @return {Promise}
 */
const getHistory = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('discoverHistory', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getHistory({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {Number} [params.quantity]
 * @param {Number} [params.start]
 * @return {Promise}
 */
const getWatchlist = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('discoverWatchlist', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getWatchlist({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {Number} [params.quantity]
 * @param {Number} [params.start]
 * @param {Boolean} [obj.ratings]
 * @return {Promise}
 */
const getRecomendation = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('discoverRecomendantion', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getRecommendations({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {String} params.contentId
 * @param {Number} [params.quantity]
 * @param {Number} [params.start]
 * @param {Boolean} [obj.ratings]
 * @return {Promise}
 */
const getSimilar = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('similar', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getSimilar({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Get object data
 * @param {import('crunchyroll-js-api/src/types').Profile} profile
 * @param {Object} params
 * @param {Number} [params.quantity] Number of records in a result
 * @param {Number} [params.start] Offset to request
 * @param {Array<String>} [params.category] Category
 * @param {String} [params.query] Search pattern
 * @param {String} [params.seasonTag] season tag
 * @param {String} [params.sort] sort results
 * @param {String} [params.type] type for search, example episode
 * @param {Boolean} [params.ratings]
 * @return {Promise}
 */
const getBrowseAll = async (profile, params) => {
    let out = null
    try {
        if (LOAD_MOCK_DATA) {
            out = await getMockData('browse', params)
        } else {
            const account = await getContentParam(profile)
            out = await api.content2.getBrowseAll({ account, ...params })
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * Expand a sort url
 * @param {String} url
 * @return {Promise<Response>}
 */
const expandURL = async (url) => {
    const token = await localStore.getAuthToken()
    return fetch(url, { headers: { 'Autorization': token } })
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
    getObjects,
    getMusicArtists,
    getMusicConcerts,
    getMusicVideos,
    getHistory,
    getWatchlist,
    getRecomendation,
    getSimilar,
    getBrowseAll,
    expandURL,
}
