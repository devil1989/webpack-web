/*
 author:chenjiajie
 date:2017/08/12
 description:webpack配置文件
 help guide：http://www.cnblogs.com/yxy99/p/5852987.html （比较详细的webpack资料）
 ie-8兼容：http://www.aliued.com/?p=3240

    "babel-preset-es2015": "^6.24.1", 会把import转化成 Object.DefineProperties【这个不兼容ie8,用require代替import】
    "babel-preset-stage-2": "^6.24.1",
 热插拔说明："webpack-dev-server --progress --colors --content-base vue-demo/build/ --config vue-demo/webpack.config.js",
        --content-base vue-demo/build/ 服务器基本路径，只有这个路径下的文件才能被浏览器访问，对应localhost:8080
        如果一开始没有build文件，需要先build一下，然后再执行webpack-dev-server

        webpack-dev-server产生的文件是在内存中，build文件夹内不会同步对应的修改

        webpack-dev-server好像是只监听webpack.config.js中entry入口下文件（如js、css等等）的变动，
        只有这些文件的变动才会触发实时编译打包与页面刷新，而对于不在entry入口下的html文件，却不进行监听与页面自动刷新。
        一旦入口修改，那么会执行2个操作，先在内存中重新执行webpack打包(注意，只是内存中)，然后再刷新页面
        webpack重新执行的时候，因为HtmlWebpackPlugin的原因，会重新生成html和对应新的js，css等文件，但是html重新生成的时候，
        因为HtmlWebpackPlugin会根据webpack的output.publicPath再html中插入对应的css和js，如果这个值设置的不对，就会导致热插拔失败，这个很关键
 */

//默认打webpack命令，执行的是该文件里面的内容
//如果想要执行其他配置，需要命令 webpack --config webpack.pro.js（其他配置文件）
var path = require('path');//webpack中自带的require，模块加载器
var webpack = require('webpack');
var process = require("process");//环境管理
var glob = require("glob");
var ExtractTextPlugin = require('extract-text-webpack-plugin');//css提取到单个文件
var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin"); // 提取公共模块
var CopyWebpackPlugin = require('copy-webpack-plugin'); // 拷贝文件
var HtmlWebpackPlugin = require('html-webpack-plugin'); // 自动写入将引用写入html
var isDev = (process.env.NODE_ENV === 'dev')?true:false;//set NODE_ENV=production&&webpack --progress --colors命令设置了production环境，并且执行了webpack
var isQa= (process.env.NODE_ENV === 'qa')?true:false;//qa环境
var isYz= (process.env.NODE_ENV === 'yz')?true:false;//yz环境
var isPro=(process.env.NODE_ENV === 'production')?true:false;
var filePathS=isDev?"build":'dest';
var filePath = "/"+filePathS;//编译打包路径
// var copyImageFromPath=__dirname + '/src/assets/images';//需要拷贝的文件路径
// var copyImageTargetPath=__dirname+filePath+'/assets/images';//目标文件生成路径
// var copyCssFromPath=__dirname + '/src/assets/styles';//需要拷贝的文件路径
// var copyCssTargetPath=__dirname+filePath+'/assets/styles';//目标文件生成路径
var config,entrysInfo;

////${env}
var publicPath=getPublishPath();//控制css和js路径灵活引用，该路径会自动添加到html中的src和href (qa,yz和线上服务端自动回复转化，不需要我这边处理)
var imagePath=filePathS+"/assets/images/";//html里面的图片路径
var hashLength=+new Date()+""+Math.floor(Math.random()*100000000000000);//url设置hash，用于去图片缓存
var devImagePath="url-loader?name="+imagePath+"[name].[ext]?hash="+hashLength+"&limit=2048";//本地开发时候的url-loader参数，css中的image的url路径=output.publicPath+imagePath+文件名-hash.图片文件后缀
var imagePublishPath=getPublishPath();//发布的时候，图片的基础路径（html的图片和css中的图片都是用这个路径，所以最好写完整的绝对路径，因为css和html不在同一个目录下） [图片和其他可以拆分]
var publishImagePath="url-loader?name="+imagePath+"[name].[ext]?hash="+hashLength+"&limit=1&publicPath="+imagePublishPath;//发布时候的url-loader参数,


function getPublishPath(){
    if(isQa){
        return "//qa";
    }
    else if(isYz){
        return "//yz";
    }else if(isDev){
        return "//localhost:8080/";
    }
    else if(isPro){
        return "//";
    }
}

// function getCssAndJsPublishPath(){//
//     if(isQa){
//         return "//qa";
//     }
//     else if(isYz){
//         return "//yz";
//     }else if(isDev){
//         return "//localhost:8080/";
//     }
//     else if(isPro){
//         return "//";
//     }
// }
function resolveEntry (globpath, suffix, context) {
    if (context) {
        globpath = path.join(context, globpath);
    }
    return glob.sync(globpath).reduce((prev, curr) => {
        var basename = path.basename(curr, suffix);
        prev[basename] = curr;
        return prev;
    }, {});
};

function getAllHtmlWebpackPlugin (){//多个页面入口，需要有新建多个HtmlWebpackPlugin插件对象
    var arr=[];
    entrysInfo=resolveEntry('./src/assets/js/*.js', '.js', __dirname);//resolveEntry('./scripts/!(ui|mock|_)*.js', '.js', __dirname);【可以忽略某些，也可以多选】
    /*entrysInfo的内容格式是
    {
        "common":"D:/myGit/VueWeb/backendsite/vue-demo/src/pages/common.js",//chunk的名称就是文件名（不包括后缀）
        "index":"D:/myGit/VueWeb/backendsite/vue-demo/src/pages/index.js"
    }*/
    var keys=Object.keys(entrysInfo)||[];
    
    keys.forEach(function(val){
        if(val.indexOf(".store")!=-1){//*.store.js不是入口，虽然也放在pages文件中，需要删除掉，没必要为它多创建一个插件对象
            return;
        }

        //html的图片，css，js，以及css中的图片和@import的css，他们的路径发包方式：
        //html生成后html里面自动插入的js=output.publicPath+output.filename(其实就是和output打包的输出路径一致)
        //html文件里面的css路径=output.publicPath+ExtractTextPlugin 的路径设置（因为css通过插件特殊处理了）
        //html里面的image路径,.css文件中的img的url路径=output.publicPath+图片在html中的路径src目录中的相对路径，因为这个原因，publicPath只能设置成和build，dest的父层；当然也可以重设url-loader的publicPath，例如publishImagePath这个变量
        //他的html-loader用的就是webpack的html-loader，包括压缩操作
        var configObj={//生成html （热插拔：配置1（没有这个动态生成html文件，热插拔无法正常监控））
            filename:__dirname+filePath+"/assets/pages/"+val+".html",//html放到哪个文件夹下
            template:__dirname+"/src/assets/pages/"+val+".html",//对应的html，必须制定，否则就产生一个内容为空，只有js引用的html文件
            chunks:["common",val],
            hash:true
        }
        arr.push(new HtmlWebpackPlugin(configObj));//该插件作用是按照入口的chunk名称，生成对应的html文件，该html文件可以指定对应的html（这个html文件中，会自动插入该chunk的js）
    });

    return arr;
}

var HtmlWebpackPluginArray=getAllHtmlWebpackPlugin();

var extraSass= new ExtractTextPlugin(filePathS+"/assets/styles/[name].css");//html里面的css路径=output.publicPath+这里设置的路径
            




var commonConfig = {
    devtool: '#source-map',
    context:__dirname,//工程路径，默认就是当前文件夹所在位置__dirname，这行是多余的，如果想更改工程路径起始位置，就在这里配置
    entry:entrysInfo,//源文件,具体的entry设置https://www.npmjs.com/package/webpack-glob-entry
    output: {//输出文件
        path: __dirname,//path指定了本地构建地址(打包后的输出路径)
        //publicPath:"/crm/ocean/",//publicPath指定的是构建后在html里src和href的路径的基础地址（HtmlWebpackPlugin这个插件就是用这个publicPath来生成对应的html）
        publicPath:publicPath,
        chunkFilename:filePathS+"/assets/js/[name].js",//没有在entry中列出来，却需要打包的文件的文件名，例如文件中的js的文件中require的js文件
        filename: filePathS+"/assets/js/[name].js"//文件打包后的名字
    },
    module: {//模块配置[用于文件的转化，例如es6，sass，less，coffee等转化](资源加载器，什么样的资源对应什么样的加载器，加载器后面支持？加参数，多个加载器之间用！来连接 （用于处理文件的转义）)
        loaders: [
            {
                test: /\.(png|jpg|gif)$/,

                //【path】获取的是html中图片的src再html所在的路径下，相对于publicPath的路径，[name]就是对应的图片的名称，这里用手动硬性指定
                //如果用"url-loader?name=[path]/[name]-[hash:5].[ext]&limit=2048",会自动拷贝图片，到对应目录，并且自动生成html中的图片url，但问题比较多
                // loader: "url-loader?name="+imagePath+"[name]-[hash:5].[ext]&limit=2048&publicPath=output/"//小于2kb的直接转为base64,指定对应的图片路径=publicPath+imagePath

                //路径不清楚可以看下面链接：http://blog.csdn.net/qq_38652603/article/details/73835153
                loader:isDev?devImagePath:publishImagePath//小于2kb的直接转为base64,指定对应的图片路径=publicPath+imagePath
            },
            // {//支持es6 [但是不支持ie8，坑了个爹啊]
            //      test: /\.js$/,//一个必须满足的条件
            //      exclude: /node_modules/,//不处理的文件
            //      loader: 'babel-loader',//用哪个加载器处理
            //      exclude: /(node_modules|bower_components)/,//千万别忘了指向否则会默认访问webpack下面的es2015，就报错了
            //      options: {//options
            //         presets: ['es2015']
            //         // plugins: [
            //         //     'transform-es3-member-expression-literals',
            //         //     'transform-es3-property-literals'
            //         // ]
            //     }
            // },
            {
                test: /\.js$/,
                use: [
                    {
                        loader: 'es3ify-loader'
                    },
                    {
                        loader: "babel-loader",
                        options: {
                            cacheDirectory: true
                        }
                    }
                ],
                exclude: /node_modules/
            },
            {
                test:/\.html$/,
                loader:'html-loader',
                options:{//,/(['"])https:\/\/[^'"]*\1/,/(['"])\/\/[^'"]*\1/
                    minimize: isDev?false:true
                    // ignoreCustomFragments: [/(['"])https:\/\/[^'"]*\1/],//忽略某些字段里面的选项，双括号一般是template里面的语法
                    // root: imageRoot,
                    // attrs: ['img:src']
                }
            },

            // {
            //     test: /\.((woff2?|svg)(\?v=[0-9]\.[0-9]\.[0-9]))|(woff2?|svg|jpe?g|png|gif|ico)$/,
            //     loaders: [
            //         //小于10KB的图片会自动转成dataUrl，
            //         'url?limit=10000&name=img/[hash:8].[name].[ext]',
            //         'image?{bypassOnDebug:true, progressive:true,optimizationLevel:3,pngquant:{quality:"65-80",speed:4}}'
            //     ]
            // },
            // {
            //     test: /\.((ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9]))|(ttf|eot)$/,
            //     loader: 'url?limit=10000&name=fonts/[hash:8].[name].[ext]'
            // },

            //该设置，只支持scss文件的热插拔，css文件还未支持，待优化
            {
                test: /\.(scss|sass|css)$/,  //.scss|sass|css文件使用 style-loader css-loader 和 sass-loader 来编译处理
                loader: extraSass.extract({//如果js中require了多个css文件，nameExtractTextPlugin会把多个css文件合并成一个，这个css是否压缩，主要看use里面的第一个匹配项的设置是否压缩
                    fallback: "style-loader",//编译后用什么loader来提取css文件
                    use: [{//需要什么样的loader去编译文件
                        loader:"css-loader",//"css-loader!sass-loader?sourceMap"
                        options:{
                            minimize: isDev?false:true //.css文件的css压缩
                        }
                    },{
                        loader:"sass-loader?sourceMap",//"css-loader!sass-loader?sourceMap"
                        options:{
                            minimize: isDev?false:true //sass文件转css后的css压缩
                        }
                    }]
                })//css-loader!postcss-loader!sass-loader (postcss要放在css-loader之后，sass-loader之前)
            }
            // {
            //     test: /\.vue$/,
            //     loader: 'vue-loader',
            //     options: {
            //         loaders: {
            //             scss: 'vue-style-loader!css-loader!sass-loader', // <style lang="scss">
            //             sass: 'vue-style-loader!css-loader!sass-loader?indentedSyntax' // <style lang="sass">
            //         }
            //     }
            // },
            
            // { test: /\.(png|jpg)$/, loader: 'url-loader?limit=8192'}//图片文件使用 url-loader 来处理，小于8kb的直接转为base64
        ]
    },
    resolve: {
        modules: [path.resolve(__dirname, '../common/component'), path.resolve(__dirname, '../common/libs'), path.resolve(__dirname, "../common/utils"), path.resolve(__dirname, '../node_modules')],
        alias: {
            'vue': __dirname+'/../node_modules/vue/dist/vue.js'//用node_modules文件夹里面的vue/dist/vue.js来编译，vue执行的时候只需要运行时，打包的时候做编译即可，可以节省vue的size
        }
    },
    devServer: {
        disableHostCheck: true
    }
};
// var cloneConfig=Object.assign({},commonConfig);//深度克隆



if(isDev){
    config = Object.assign(commonConfig, {
        plugins: HtmlWebpackPluginArray.concat([
            // new CopyWebpackPlugin([{ //文件拷贝，如果拷贝了webpack其他插件（例如HtmlWebpackPlugin生成的html），它就会影响HtmlWebpackPlugin的执行，导致热替换失败
            //     from: copyImageFromPath, //拷贝图片
            //     to: copyImageTargetPath
            //         // ignor:["*.js"] 忽略.js文件
            // },
            // {
            //     from: copyCssFromPath, //拷贝css
            //     to: copyCssTargetPath
            // }
            // ]),
            // extraCss,
            extraSass //把js中引用require('./css/plan.css'支持.scss转义)的所有css都单独抽离出来成为一个css文件（默认存放地址和html同一级，也可以设置string自己指定目录），插件还会在html文件中插入对应的css链接，css链接是 stylePath+"[name].css"（name指的是html的名称，stylePath是自定义的路径）
        ]),
        devtool: 'eval-source-map' //启用source-map方便调试
    })
}else{
    // 
    config = Object.assign(commonConfig,{
        plugins:HtmlWebpackPluginArray.concat([
            // new HtmlWebpackPlugin({//生成html （热插拔：配置1（没有这个动态生成html文件，热插拔无法正常监控）） 这个插件已经在HtmlWebpackPluginArray中创建了
            //     hash:true,
            //     minify:{
            //         "html-minifier":true//
            //     }
            // }),
            // new CopyWebpackPlugin([{//文件拷贝，如果拷贝了webpack其他插件（例如HtmlWebpackPlugin生成的html），它就会影响HtmlWebpackPlugin的执行，导致热替换失败
            //     from: copyImageFromPath,//拷贝图片
            //     to:copyImageTargetPath
            // },
            // {
            //     from: copyCssFromPath,
            //     to:copyCssTargetPath
            // }
            // ]),
            new webpack.optimize.UglifyJsPlugin({//会对js包括js中require进去的css进行压缩（注意：不包括单独.css文件的压缩）
              compress: {warnings: false }
            }),

            // extraCss,
            extraSass//这个sass提取，会把之前的拷贝的css覆盖
        ])
    });
}
module.exports = config;//执行webpack打包


    






//常用插件：
// "autoprefixer": "^7.1.2",//css前缀自动补充
// "babel": "^6.23.0",//babel基础
// "copy-webpack-plugin": "^4.0.1",//文件拷贝
// "css-loader": "^0.28.4",//处理css中的url（）等
// "html-webpack-plugin": "^2.30.1",//生产html的插件，每次生成的html，里面的script、link后面会动态添加hash，防止html中的文件缓存
// "sass-loader": "^6.0.6",//处理css预处理器sass的转化
// node-sass : sass转化需要用到
// "style-loader": "^0.18.2",//把css插入style标签
// "url-loader": "^0.5.9",//处理图片，支持图片条件限制
// file-loader:url-loader以来file-loader
// "vue": "^2.4.2",//vue基础
// "webpack": "^2.2.0",//webpack基础
// "webpack-dev-server": "^2.6.1",//webpack通过这个来实现服务器配置
// "webpack-glob-entry": "^2.1.1",//通用入口，能把模糊路径转成所有的路径的数组
// "webpack-merge": "^4.1.0"//文件合并
// "extract-text-webpack-plugin": "^3.0.0",//希望项目的样式能不要被打包到脚本中，而是独立出来作为.css
// process,环境设置时候需要
// webpack 需要全局安装（-g），再局部安装




//需要的webpack功能 ：
//     webpack如何调试 ok  //http://blog.csdn.net/neoveee/article/details/73321392?utm_source=itdadao&utm_medium=referral
//     打包环境划分：webpack -d；webpack -p；webpack --watch（通过process区分） ok
//     文件拷贝 ok
//     es6，ok
//     热插拔+sourcemap方便开发调试 ok
//     extract-text-webpack-plugin：希望项目的样式能不要被打包到脚本中，而是独立出来作为.css 
//     sass支持 ok
//     js，css压缩 ok 
//     css跟js合并（webpack的require同步加载就完成了该功能）ok
//     多个js合并：js中require另外一个js，就实现了js合并（同步的） ok
//     多个css合并（ExtractTextPlugin把一个js中引入的多个css合并抽离出一个css）ok（可以创建一个common.js作为入口来抽离一个common.css）
//     html-webapck-plugin：生产html的插件：每次生成的html，里面的script、link后面会动态添加hash，防止html中的文件缓存 ok
//     支持异步加载（以免一个页面太大） require.ensure ok（待用）
//     CommonsChunkPlugin ：把所有公共页面的模块抽离出来放到common这个文件中去 (可以针对某些页面提取)ok （没用过，待用）
//     在html中存在多个js引用文件（根本意义在于抽离公共模块，这个通过CommonsChunkPlugin来实现公共模块提取，也可以自己创建一个common.js假装一个页面，webpack会编译它，其他页面直接在html中引用common.js即可）
//     vue devTools:http://blog.csdn.net/gavid0124/article/details/74078876 ???

/*     在html中存在多个css引用文件（公用的css可以通过require形式放到对应的js文件里面，js文件再通过ExtractTextPlugin插件提取出来，
         这样公共的css可以使用，但是css还是被打在页面里面，不能实现css的公共缓存；解决方案有
         1.可以通过chunk和hash来实现公共缓存【比较难搞】，
         2.可以通过require.ensure来加载css，这样是单个文件加载，可以再多个页面之间实现公用
         3.创建common.js作为虚拟入口，在这个js里面require这个common.scss,然后通过ExtractTextPlugin提取出编译好的common.css，最后把这个css通过grunt移动到原来的common.scss文件所在的位置
*/

//     postcss和autoprefixer使用（暂且不做！！！！！）



//注意事项：
// npm start没有启动浏览器是无法访问localhost地址的
// 配置变动了，webpack-dev-server也没用，得重新webpack打包，再npm start
// 插件或者webpack的很多问题，都是因为插件和webpack的版本不匹配
// 一般遇到安装插件的问题，只要把node_modules文件删除，然后再cnpm install，就可以重新按照package.json重新安装所有插件了
// webpack最坑爹坑的地方，require和reuire.ensure都tm不支持变量代替路径，而且require是在node_modules里面的，所以webpack只能引用webpack所安装的那个文件夹以内的文件
// 
/* webpack都是通过js入口来对其他资源文件实施操作的，入口肯定是js文件，比如想单独设置处理一个common.css文件,
   那必须先搞一个common.js作为一个公共页面载体，在里面require这个css，通过这个js和ExtractTextPlugin来处理common.css（改文件可能是sass，需要处理）,
   编译成一个浏览器识别的common.css，最后，需要把这个css通过插件grunt拷贝到assets下面的css文件夹中，最后在html中用link来引用公共common
   想实现灵活多变地操作css，html等文件，还是得通过grunt
   */


//webpack --watch: 
//      这种模式使用webpack自己的watch方法来完成，监听package.json中entry配置的文件的变化。你需要添加–watch –dev
//      该模式除了会监听entry文件的变化。当我们自定义的webpack.config.js(通过–config传入)文件内容变化的时候会自动退出编译，要求用户重启!
//webpack-dev-server@2.8.0以上用了es6语法，但是在转义的时候，一般不会吧node_module里面的js转义（exclude: /node_modules/），否则太大了，所以一般用2.7.1版本的webpack-dev-server即可




