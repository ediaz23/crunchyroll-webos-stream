
import { localStore, api, config } from 'crunchyroll-js-api'
import { translateError } from './utils'


/**
 * Return avatar list
 * @returns {Promise<Array<String>>}
 */
export const getAvatarList = async () => {
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
 * Return avatar url
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @returns {String}
 */
export const getAvatarUrl = profile => `${config.configApp.url_static}/assets/avatar/170x170/${profile.avatar}`
