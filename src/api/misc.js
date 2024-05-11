
import { fetchAuth } from './utils'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'


/**
 * Return audio lang list supported
 * @returns {Promise<Array<String>>}
 */
export const getAudioLangList = async () => {
    let data
    if (LOAD_MOCK_DATA) {
        data = await getMockData('audios')
        delete data.default
    } else {
        const res = await fetchAuth('https://static.crunchyroll.com/config/i18n/v3/audio_languages.json')
        data = await res.json()
    }
    return ["ja-JP", ...Object.keys(data)]
}


/**
 * Return subtitles lang list supported
 * @returns {Promise<Array<String>>}
 */
export const getSubtitleLangList = async () => {
    let data
    if (LOAD_MOCK_DATA) {
        data = await getMockData('languages')
        delete data.default
    } else {
        const res = await fetchAuth('https://static.crunchyroll.com/config/i18n/v3/timed_text_languages.json')
        data = await res.json()
    }
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
