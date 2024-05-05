
import 'webostvjs'
import { localStore } from 'crunchyroll-js-api'
import { translateError } from '../api/utils'

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
 * Set credentials
 * @param {import('crunchyroll-js-api').Types.Credential} credential
 * @returns {Promise}
 */
export const setCredentials = async (credential) => {
    await localStore.setNewData({ credential })
}

/**
 * Return saved credentials
 * @returns {Promise<import('crunchyroll-js-api/src/types').Credential>}
 */
export const getCredentials = async () => storage.credential

/**
 * Return current session
 * @returns {Promise<import('crunchyroll-js-api/src/types').TokenObj>}
 */
export const getSession = async () => storage.token

/**
 * Send a login request
 * @returns {Promise<import('crunchyroll-js-api/src/types').TokenObj>}
 */
export const login = async () => {
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
export const logout = async () => {
    try {
        await localStore.revokeToken()
    } catch (error) {
        await translateError(error)
    }
}
