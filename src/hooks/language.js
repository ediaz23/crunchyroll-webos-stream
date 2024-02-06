
import $L from '@enact/i18n/$L'
import Locale from 'ilib/lib/Locale'
import languages from '@cospired/i18n-iso-languages'

import Country from '../patch/Country'

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
        const country = new Country({ locale: localeInfo })
        const regionName = country.getName(split[1])
        desc = regionName ? `${languageName} (${regionName})` : languageName
    }
    return desc
}

export const useGetLanguage = () => getLanguage

/**
 * @param {String} lang lang code
 * @return {{key: String, children: String}}
 */
const mapLang = lang => {
    return { key: lang, children: getLanguage(lang) }
}

export const useMapLang = () => mapLang

/**
 * @param {String} locale
 * @return {{language: String, region: String, spec: String}}
 */
export const getLocalInfo = (locale) => {
    const [language, region] = locale.split('-')
    return {
        language,
        region,
        spec: locale
    }
}


export default useGetLanguage
