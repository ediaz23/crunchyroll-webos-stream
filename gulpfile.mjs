
import fs from 'fs'
import path from 'path'
import gulp from 'gulp'
import crypto from 'crypto'
import { deleteAsync } from 'del'
import { exec } from 'child_process'
import packageJson from './package.json' assert { type: 'json' }
import appInfo from './webos-meta/appinfo.json' assert { type: 'json' }
import ilibmanifest from './resources/ilibmanifest.json' assert { type: 'json' }


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
        cb()
    } catch (err) {
        handleError(cb)(err)
    }
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
        const hash = crypto.createHash('sha256')
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
        fs.writeFileSync('./bin/org.webosbrew.manifest.json', JSON.stringify(out, null, '    '),
            { encoding: 'utf-8' })
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

gulp.task('copy-in18', copyIn18)

gulp.task('license', cb => {
    try {
        fs.copyFileSync('./LICENSE', './bin/LICENSE')
        cb()
    } catch(err) {
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

gulp.task('installService', cb => { exec('NODE_ENV=development npm install --prefix=./service', handleError(cb)) })

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
