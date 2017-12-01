/*
 *author:chenjiajie
 *date:2017/08/11
 *description:和后端交互的ajax请求的基础封装，用于对所有请求的统一监控，以及请求url的统一管理
 *该模块依赖utils文件,所以在common文件中，应该先require utils.js，再require model.js
 */
// import Animal from './ajax.js';

(function(){
	window.hj=window.hj||{};
	var url=location.host||"";
	if(url.indexOf("localhost:")==0){
		hj.env="dev";//本地开发环境
		hj.baseUrl="http://local.backend.baidu.com/";
	}
	else if(url.match(/qa\d{1}backend\.baidu.com/gi)){
		hj.env="branch";//分支环境
		hj.baseUrl="192.168.0.1";
	}
	else if(url.indexOf("qa.backend.baidu.com")!=-1){
		hj.env="qa";//测试环境
		hj.baseUrl="192.168.0.1";
	}
	else if(url.indexOf("yz.backend.baidu.com")!=-1){
		hj.env="yz";//验证环境（生产环境数据，数据和线上一样）
		hj.baseUrl="192.168.0.1";
	}
	else if(url.indexOf("backend.baidu.com")==0){
		hj.env="online";//生产环境（线上环境）
		hj.baseUrl="192.168.0.1";
	}
	else{
		hj.env="dev";//本地开发环境
		hj.baseUrl="192.168.0.1";
	}
})();


/*
 *mock数据用法：hj.request()
 */
function model(opts){//对ajax进行二次封装，添加环境区分和mock请求

	//解析后端数据类型或者跳转
	var baforeAction=function (xhr,error) {
		var responseText=xhr.responseText;
		if(xhr.responseURL&&responseText&&responseText.match(/\<\!DOCTYPE html\>/gi)){//需要重定向【一般是因为页面没有登录或者没权限访问】
			location.href=xhr.responseURL.replace(/returnurl\=[\s\S]*/,"returnurl="+encodeURIComponent(location.href));
		}else{
			return parseData(xhr);
		}
	}

	//解析后端数据
	var parseData=function(xhr){
		var type=xhr.responseType.toUpperCase();
		if(type=="JSON"){
			if(xhr.responseText){//没有数据
				return hj.parseJSON(xhr.responseText)//解析JSON
			}else{
				return xhr.responseText
			}
		}else if(type=="XML"){
			if(xhr.responseXML){
				return xhr.responseXML//解析XML，需要一个解析xml的函数，还没写
			}else{
				return xhr.responseXML
			}
		}else{//字符串
			return hj.parseJSON(xhr.responseText);//由于服务端返回responseType为空，所以只能这样修复bug了
		}
	}

	

	if(opts.isMock){//是否需要mock

		//mockUrl是直接到pages文件夹下，只要指定文件名加参数即可，例如
		var mockUrl=opts.mockUrl;
		var url=mockUrl.replace(/\?[\s\S]*/,"");//url是对于的index.store.js这个mock数据的js文件，后面的key和case分别是页面中对于的那个请求，以及该请求的某个case，有时候我们需要保存一个请求的多个mock数据以便切换
		var key=opts.url;//mock数据的时候，真实的url变成了mock数据中的key
		var detailCase=(mockUrl.match(new RegExp("[\?\&]" + "case" + "=([^\&]+)", "i")) || [])[1];

		//少年们千万注意，json是不支持任何注释的，不支持//和/**/，千万别犯傻
		//ensure中的是依赖的js文件，ensure中不支持任何变量，
		//ensure的callback中require进来的js，都是异步加载的js，他们会合ensure中的依赖项打包在一起，但是依赖的js不会执行，只会执行ensure的callback中require的js文件
        require.ensure([],function(require){//require.ensure以当前文件地址为基准，而不是打包合并后的地址+url //"../../vue-demo/mock/index-mock.js"

        	var backData=require("../../vue-demo/mock/"+url);//require加载模块的时候，需要一个基础的路径，require会把这个路径下的所有文件都作为模块处理（require.context可以支持完全的变量）
        	var data=backData.default.data;

        	if(!data){
        		console.log("mock请求url不对，mock数据的url以pages文件夹为base文件夹;mock url例子:index.store.js?case=casename");
        	}

        	var targetData=data&&data[key]||{};
        	var caseName="";

        	if(!key){
        		console.log("mock数据不存在，请在"+url+"这个文件中添加对应的"+key+"属性以及它的mock数据");
        		opts.success(data[key]);
        	}

        	if(!detailCase){
        		for (attr in targetData){
        			caseName=attr;
        			break;
        		}
        		if(!caseName){//如果没有case属性，name下面的各
        			console.log("mock数据不存在，请在"+url+"的"+key+"属性中添加对应mock数据");
        		}
        		opts.success(data[key][caseName]);
        	}
        	else{
        		opts.success(data[key][detailCase]);
        	}
        });
    }
    else{
    	if(Object.prototype.toString.call(opts.buildUrl) === "[object Function]"){
			opts.url=opts.buildUrl(opts);
		}
		else{
			opts.url=hj.baseUrl+opts.url;
		}
		opts.beforeAction=baforeAction;
		hj.ajax&&hj.ajax(opts);
    }
}


model.error=function(text){//ajax请求数据失败(网络原因)
	return function (e) {
		console.log(text||"请求数据失败，请重新请求");
	}
}

model.success=function(callback,errorCallback,options){//errorCallback服务器原因
	return function(rst){
		if(rst.Status==0){//请求成功，status为0
			callback(rst,options);
		}else{
			errorCallback(rst,options);
		}
	}
}

hj.request=model;


export default model