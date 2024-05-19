
import fs from 'fs'
import path from 'path'
import gulp from 'gulp'
import crypto from 'crypto'
import { deleteAsync } from 'del'
import { exec } from 'child_process'


gulp.task('clean-ilib', (cb) => {
    try {
        const fakeManifest = './resources/global_ilibmanifes.json'
        const realManifest = './node_modules/ilib/locale/ilibmanifest.json'
        const content = fs.readFileSync(fakeManifest, 'utf8')
        fs.writeFileSync(realManifest, content, 'utf8')
        cb()
    } catch (err) {
        console.error(err)
        cb(err)
    }
})

gulp.task('copy-in18', (cb) => {
    try {
        const libs = ['i18n-iso-countries', 'i18n-iso-m49', '@cospired/i18n-iso-languages']
        const manifest = './resources/ilibmanifest.json'
        /** @type {{files: Array<String>}} */
        const content = JSON.parse(fs.readFileSync(manifest, 'utf8'))
        for (const file of content.files) {
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
        console.error(err)
        cb(err)
    }
})

gulp.task('manifest', cb => {
    try {
        const appinfo = JSON.parse(fs.readFileSync('./webos-meta/appinfo.json', 'utf8'))
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
        const ipkName = `${appinfo.id}_${appinfo.version}_all.ipk`
        if (appinfo.version !== packageJson.version) {
            throw new Error('appinfo and manifest version mismatch.')
        }
        if (!fs.existsSync(`./bin/${ipkName}`)) {
            throw new Error('ipk not found.')
        }
        const ikpFile = fs.readFileSync(`./bin/${ipkName}`)
        const hash = crypto.createHash('sha256')
        hash.update(ikpFile)

        const out = {
            id: appinfo.id,
            version: appinfo.version,
            type: 'web',
            title: appinfo.title,
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
        console.error(err)
        cb(err)
    }
})

gulp.task('clean', () =>
    deleteAsync('bin/**', { force: true })
        .then(deleteAsync('dist/**', { force: true }))
)

gulp.task('pack', cb => {
    exec('npm run pack', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        if (err) { console.error(err) }
        cb(err)
    })
})

gulp.task('pack-p', cb => {
    exec('npm run pack-p', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        if (err) { console.error(err) }
        cb(err)
    })
})

gulp.task('installService', cb => {
    exec('NODE_ENV=development npm install --prefix=./service', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        if (err) { console.error(err) }
        cb(err)
    })
})

gulp.task('buildService', cb => {
    exec('npm run build --prefix=./service', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        if (err) { console.error(err) }
        cb(err)
    })
})

gulp.task('buildService-p', cb => {
    exec('npm run build-p --prefix=./service', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        if (err) { console.error(err) }
        cb(err)
    })
})

gulp.task('app', cb => {
    exec('ares-package --no-minify dist/ ./service/dist -o bin/', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        if (err) { console.error(err) }
        cb(err)
    })
})

gulp.task('app-p', cb => {
    exec('ares-package dist/ ./service/dist -o bin/', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        if (err) { console.error(err) }
        cb(err)
    })
})

gulp.task('cleanService', () => deleteAsync('service/dist/**', { force: true }))

gulp.task('build', gulp.series('clean', 'pack', 'app'));
gulp.task('build-service', gulp.series('installService', 'buildService'))
gulp.task('build-dev', gulp.series('clean', 'pack', 'copy-in18', 'installService', 'buildService', 'app', 'cleanService'));
gulp.task('build-p', gulp.series('clean', 'pack-p', 'copy-in18', 'installService', 'buildService-p', 'app-p', 'cleanService', 'manifest'));


export default gulp
