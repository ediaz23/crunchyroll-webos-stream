
import { useEffect, useState } from 'react'
import i18n from 'i18next'
import regions from 'i18n-iso-m49'
import countries from 'i18n-iso-countries'
import languages from '@cospired/i18n-iso-languages'
import i18nImporter from './i18nImporter.js'


/**
 * Translation function
 * @param {String} p
 * @return {String}
 */
export const $L = i18n.t


/**
 * @param {String} srt
 * @returns {String}
 */
function parseLocale(str) {
    if (!str) return str;

    // take care of the libc style locale with a dot + script at the end
    const dot = str.indexOf('.')
    if (dot > -1) {
        str = str.substring(0, dot)
    }

    // handle the posix default locale
    if (str === 'C') return 'en-US';

    const parts = str.replace(/_/g, '-').split(/-/g)
    const localeParts = []

    if (parts.length > 0) {
        if (parts[0].length === 2 || parts[0].length === 3) {
            // language
            localeParts.push(parts[0].toLowerCase())

            if (parts.length > 1) {
                if (parts[1].length === 4) {
                    // script
                    localeParts.push(parts[1][0].toUpperCase() + parts[1].substring(1).toLowerCase())
                } else if (parts[1].length === 2 || parts[1].length === 3) {
                    // region
                    localeParts.push(parts[1].toUpperCase())
                }
                if (parts.length > 2) {
                    if (parts[2].length === 2 || parts[2].length === 3) {
                        // region
                        localeParts.push(parts[2].toUpperCase())
                    }
                }
            }
        }
    }

    return localeParts.join('-')
}

/**
 * Return current localae
 * @return {String}
 */
export const getLocale = () => {
    let out
    if (window.PalmSystem) {
        if (typeof (window.PalmSystem.locales) !== 'undefined' &&
            typeof (window.PalmSystem.locales.UI) !== 'undefined' &&
            window.PalmSystem.locales.UI.length > 0) {
            out = parseLocale(window.PalmSystem.locales.UI)
        } else if (typeof (window.PalmSystem.locale) !== 'undefined') {
            out = parseLocale(window.PalmSystem.locale)
        } else if (typeof (window.webOSSystem.locale) !== 'undefined') {
            out = parseLocale(window.webOSSystem.locale)
        } else {
            out = window.navigator.language || window.navigator.userLanguage || 'en-US'
        }
    } else {
        out = window.navigator.language || window.navigator.userLanguage || 'en-US'
    }
    return out
}

/**
 * Returno info about locale
 * @param {String} [locale]
 * @return {{language: String, region: String, spec: String}}
 */
export const getLocalInfo = (locale) => {
    locale = locale || getLocale()
    const [language, region] = locale.split('-')
    return {
        language,
        region,
        spec: locale
    }
}


/**
 * @param {String} code
 * @returns {String}
 */
const getLanguage = (code) => {
    if (code === 'off') { return $L('Disable') }
    const localeInfo = getLocalInfo()
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


const withI18nDecorator = (App) => {
    return (props) => {
        const [loading, setLoading] = useState(true)

        useEffect(() => {
            const loadTanslation = async () => {
                const localeInfo = getLocalInfo()
                await i18n.init({
                    resources: i18nImporter.resources,
                    lng: localeInfo.language,
                    fallbackLng: 'en',
                    interpolation: {
                        escapeValue: false,
                    },
                })
                for (const key of Object.keys(i18nImporter.resources)) {
                    regions.registerLocale(countries, i18nImporter.countries[key], i18nImporter.regions[key])
                    languages.registerLocale(i18nImporter.langs[key])
                }
                setLoading(false)
            }
            loadTanslation().catch(console.error)
        }, [])

        return (
            loading ?
                <div {...props} />
                :
                <App {...props} />
        )
    }
}

/**
 * Load Translation
 */
export const I18nDecorator = (App) => {
    return withI18nDecorator(App)
}
