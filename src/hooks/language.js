
import { $L as translationFunction } from '@enact/i18n/$L'
import countries from 'i18n-iso-countries'
import languages from '@cospired/i18n-iso-languages'
import Locale from 'ilib/lib/Locale'


/**
 * Translation function
 * @param {String} p
 * @return {String}
 */
export const $L = translationFunction


/**
 * @param {String} code
 * @returns {String}
 */
const getLanguage = (code) => {
    if (code === 'off') { return $L('Disable') }
    const localeInfo = new Locale()
    /** @type {Array<String>} */
    const split = code.split('-')
    const languageName = languages.getName(split[0], localeInfo.language)
    let desc = languageName
    if (split.length > 1) {
        const regionName = countries.getName(split[1], localeInfo.language)
        desc = regionName ? `${languageName} (${regionName})` : languageName
    }
    return desc
}

export const useGetLanguage = () => getLanguage
export default useGetLanguage

/**
 * @param {String} lang lang code
 * @return {{key: String, children: String}}
 */
const mapLang = lang => {
    return { key: lang, children: getLanguage(lang) }
}

export const useMapLang = () => mapLang
