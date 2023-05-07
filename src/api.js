
import 'webostvjs'
import $L from '@enact/i18n/$L'
import utils from './utils'
import logger from './logger'
import { localStore, CrunchyrollError, api } from 'crunchyroll-js-api'
import CONST from './const'


/**
 * @typedef ApiStorageSub
 * @type {Object}
 * @property {Date} installed
 * @property {Date} nextDonation
 * @typedef {ApiStorageSub & import('crunchyroll-js-api/src/localStore').Storage} ApiStorage
 */
/** @type {ApiStorage} */
const storage = localStore.storage

/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window
const DB_OWNER = 'com.crunchyroll.stream.app'
const DB_KIND = `${DB_OWNER}:1`
const SERVICE_URL = 'luna://com.palm.db'

let recordId = null
/**
 * Delete record, only for development
 * @returns {Promise}
 */
/*async function _delRecord() {
    logger.debug('in  => api delRecord')

    return new Promise((res, rej) => {
        webOS.service.request(SERVICE_URL, {
            method: 'del',
            parameters: { query: { from: DB_KIND } },
            onSuccess: (data) => {
                logger.debug('res okey')
                logger.debug(data)
                res(data)
            },
            onFailure: (error) => {
                logger.error('res error')
                logger.error(error)
                rej(error)
            }
        })
    }).finally(() => logger.debug('out => api delRecord'))
}*/

/**
 * Save data to external system
 * @param {Object} data
 * @returns {Promise}
 */
const save = async (data) => {
    logger.debug('in  => api save')
    let appData = { _kind: DB_KIND, data, }
    if (recordId) {
        appData._id = recordId
    }
    return new Promise((res, rej) => {
        webOS.service.request(SERVICE_URL, {
            method: recordId ? 'merge' : 'put',
            parameters: { objects: [appData] },
            onSuccess: (resData) => {
                logger.debug('res okey')
                logger.debug(resData)
                if (resData.returnValue) {
                    recordId = resData.results[0].id
                }
                res(resData)
            },
            onFailure: (error) => {
                logger.error('res error')
                logger.error(error)
                rej(error)
            }
        })
    }).finally(() => logger.debug('out => api save'))
}


/**
 * Load data external system
 * @param {Object} data
 * @returns {Promise}
 */
const load = async () => {
    logger.debug('in  => api load')

    return new Promise((res, rej) => {
        webOS.service.request(SERVICE_URL, {
            method: 'find',
            parameters: { query: { from: DB_KIND } },
            onSuccess: (data) => {
                logger.debug('res okey')
                logger.debug(data)
                res(data.returnValue && data.results.length ? data.results[0].data : '{}')
            },
            onFailure: (error) => {
                logger.error('res error')
                logger.error(error)
                rej(error)
            }
        })
    }).finally(() => logger.debug('out => api load'))
}


/**
 * Create database schema for DB8
 * @returns {Promise}
 */
const createTable = async () => {
    logger.debug('in  => api createTable')

    return new Promise((res, rej) => {
        webOS.service.request(SERVICE_URL, {
            method: 'putKind',
            parameters: {
                id: DB_KIND,
                owner: DB_OWNER,
                private: true,
            },
            onSuccess: (data) => {
                logger.debug('res okey')
                logger.debug(data)
                res(data)
            },
            onFailure: (error) => {
                logger.error('res error')
                logger.error(error)
                rej(error)
            }
        })
    }).finally(() => logger.debug('out => api createTable'))
}


/**
 * Initialize storage
 * @returns {Promise}
 */
const init = async () => {
    logger.info('in  => database init')
    if (utils.isTv()) {
        await createTable()
        localStore.setExternalStorage({ save, load })
    }
    await localStore.loadFromLocal()
    logger.info('out => database init')
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
 * @returns {Promise<import('crunchyroll-js-api/src/types').Profile>}
 */
const getProfile = async () => {
    let profile = null
    try {
        profile = await api.account.getProfile({ token: await localStore.getAuthToken() })
    } catch (error) {
        await translateError(error)
    }
    return profile
}


export default {
    init,
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
    getProfile,
}
