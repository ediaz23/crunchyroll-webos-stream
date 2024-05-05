
import 'webostvjs'
import { v4 as uuidv4 } from 'uuid'
import { localStore, utils as crunchUtils } from 'crunchyroll-js-api'
import logger from '../logger'
import utils from '../utils'


/** @type {{webOS: import('webostvjs').WebOS}} */
const { webOS } = window

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
    await localStore.setNewData({
        installed: today.toISOString(),
        nextDonation: nextDate.toISOString(),
    })
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
    await localStore.setNewData({ nextDonation: nextDate.toISOString() })
}

/** @returns {import('crunchyroll-js-api').Types.Device} */
export const getDevice = () => storage.device

export const setDeviceInformation = async () => {
    if (!storage.device) {
        /** @type {import('crunchyroll-js-api').Types.Device} */
        const device = {
            id: uuidv4(),
            name: 'Smart TV Nano',
            type: 'LG Smart TV'
        }
        if (utils.isTv()) {
            await new Promise(res => {
                webOS.service.request('luna://com.webos.service.tv.systemproperty', {
                    method: 'getSystemInfo',
                    parameters: { keys: ['modelName'] },
                    onComplete: (inResponse) => {
                        const isSucceeded = inResponse.returnValue

                        if (isSucceeded) {
                            device.name = inResponse.modelName
                        }
                        res()
                    },
                    onFailure: res,
                })
            })
        }
        await localStore.setNewData({ device })
    }
}

export const SERVER_CERTIFICATE = 'CrsCCAMSEKDc0WAwLAQT1SB2ogyBJEwYv4Tx7gUijgIwggEKAoIBAQC8Xc/GTRwZDtlnBThq8V382D1oJAM0F/YgCQtNDLz7vTWJ+QskNGi5Dd2qzO4s48Cnx5BLvL4H0xCRSw2Ed6ekHSdrRUwyoYOE+M/t1oIbccwlTQ7o+BpV1X6TB7fxFyx1jsBtRsBWphU65w121zqmSiwzZzJ4xsXVQCJpQnNI61gzHO42XZOMuxytMm0F6puNHTTqhyY3Z290YqvSDdOB+UY5QJuXJgjhvOUD9+oaLlvT+vwmV2/NJWxKqHBKdL9JqvOnNiQUF0hDI7Wf8Wb63RYSXKE27Ky31hKgx1wuq7TTWkA+kHnJTUrTEfQxfPR4dJTquE+IDLAi5yeVVxzbAgMBAAE6DGNhc3RsYWJzLmNvbUABEoADMmGXpXg/0qxUuwokpsqVIHZrJfu62ar+BF8UVUKdK5oYQoiTZd9OzK3kr29kqGGk3lSgM0/p499p/FUL8oHHzgsJ7Hajdsyzn0Vs3+VysAgaJAkXZ+k+N6Ka0WBiZlCtcunVJDiHQbz1sF9GvcePUUi2fM/h7hyskG5ZLAyJMzTvgnV3D8/I5Y6mCFBPb/+/Ri+9bEvquPF3Ff9ip3yEHu9mcQeEYCeGe9zR/27eI5MATX39gYtCnn7dDXVxo4/rCYK0A4VemC3HRai2X3pSGcsKY7+6we7h4IycjqtuGtYg8AbaigovcoURAZcr1d/G0rpREjLdVLG0Gjqk63Gx688W5gh3TKemsK3R1jV0dOfj3e6uV/kTpsNRL9KsD0v7ysBQVdUXEbJotcFz71tI5qc3jwr6GjYIPA3VzusD17PN6AGQniMwxJV12z/EgnUopcFB13osydpD2AaDsgWo5RWJcNf+fzCgtUQx/0Au9+xVm5LQBdv8Ja4f2oiHN3dw'

