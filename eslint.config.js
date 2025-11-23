
const enactConfig = require('eslint-config-enact')

for(const key of enactConfig) {
    if (key.ignores) {
        key.ignores = [
            ...key.ignores,
            "service/*",
            "libs/*",
            "src/components/player/dash*.js"
        ]
    }
}

module.exports = enactConfig