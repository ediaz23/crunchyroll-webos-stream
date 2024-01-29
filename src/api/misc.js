
import { localStore, config } from 'crunchyroll-js-api'
import { customFetch } from '../hooks/customFetch'

/**
 * Return audio lang list supported
 * @returns {Promise<Array<String>>}
 */
export const getAudioLangList = async () => config.i18n.audio_languages

/**
 * Return subtitles lang list supported
 * @returns {Promise<Array<String>>}
 */
export const getSubtitleLangList = async () => ['off', ...config.i18n.text_languages]


/**
 * Return content lang list supported
 * @returns {Promise<Array<String>>}
 */
export const getContentLangList = async () => config.i18n.supported

/**
 * Expand a sort url
 * @param {String} url
 * @return {Promise<Response>}
 */
export const fetchAuth = async (url) => {
    const token = await localStore.getAuthToken()
    return customFetch(url, { headers: { Autorization: token } })
}

