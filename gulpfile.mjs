
import gulp from 'gulp'
import { deleteAsync } from 'del'
import { exec } from 'child_process'


gulp.task('clean', () =>
    deleteAsync('bin/**', { force: true })
        .then(deleteAsync('dist/**', { force: true }))
)

gulp.task('pack', cb =>
    exec('npm run pack', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        cb(err)
    })
)

gulp.task('pack-p', cb =>
    exec('npm run pack-p', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        cb(err)
    })
)

gulp.task('installService', cb => {
    exec('npm install --prefix=./service', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        cb(err)
    })
})

gulp.task('buildService', cb => {
    exec('npm run build --prefix=./service', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        cb(err)
    })
})

gulp.task('buildService-p', cb => {
    exec('npm run build-p --prefix=./service', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        cb(err)
    })
})

gulp.task('app', cb => {
    exec('ares-package dist/ ./service/dist -o bin/', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
        cb(err)
    })
})

gulp.task('cleanService', () => deleteAsync('service/dist/**', { force: true }))

gulp.task('build', gulp.series('clean', 'pack', 'app'));
gulp.task('build-service', gulp.series('installService', 'buildService'))
gulp.task('build-dev', gulp.series('clean', 'pack', 'installService', 'buildService', 'app', 'cleanService'));
gulp.task('build-p', gulp.series('clean', 'pack-p', 'installService', 'buildService-p', 'app', 'cleanService'));

export default gulp
