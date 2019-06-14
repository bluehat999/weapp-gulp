# 快速开始

`tnpm i`

`npm run build `

微信开发者工具中->工具->构建npm

`gulp lodash `处理构建后的npm小程序包，使小程序支持lodash

`npm run dev` 或者 `gulp dev` 打开watch，自动监听文件



  项目地址：https://github.com/bluehat999/weapp-gulp

  文章地址：https://www.cnblogs.com/mthz/p/weapp-gulp.html




## gulp tasks
安装好依赖后

可用gulp 任务有：

gulp build

gulp dev

gulp watch

gulp json 

gulp js

gulp wxs 

gulp wxml

gulp sass

gulp modules    将node_modules复制到小程序dist根目录，从而方便开发者工具构建npm

gulp lodash    修复微信小程序不能使用lodash的问题，在build后开发者工具中构建过Npm后使用

gulp new -p pageName    在当前路径下新建一个page，路径自动加入app.json
gulp new -np pageName   同上，但是page没有目录包裹
gulp new -c componentName   在当前路径下新建一个component
gulp new -nc componentName  同上，component没有目录包裹
