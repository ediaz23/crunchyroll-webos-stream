module.exports = function(api) {
    const enactBabel = require('babel-preset-enact');
    const out = enactBabel(api)
    out.presets[0][1].targets = {
        browsers: [
            'chrome 38'
        ]
    }
    out.plugins = [
        ...out.plugins,
        require('@babel/plugin-transform-modules-commonjs').default,
        require('@babel/plugin-transform-runtime').default,
    ]
    out.sourceMaps = true // Habilita los mapas de origen
    return out
}
