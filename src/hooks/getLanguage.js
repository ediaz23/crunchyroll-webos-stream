import Locale from 'ilib/lib/Locale'
import Country from '../patch/Country'
import languages from '@cospired/i18n-iso-languages'

/**
 * @param {String} code
 * @returns {String}
 */
const getLanguage = (code) => {
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

const useGetLanguage = () => {
    return getLanguage
}

export default useGetLanguage
