
import { localStore } from 'crunchyroll-js-api'
import { customFetch } from '../hooks/customFetch'


/**
 * Expand a sort url
 * @param {String} url
 * @return {Promise<Response>}
 */
export const fetchAuth = async (url) => {
    const token = await localStore.getAuthToken()
    return customFetch(url, { headers: { Autorization: token } })
}


/**
 * Return audio lang list supported
 * @returns {Promise<Array<String>>}
 */
export const getAudioLangList = async () => {
    const res = await fetchAuth('https://static.crunchyroll.com/config/i18n/v3/audio_languages.json')
    const data = await res.json()
    return ["ja-JP", ...Object.keys(data)]
}


/**
 * Return subtitles lang list supported
 * @returns {Promise<Array<String>>}
 */
export const getSubtitleLangList = async () => {
    const res = await fetchAuth('https://static.crunchyroll.com/config/i18n/v3/timed_text_languages.json')
    const data = await res.json()
    return ['off', ...Object.keys(data)]
}


/**
 * Return content lang list supported
 * @returns {Promise<Array<String>>}
 */
export const getContentLangList = async () => [
    "ar-SA",
    "de-DE",
    "en-US",
    "es-419",
    "es-ES",
    "fr-FR",
    "it-IT",
    "pt-BR",
    "pt-PT",
    "ru-RU",
    "hi-IN"
]
