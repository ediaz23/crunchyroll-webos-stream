
const fs = require('fs')

const prevTranslation = {}

const config = {
    input: [
        './src/**/*.js',
    ],
    output: './resources',
    options: {
        debug: false,
        func: {
            list: ['$L'],
            extensions: ['.js']
        },
        lngs: ['en', 'es'],
        ns: ['strings'],
        defaultLng: 'en',
        defaultNs: 'strings',
        resource: {
            loadPath: '{{lng}}/{{ns}}.json',
            savePath: '{{lng}}/{{ns}}.json',
            jsonIndent: 4,
            lineEnding: '\n'
        },
        nsSeparator: false, // namespace separator
        keySeparator: false, // key separator
        metadata: {},
        allowDynamicKeys: false,
        removeUnusedKeys: true,
        sort: true,
        defaultValue: function(lng, ns, key) {
            key = key.replace(/\n/g, '')
            if (lng === 'en') {
                return key
            } else {
                if (prevTranslation[lng][key]) {
                    return prevTranslation[lng][key]
                }
            }
            return ''
        },
    },
    transform: function(file, enc, done) {
        'use strict';
        const parser = this.parser
        const content = fs.readFileSync(file.path, enc)
        parser.parseFuncFromString(content, (key, options) => {
            const newKey = key.replace(/\n/g, '')
            parser.set(newKey, options)
            if (newKey !== key) {
                for (const lang of parser.options.lngs) {
                    delete parser.resStore[lang][parser.options.defaultNs][key]
                    delete parser.resScan[lang][parser.options.defaultNs][key]
                }
            }
        })
        done()
    }
}

for (const lang of config.options.lngs) {
    const file = `${config.output}/${lang}/${config.options.defaultNs}.json`
    prevTranslation[lang] = {}
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8')
        prevTranslation[lang] = JSON.parse(content)
    }
}

module.exports = config
