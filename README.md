# 快速开始

`tnpm i`

`npm run dev `

提供模板快速创建功能，见后面gulp new  

可在gulpfile.js中用aliasWords配置js路径别名  



优化了npm依赖的处理，精简了dist目录，提升了速度  



TODO:    

修复有时串行task执行后没变化（或删除），需要手动重新编译相关内容    



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

gulp lodash    修复微信小程序不能使用lodash的问题，实质是修改编译后dist中的vendor.js文件

gulp new -p pageName    在当前路径下新建一个page，路径自动加入app.json
gulp new -np pageName   同上，但是page没有目录包裹
gulp new -c componentName   在当前路径下新建一个component
gulp new -nc componentName  同上，component没有目录包裹