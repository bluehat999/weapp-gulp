const fs = require('fs')
const gulp = require('gulp')
const plumber = require('gulp-plumber')
const clean = require('gulp-clean')
const rename = require('gulp-rename')
const replace = require('gulp-replace')
const notify = require('gulp-notify');
const babel = require('gulp-babel');
const tap = require('gulp-tap')
const path = require('path')
const sass = require('gulp-sass')
const minimist = require('minimist')

const browserify = require('browserify');
const buffer = require('gulp-buffer');
const sourcemaps = require('gulp-sourcemaps');
const babelify = require('babelify');


const SRCROOT = 'src'
const SRC = './src/**/'
const DIST = './dist/'

const WXML = [`${SRC}*.wxml`]
const SASS = [`${SRC}*.{scss,scss,wxss}`]
const _JSON = [`${SRC}*.json`]
const JS = [`${SRC}*.js`]
const WXS = [`${SRC}*.wxs`]
const IMG = [`${SRC}*.{png,jpg,ico,svg,gif}`]
const CLEAN = [DIST + '*', `!${DIST}miniprogram_npm`, `!${DIST}node_modules`]
//存放variable和mixin的sass文件在被引用时直接导入，不引入dist目录中
const DIRECTIMPORT = ['styles', 'font']
//alias的路径是相对SRCROOT的路径
const aliasWords = ['utils', 'config','pages','component'] 


const onError = function (err) {
    notify.onError({
        title: "Gulp",
        subtitle: "Failure!",
        message: "Error: <%= error.message %>",
        sound: "Beep"
    })(err);

    this.emit('end');
};

/* 处理lodash与微信小程序配置不兼容问题 */
const wxappLodash = done => {
    const vendorFile = `${DIST}utils/vendor.js`
    const oldRoot = "var root=freeGlobal||freeSelf||Function('return this')();"
    const newRoot = `/**${oldRoot}**/ var root = {
        Array: Array,
        Date: Date,
        Error: Error,
        Function: Function,
        Math: Math,
        Object: Object,
        RegExp: RegExp,
        String: String,
        TypeError: TypeError,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval
      };`
    fs.exists(vendorFile, (ex) => {
        if (ex) {
            gulp.src(vendorFile).pipe(tap(file => {
                file.contents = new Buffer(String(file.contents).replace(oldRoot,newRoot))
            })).pipe(gulp.dest(vendorFile.replace('vendor.js','')))
        }
    })
    done()
}
gulp.task('lodash',wxappLodash)

const wxappModules = () =>{
    const modules = ['./node_modules/**/*','./package.json']
    gulp.src([`${DIST}node_modules/**/*`,`${DIST}package.json`], { read: false, allowEmpty: true }).pipe(clean())
    gulp.src(modules, { since: gulp.lastRun(wxappModules) })
    .pipe(plumber({ errorHandler: onError }))
    .pipe(gulp.dest(DIST+'/node_modules'))
    done()
}
gulp.task('modules',gulp.series(wxappModules))

/* 处理文件和图片 */

const f_wxml = done => {
    gulp.src(WXML, { since: gulp.lastRun(f_wxml) })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(gulp.dest(DIST))
    done()
}
gulp.task('wxml', f_wxml)

const f_sass = done => {
    gulp.src([...SASS,...DIRECTIMPORT.map(item => `!${SRC}${item}/**/*`)], 
                    { since: gulp.lastRun(f_sass) ,allowEmpty:true})
        .pipe(plumber({ errorHandler: onError }))
        .pipe(tap((file) => {
            const filePath = path.dirname(file.path);
            file.contents = new Buffer(
                String(file.contents)
                .replace(/@import\s+['|"](.+)['|"];/g, ($1, $2) => {
                    const imPath = path.resolve(filePath + '/' + $2)    
                    return DIRECTIMPORT.some( item => { return imPath.indexOf(item) > -1} ) ? $1 : `/** ${$1} **/`
            })
            )
        }))
        .pipe(sass())
        .pipe(replace(/(\/\*\*\s{0,})(@.+)(\s{0,}\*\*\/)/g, ($1, $2, $3) => $3.replace(/\.scss/g, '.wxss')))
        .pipe(rename({ extname: '.wxss' }))
        .pipe(gulp.dest(DIST))
    done()
}
gulp.task('sass', f_sass)

const f_json = done => {
    gulp.src(_JSON, { since: gulp.lastRun(f_json) })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(gulp.dest(DIST))
    done()
}
gulp.task('json', f_json)

//处理原有项目中js里的的一些alias
const replaceAlias = (fileContent,filePath) => {
    fileContent && aliasWords.forEach(item => {
        fileContent = fileContent.replace(new RegExp(`from\\s('|")((${item})\/\\S*)('|")`,'g'),($1,$2,$3,$4) => {
            let absolute = path.resolve(__dirname, `\.\\${SRCROOT}\\${$3}`) 
            let relative = path.relative(filePath, absolute).replace(/\\/g,'/')
            relative = relative.startsWith('.')?relative:'./'+relative
            return `from '${relative}'`
        })
    })
    return fileContent
}
const f_js = done => {
    gulp.src(JS, { since: gulp.lastRun(f_js) })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(tap((file) => {
            const filePath = path.dirname(file.path);
            const filter = ['node_modules']

            if (file.basename=='runtime.js' ||!file.contents || filter.some(item =>{
                return filePath.indexOf(item) != -1 
            })) return

            //处理微信小程序不支持async await 的问题
            let absoluteAsync = path.resolve(__dirname, `\.\\${SRCROOT}\\utils\\runtime.js`)
            let relativeAsync = path.relative(filePath, absoluteAsync)
            let importAsync = (relativeAsync.startsWith('.')?relativeAsync:'./'+relativeAsync).replace(/\\/g,'/')
            importAsync = `import regeneratorRuntime from '${importAsync}';\r\n`
            let content = String(file.contents)
            content =  (content.indexOf('async')>-1||content.indexOf('await')>-1) ? importAsync+content : content 
            //处理原有项目中的一些alias
            file.contents = new Buffer( replaceAlias(content,filePath) )          
        }))
        .pipe(gulp.dest(DIST))
    done()
}
gulp.task('js', f_js)

const f_vendor = done => {
    gulp.src('src/utils/vendor.js', {read: false})
      .pipe(tap(function (file) {
        console.log(`bundling ${file.path}`);
        file.contents = browserify(file.path, {
          debug: true,
          standalone: 'vendor'
        })
        .transform(babelify, { global: true,
                     presets: ["@babel/preset-env"],
                     plugins: ['@babel/plugin-transform-modules-commonjs'] })
          .bundle();
      }))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(`${DIST}/utils`));  
      done()
  }
gulp.task('vendor', gulp.series(f_vendor,'lodash'));

const f_wxs = done => {
    gulp.src(WXS, { since: gulp.lastRun(f_wxs) })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(babel({//处理原生微信小程序wxs基于ES5
            presets: ['@babel/preset-env']
        }))
        .pipe(rename({ extname: '.wxs' }))
        .pipe(gulp.dest(DIST))
    done()
}
gulp.task('wxs', f_wxs)

const f_img = done => {
    gulp.src(IMG, { since: gulp.lastRun(f_img) })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(gulp.dest(DIST))
    done()
}
gulp.task('img', f_img)

/* 清除dist目录 */
gulp.task('clean', done => {
    gulp.src(CLEAN, { read: false, allowEmpty: true }).pipe(clean())
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

gulp.task('build', gulp.series('clean', gulp.parallel('wxml', 'json', 'sass', 'js', 'wxs', 'img'),'vendor'))

gulp.task('dev', gulp.series('clean', gulp.parallel('wxml', 'json', 'sass', 'js', 'wxs', 'img'),'vendor', 'watch'))

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
    let tempPath = p ? './.template/page/*' : './.template/component/*'
    let stream = gulp.src(tempPath)
    let words = p ? 'page' : 'component'
    console.log(Path + '/' + baseName)
    console.log(`>>>>正在创建${words}`)
    //将页面路径写入app.json
    if (p) {
        console.log(p)
        gulp.src(`./${SRCROOT}/app.json`)
            .pipe(tap(file =>{
                let content = JSON.parse(String(file.contents))
                content.pages.push(`${Path.split(SRCROOT + "/").pop()}/${baseName}`)
                file.contents = new Buffer(JSON.stringify(content,undefined,'\t'))
            }))
            .pipe(gulp.dest(`./${SRCROOT}/`))
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
    stream.pipe(gulp.dest(Path))
    done()
})

