
import 'webostvjs'
import { localStore, api } from 'crunchyroll-js-api'
import { translateError } from '../api/utils'

/**
 * @typedef ApiStorageSub
 * @type {Object}
 * @property {Date} installed
 * @property {Date} nextDonation
 * @typedef {ApiStorageSub & import('crunchyroll-js-api').Types.Storage} ApiStorage
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
 * @returns {Promise<import('crunchyroll-js-api').Types.Credential>}
 */
export const getCredentials = async () => storage.credential

/**
 * Return current session
 * @returns {Promise<import('crunchyroll-js-api').Types.TokenObj>}
 */
export const getSession = async () => storage.token

/**
 * Send a login request
 * @returns {Promise<import('crunchyroll-js-api').Types.TokenObj>}
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

/**
 * switch Profile
 * @param {String} profileId
 * @returns {Promise}
 */
export const switchProfile = async (profileId) => {
    try {
        await localStore.switchProfile(profileId)
    } catch (error) {
        await translateError(error)
    }
}

/**
 * get device code
 * @returns {Promise<import('crunchyroll-js-api').Types.DeviceCode>}
 */
export const getDeviceCode = async () => {
    let out = null
    try {
        out = await api.auth.getDeviceCode()
    } catch (error) {
        await translateError(error)
    }
    return out
}

/**
 * get device code
 * @returns {Promise<import('crunchyroll-js-api').Types.Token>}
 */
export const getDeviceAuth = async (deviceCode) => {
    /** @type {import('crunchyroll-js-api').Types.Token} */
    let out = null
    try {
        out = await api.auth.getDeviceAuth({ device: storage.device, deviceCode })
        if (out) {
            localStore.saveToken(out)
        }
    } catch (error) {
        await translateError(error)
    }
    return out
}
