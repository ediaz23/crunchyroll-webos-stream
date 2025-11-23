module.exports = function(api) {
    const enactBabel = require('babel-preset-enact');
    const out = enactBabel(api)
    out.presets[0][1].targets = {
        chrome: '38'
    }
    out.presets[0][1].corejs = '3.39'
    out.presets[0][1].exclude = out.presets[0][1].exclude.filter(x => ![
        'transform-regenerator',
        process.env.REACT_APP_SERVING === 'true' ? 'web.url' : null,
        process.env.REACT_APP_SERVING === 'true' ? 'web.url-search-params' : null,
    ].includes(x))
    const newPlugins = [
        require('@babel/plugin-transform-modules-commonjs').default,
        require('@babel/plugin-transform-runtime').default,
    ]
    out.plugins = [
        ...out.plugins.filter(plugin => {
            let out2 = true
            if (Array.isArray(plugin)) {
                out2 = !newPlugins.includes(plugin[0])
            } else {
                out2 = !newPlugins.includes(plugin)
            }
            return out2
        }),
        ...newPlugins
    ]
    out.sourceMaps = process.env.GENERATE_SOURCEMAP !== 'false'
    return out
}
