# vue-demo

> A Vue.js project

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

For detailed explanation on how things work, checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).





webpack.dev.js:webpack的本地配置文件（不需要上传）
package.json:node的所有插件的配置文件，到这个文件的目录下，直接npm install，就能把所有的需要的插件放到node_modules文件夹下
node_modules:node模块,包含了grunt，webpack，还有这两个打包工具用到的插件等

vue-demo项目
        gruntfile.js:grunt打包配置文件
        .gitignor:git提交的时候需要忽略的文件
        webpack.config.js:webpack配置文件(需要上传)
        build:src经过转义后的文件夹
        dest：压缩好以后的文件
        mock：模拟请求
        src:原始文件夹
        		assets:图片+样式+icon font
                images:图片
                styles：样式
        		
            pages：.vue文件 (对应各个网页的js，vue，html文件；每个页面都包含三个文件)
        		store：(只为了生成一个新vuex的store，里面包含了actions和mutations)
                store文件（例如index.store.js）中包括了index页面对应的action，mutations，然后用vuex把store封装成一个支持vuex去管理状态的新store
        		
            components:项目内的组件（零碎的vue组件，多个零碎的vue组件合成一个网页的vue组件）

common项目：多个项目通用的common文件夹，他有一个单独的git仓库，每次项目提交之前，得先把common这个公共仓库代码拉下来，保持最新
                          （common不和其他项目并行，而是包含在里面，，因为webpack会使用common文件夹内的文件，但是webpack又是以项目为单位，在项目文件夹下，
                          所以如果common和项目平级，就拿不到common里面的内容了）
            utils:通用文件，例如cookie操作，埋点js，通用的ajax请求基础url等
            libs：第三方js仓库
            styles:所有项目公共的css
            componnet：所有项目公用的组件
            include：所有项目公用的头部，底部等html文件




打包命令：
    npm start ：启动热替换，修改内容就自动刷新页面