module.exports = function(api) {
    const enactBabel = require('babel-preset-enact');
    const out = enactBabel(api)
    out.presets[0][1].targets = {
        chrome: '38'
    }
    out.presets[0][1].corejs = '3.39'
    out.presets[0][1].exclude = out.presets[0][1].exclude.filter(x => x !== 'transform-regenerator')
    const newPlugins = [
        require('@babel/plugin-transform-modules-commonjs').default,
        require('@babel/plugin-transform-runtime').default,
    ]
    out.plugins = [
        ...out.plugins.filter(plugin => {
            let out = true
            if(Array.isArray(plugin)) {
                out = !newPlugins.includes(plugin[0])
            } else {
                out = !newPlugins.includes(plugin)
            }
            return out
        }),
        ...newPlugins
    ]
    out.sourceMaps = true // Habilita los mapas de origen
    return out
}
