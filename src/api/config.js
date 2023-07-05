
import logger from '../logger'
import { localStore, utils as crunchUtils } from 'crunchyroll-js-api'

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
export const init = async () => {
    logger.info('in  => database init')
    await localStore.loadFromLocal()
    logger.info('out => database init')
}

/**
 * Set custom fetch function to api
 * @param {Function} fetchFn
 */
export const setCustomFetch = (fetchFn) => {
    crunchUtils.setFetchFunction(fetchFn)
}

/**
 * Return if it is new installation
 * @return {Promise<Boolean>}
 */
export const isNewInstallation = async () => !storage.installed

/**
 * Set initial data after installed
 * @return {Promise}
 */
export const setInstalled = async () => {
    const today = new Date()
    const nextDate = new Date()

    nextDate.setDate(today.getDate() + 3)
    await localStore.setNewData({ installed: today, nextDonation: nextDate })
}

/**
 * Return next date to show contact screen
 * @returns {Promise<Date>}
 */
export const getNextContactDate = async () =>
    storage.nextDonation ? new Date(storage.nextDonation) : undefined

/**
 * Set next date to show contact screen
 * @returns {Promise}
 */
export const setNextContactDate = async () => {
    const today = new Date()
    const nextDate = new Date()
    nextDate.setMonth(today.getMonth() + 3)  // mounth is 0-based
    await localStore.setNewData({ nextDonation: nextDate })
}
