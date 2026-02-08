
import fs from 'fs'
import path from 'path'
import gulp from 'gulp'
import { createHash } from 'node:crypto'
import { deleteAsync } from 'del'
import { exec } from 'child_process'
import packageJson from './package.json' with { type: 'json' }
import appInfo from './webos-meta/appinfo.json' with { type: 'json' }
import ilibmanifest from './resources/ilibmanifest.json' with { type: 'json' }


function handleError(cb) {
    return (err, stdout, stderr) => {
        if (stdout) { console.log(stdout) }
        if (stderr) { console.log(stderr) }
        if (err) { console.error(err) }
        cb(err)
    }
}

function installAppTv(cb, tv) {
    const tvStr = tv && '-d tv1' || ''
    exec(`ares-install ${tvStr} bin/${appInfo.id}_${packageJson.version}_all.ipk`, handleError(cb))
}

function cleanIlib(cb) {
    try {
        const fakeManifest = './resources/global_ilibmanifes.json'
        const realManifest = './node_modules/ilib/locale/ilibmanifest.json'
        const content = fs.readFileSync(fakeManifest, 'utf8')
        fs.writeFileSync(realManifest, content, 'utf8')
    } catch (err) {
        return handleError(cb)(err)
    }
    try {
        const filePath = 'node_modules/ilib/locale/es/dateformats.json'
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        content.gregorian.date.dmy = {
            "f": "dd 'de' MMMM 'de' yyyy",
            "l": "dd 'de' MMMM 'de' yyyy",
            "m": "dd MMM yyyy",
            "s": "dd/MM/yy"
        }
        fs.writeFileSync(filePath, JSON.stringify(content), 'utf8')
    } catch (err) {
        return handleError(cb)(err)
    }
    try {
        const filePath = './node_modules/@enact/moonstone/VideoPlayer/VideoPlayer.js'
        /** @type {String} */
        let fileContent = fs.readFileSync(filePath, 'utf-8')
        if (!fileContent.includes('crunchypatch')) {
            fileContent = fileContent.replace('_MediaSlider["default"], {',
                `_MediaSlider["default"], {
              duration: this.state.duration, // crunchypatch`
            );
            fileContent = fileContent.replace("'toggleControls']", "'toggleControls', 'activityDetected']");
            fs.writeFileSync(filePath, fileContent, 'utf-8')
        }
    } catch (err) {
        return handleError(cb)(err)
    }

    try {
        const filePath = './node_modules/@enact/moonstone/VideoPlayer/MediaSliderDecorator.js'
        /** @type {String} */
        let fileContent = fs.readFileSync(filePath, 'utf-8')
        if (!fileContent.includes('crunchypatch')) {
            // init state
            fileContent = fileContent.replace('tracking: false,',
                `tracking: false,
          duration: 0, // crunchypatch`
            );
            // setState
            fileContent = fileContent.replace('tracking: true,',
                `tracking: true,
          duration: this.props.duration, // crunchypatch`
            );
            // decrement
            fileContent = fileContent.replace('var _decrement = function decrement(state) {',
                `
// crunchypatch
var _jumpBy = 5
var _jumpByResetTimeout = null
var _jumpByDirection = 0
var _getJumpBySeconds = function _getJumpBySeconds (direction) {
    _jumpBy = _jumpByDirection !== direction ? 5 : _jumpBy
    var out = _jumpBy
    var restFn = function restFn() { _jumpBy = 5 }
    clearTimeout(_jumpByResetTimeout)
    _jumpByDirection = direction
    if (_jumpBy <= 5) {
        // nothing
    } else if (_jumpBy <= 10) {
        _jumpByResetTimeout = setTimeout(restFn, 2 * 1000)
    } else {
        _jumpByResetTimeout = setTimeout(restFn, 5 * 1000)
    }
    _jumpBy = Math.min(_jumpBy << 1, 30)
    return out
}
var _decrement = function decrement(state) {  // crunchypatch
    if (state.tracking && state.x > 0) {
        var x = Math.max(0, state.x - (_getJumpBySeconds(-1) / state.duration))
        return { x }
    }`.trim()
            );
            // _increment
            fileContent = fileContent.replace('var _increment = function increment(state) {',
                `
var _increment = function increment(state) {  // crunchypatch
    if (state.tracking && state.x < 1) {
        const x = Math.min(1, state.x + (_getJumpBySeconds(1) / state.duration))
        return { x }
    }`.trim()
            );
            fs.writeFileSync(filePath, fileContent, 'utf-8')
        }
    } catch (err) {
        return handleError(cb)(err)
    }

    try {
        const filePath = 'src/views/DeveloperPanel.js'
        /** @type {String} */
        let fileContent = fs.readFileSync(filePath, 'utf-8')
        const versionLine = `                        <BodyText className='app-version'>{$L('Version') + ' ${packageJson.version}'} </BodyText>`
        fileContent = fileContent.replace(/^.*app-version.*$/m, versionLine);
        fs.writeFileSync(filePath, fileContent, 'utf-8')
    } catch (err) {
        return handleError(cb)(err)
    }

    try {
        exec('npx which enact', { encoding: 'utf-8' }, (err, cliPath) => {
            if (err) { throw err }
            cliPath = cliPath.split('/').slice(0, -2).join('/') + '/lib/node_modules/@enact/cli'
            const packageContent = JSON.parse(fs.readFileSync(`${cliPath}/package.json`, 'utf8'))
            if (packageContent.version === '7.2.1') {
                /** @type {String} */
                let fileContent = fs.readFileSync(`${cliPath}/commands/serve.js`, 'utf-8')
                if (!fileContent.includes('compiler.hooks.failed')) {
                    fileContent = fileContent.replace('compiler.hooks.afterEmit.tapAsync', `
        compiler.hooks.failed.tap('EnactCLI', (err) => {
            devServer.invalidate();     // ← permite recargar
            console.error(err);      // ← muestra el error
        });
        compiler.hooks.afterEmit.tapAsync`
                    )
                    fs.writeFileSync(`${cliPath}/commands/serve.js`, fileContent, 'utf-8')
                }
            }
        })
    } catch (err) {
        return handleError(cb)(err)
    }

    cb()
}

function copyIn18(cb) {
    try {
        const libs = ['i18n-iso-countries', 'i18n-iso-m49', '@cospired/i18n-iso-languages']
        for (const file of ilibmanifest.files) {
            const lang = file.split('/')[0]
            for (const lib of libs) {
                const jsonPath = `node_modules/${lib}/langs/${lang}.json`
                if (fs.existsSync(jsonPath)) {
                    const targetJsonPath = `./dist/${jsonPath}`
                    const targetDir = path.dirname(targetJsonPath)

                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true })
                    }
                    fs.copyFileSync(jsonPath, targetJsonPath)
                } else {
                    console.error('lang not found -> ' + jsonPath)
                }
            }
        }
        cb()
    } catch (err) {
        handleError(cb)(err)
    }
}

function generateManifest(cb) {
    try {
        const ipkName = `${appInfo.id}_${appInfo.version}_all.ipk`
        if (!fs.existsSync(`./bin/${ipkName}`)) {
            throw new Error('ipk not found.')
        }
        const ikpFile = fs.readFileSync(`./bin/${ipkName}`)
        const hash = createHash('sha256')
        hash.update(ikpFile)

        const out = {
            id: appInfo.id,
            version: packageJson.version,
            type: 'web',
            title: appInfo.title,
            appDescription: packageJson.description,
            iconUri: 'https://raw.githubusercontent.com/ediaz23/crunchyroll-webos-stream/master/webos-meta/icon-large.png',
            sourceUrl: packageJson.repository,
            rootRequired: false,
            ipkUrl: ipkName,
            ipkHash: {
                sha256: hash.digest('hex')
            }
        }
        for (const key of Object.keys(out)) {
            if (!(out[key] != null)) {
                throw new Error(`key ${key} is not define`)
            }
        }
        if (!out.ipkHash.sha256) {
            throw new Error('key sha256 is not define')
        }
        fs.writeFileSync('./bin/org.webosbrew.manifest.json', JSON.stringify(out, null, '    '), { encoding: 'utf-8' })
        cb()
    } catch (err) {
        handleError(cb)(err)
    }
}

function updateAppInfo(cb) {
    try {
        if (packageJson.version !== appInfo.version) {
            appInfo.version = packageJson.version
        }
        fs.writeFileSync('./webos-meta/appinfo.json', JSON.stringify(appInfo, null, '    ') + '\n',
            { encoding: 'utf-8' })
        cb()
    } catch (err) {
        handleError(cb)(err)
    }
}


gulp.task('clean-ilib', cleanIlib)

gulp.task('gulp-postinstall', gulp.series('clean-ilib'))

gulp.task('copy-in18', copyIn18)

gulp.task('license', cb => {
    try {
        fs.copyFileSync('./LICENSE', './bin/LICENSE')
        cb()
    } catch (err) {
        handleError(cb)(err)
    }
})

gulp.task('manifest', generateManifest)

gulp.task('clean', () =>
    deleteAsync('bin/**', { force: true })
        .then(deleteAsync('dist/**', { force: true }))
)

gulp.task('pack', cb => { exec('npm run pack', handleError(cb)) })
gulp.task('pack-p', cb => { exec('npm run pack-p', handleError(cb)) })
// webpack agrega __webpack_require__ al código, lo más fácil fue limpiarlo así.
gulp.task('pack-p-fix', cb => {
    exec(`
        for f in dist/chunk*.js;
        do
            sed -i 's/__webpack_require__\.ilib_cache_id="[^"]*";//g' "$f";
        done`.trim(),
        handleError(cb)
    )
})

gulp.task('installService', cb => { exec('NODE_ENV=development npm ci --prefix=./service', handleError(cb)) })

gulp.task('buildService', cb => { exec('npm run build --prefix=./service', handleError(cb)) })
gulp.task('buildService-p', cb => { exec('npm run build-p --prefix=./service', handleError(cb)) })

gulp.task('app', cb => { exec('ares-package --no-minify dist/ ./service/dist -o bin/', handleError(cb)) })
gulp.task('app-p', cb => { exec('ares-package dist/ ./service/dist -o bin/', handleError(cb)) })

gulp.task('install-app-tv1', cb => { installAppTv(cb, true) })
gulp.task('install-app', cb => { installAppTv(cb, false) })

gulp.task('cleanService', () => deleteAsync('service/dist/**', { force: true }))

gulp.task('update-appinfo', updateAppInfo)

gulp.task('build', gulp.series('clean', 'update-appinfo', 'pack', 'copy-in18'));
gulp.task('build-service', gulp.series('installService', 'buildService'))

gulp.task('build-dev', gulp.series('clean', 'update-appinfo', 'pack', 'copy-in18',
    'installService', 'buildService', 'app', 'cleanService'));

gulp.task('build-p', gulp.series('clean', 'update-appinfo', 'pack-p', 'copy-in18',
    'installService', 'buildService-p', 'app-p', 'cleanService', 'manifest', 'license'));

export default gulp
