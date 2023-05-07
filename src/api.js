
import 'webostvjs'
import utils from './utils'
import logger from './logger'
import localStore from 'crunchyroll-js-api/src/localStore'


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
const setNextContactDate = async() => {
    const today = new Date()
    const nextDate = new Date()
    nextDate.setMonth(today.getMonth() + 3)  // mounth is 0-based
    await localStore.setNewData({ nextDonation: nextDate })
}

export default {
    init,
    isNewInstallation,
    getNextContactDate,
    setInstalled,
    setNextContactDate,
}
