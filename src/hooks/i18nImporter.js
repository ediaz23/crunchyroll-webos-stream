
// traductions
import enTraductions from '../../resources/en/strings.json'
import esTraductions from '../../resources/es/strings.json'

// langs
import enLang from '@cospired/i18n-iso-languages/langs/en.json'
import esLang from '@cospired/i18n-iso-languages/langs/es.json'

// country
import enCoutries from 'i18n-iso-countries/langs/en.json'
import esCoutries from 'i18n-iso-countries/langs/es.json'

import enRegions from 'i18n-iso-m49/langs/en.json'
import esRegions from 'i18n-iso-m49/langs/es.json'


export default {
    resources: {
        en: { translation: enTraductions },
        es: { translation: esTraductions },
    },
    langs: {
        en: enLang,
        es: esLang,
    },
    countries: {
        en: enCoutries,
        es: esCoutries,
    },
    regions: {
        en: enRegions,
        es: esRegions,
    }
}
