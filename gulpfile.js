const fs = require('fs')
const gulp = require('gulp')
const plumber = require('gulp-plumber')
// const newer = require('gulp-newer')
// const clean = require('gulp-clean')
// const zip = require('gulp-zip')
const del = require('del')
const rename = require('gulp-rename')
const replace = require('gulp-replace')
// const imagemin = require('gulp-imagemin')
// const pngquant = require('gulp-pngquant')
const notify = require('gulp-notify');
// const eslint = require('gulp-eslint')
const sass = require('gulp-sass')
const minimist = require('minimist')
// tnpm i -S gulp gulp-plumber del gulp-rename gulp-notify gulp-sass minimist gulp-eslint gulp-imagemin
const onError = function (err) {
    notify.onError({
        title: "Gulp",
        subtitle: "Failure!",
        message: "Error: <%= error.message %>",
        sound: "Beep"
    })(err);

    this.emit('end');
};

const SRCROOT = 'src'
const SRC = './src/**/'
const DIST = './dist/'

const WXML = [`${SRC}*.wxml`, `!${SRC}_template/*.wxml`]
const SASS = [`${SRC}*.{scss,wxss}`, `!${SRC}_template/*.{sass,scss,wxss}`]
const _JSON = [`${SRC}*.json`, `!${SRC}_template/*.json`]
const JS = [`${SRC}*.js`, `!${SRC}_template/*.js`]
const WXS = [`${SRC}*.wxs`, `!${SRC}_template/*.wxs`]
const IMG = [`${SRC}assets/images/*.{png,jpg,ico}`, `${SRC}assets/image/*.{png,jpg,ico}`]

/* 处理文件和图片 */
const f_wxml = done => {
    return gulp.src(WXML, { since: gulp.lastRun(f_wxml) })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(gulp.dest(DIST))
}
gulp.task('wxml', f_wxml)

const f_sass = done => {
    const regImport = /@import\s['|"](.+)(sass|scss|wxss)['|"];/g
    const regRImport = /\/*@import\s['|"](.+)[sass|scss|wxss]['|"];*\//g
    return gulp.src(SASS, { since: gulp.lastRun(f_sass) })
        .pipe(plumber({ errorHandler: onError }))
        // .pipe(replace(regImport,($1) =>
        // {   console.log($1)
        //     return `\/*${$1}*\/` }))
        .pipe(sass())
        .pipe(rename({ extname: '.wxss' }))
        //.pipe(replace(/[\.scss|\.sass|\.wxss]/g,'.wxss'))        //修改引用时的后缀
        // .pipe(replace(regRImport,($1) => {
        //     console.log("@@@@@@@@@",$1)
        //     return $1.slice(2,$1.length-2)
        // }))     
        .pipe(gulp.dest(DIST))
}
gulp.task('sass', f_sass)

const f_json = done => {
    return gulp.src(_JSON, { since: gulp.lastRun(f_json) })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(gulp.dest(DIST))
}
gulp.task('json', f_json)

const f_js = done => {
    return gulp.src(JS, { since: gulp.lastRun(f_js) })
        .pipe(plumber({ errorHandler: onError }))
        // .pipe(eslint())
        // .pipe(eslint.format())
        .pipe(gulp.dest(DIST))
}
gulp.task('js', f_js)

const f_wxs = done => {
    return gulp.src(WXS, { since: gulp.lastRun(f_wxs) })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(gulp.dest(DIST))
}
gulp.task('wxs', f_wxs)

const f_img = done => {
    return gulp.src(IMG, { since: gulp.lastRun(f_img) })
        .pipe(plumber({ errorHandler: onError }))
        // .pipe(imagemin({
        //     progressive: true,
        //     svgoPlugins: [{
        //         removeViewBox: false
        //     }],
        //     use: [pngquant({
        //         quality: '100'
        //     })]
        // }))
        .pipe(gulp.dest(DIST))
}
gulp.task('img', f_img)

/* 清除dist目录 */
gulp.task('clean', done => {
    del.sync(DIST + '**/*')
    done()
})

/* zip */

/* watch */
gulp.task('watch', done => {
    gulp.watch(WXML, f_wxml)
    gulp.watch(SASS, f_sass)
    gulp.watch(_JSON, f_json)
    gulp.watch(JS, f_js)
    gulp.watch(WXS, f_wxs)
    gulp.watch(IMG, f_img)
})

gulp.task('build', gulp.series('clean', gulp.parallel('wxml', 'json', 'sass', 'js', 'wxs', 'img')))

gulp.task('dev', gulp.series(gulp.parallel('wxml', 'json', 'sass', 'js', 'wxs', 'img'), 'watch'))

//使用模板新建component或者page
gulp.task('new', done => {
    const args = minimist(process.argv.slice(2), {
        boolean: ['n', 'H'],
        string: ['env', 'p', 'c'],
        default: { env: process.env.NODE_ENV || 'dev' }
    })
    const currentPath = process.env.INIT_CWD.split(SRCROOT + '\\').pop().replace(/\\/g, '/')

    let { p, c, n, H } = args
    p = (p == '' ? 'newPage' : p)
    c = (c == '' ? 'newComponent' : c)

    //帮助
    if (H) {
        console.log("\n>>>>glup new -p pagename : 创建page ")
        console.log(">>>>glup new -c componentname : 创建component ")
        console.log(">>>>glup new -np|nc tname : 创建不含文件夹的page或者component\n")
        done();
        return;
    }

    let Path = SRC.split('**')[0] + currentPath
    let baseName = p || c || 'index'
    let tempPath = SRC.split('**')[0] + (p ? 'pages/.template/*' : 'component/.template/*')
    let stream = gulp.src(tempPath)
    let words = p ? 'page' : 'component'
    console.log(Path + '/' + baseName)
    console.log(`>>>>正在创建${words}`)
    //将页面路径写入app.json
    if (p) {
        gulp.src('./src/app.json')
            .pipe(replace(/"pages":\[([^\]])*\]/, ($1) => {
                return $1.replace(/\]/, `\t,"${Path.split(SRCROOT + "/").pop()}/${baseName}"\n\r\]`)
            }))
            .pipe(gulp.dest('./src/'))
    }
    if (n) {
        stream = stream.pipe(rename({
            basename: baseName,
        }))
        fs.exists(`${Path}/${baseName}.wxml`, (ex) => {
            if (ex) {
                console.log(`>>>>当前路径已存在名为${baseName}.wxml的文件`)
                return;
            }
        })
    } else {
        Path += '/' + baseName
        fs.exists(Path, (ex) => {
            if (ex) {
                console.log(`>>>>当前路径已存在名为${baseName}的文件夹`)
                return;
            }
        })
    }
    return stream.pipe(gulp.dest(Path))
})
