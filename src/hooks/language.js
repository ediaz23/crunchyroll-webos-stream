
import $L from '@enact/i18n/$L'
import Locale from 'ilib/lib/Locale'
import languages from '@cospired/i18n-iso-languages'

import Country from '../patch/Country'

/**
 * @param {String} code
 * @returns {String}
 */
const getLanguage = (code) => {
    if (code === 'off') { return $L('None') }
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

export default useGetLanguage
