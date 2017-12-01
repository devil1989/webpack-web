/*
 *date：2017/08/15
 *author:chenjiajie
 *description:通用函数，包在window.hj里面
 */

import Ajax from "./ajax.js"


//常用方法集合
//underscore常用方法：_.extend,_.defaults,_.each,_.tempalte,_.filter(筛选return true的项),_.compact,_.min,_.uniq,
var utils=(function(w) {
  var toString = Object.prototype.toString;

  var Obj = {

  	ajax:Ajax,

    hasClass:function(ele,className){
      return ele.className.indexOf(className)!=-1
    },

    addClass:function(ele,className){
      ele.className+=" "+className;
      return ele;
    },

    removeClass:function(ele,className){
      var formatClassName=className.replace(/\-/g,"\\-").replace(/\_/g,"\\_");//正则需要转义-为\-
      ele.className=ele.className.replace(new RegExp("\\b"+formatClassName+"\\b","g"),"");//"\b定义边界"
      return ele
    },
  	
    //深度克隆
    clone: function(tgObj) {
      var obj = {};
      if (JSON && JSON.stringify && JSON.parse) {
        obj = JSON.parse(JSON.stringify(tgObj));
      } else {
        for (key in tgObj) {
          var value = tgObj[key];
          var type = toString.call(value);
          if (type == "[object Number]" || type == "[object String]" || type == "[object Boolean]") {
            obj[key] = value;
          } else {
            obj[key] = arguments.callee(value);
          }
        }
      }
      return obj;
    },

    //深度赋值（找到最里面的基本数据类型进行赋值）,解决vue的state的赋值问题（因为不允许新对象替换旧对象）
    /*解决的问题：
        1.vue的state对象初始化以后，如果ajax请求再获取了结构相同的一个对象，因为原对象已经被监控，职能更新里面的非引用类型的值；把原对象整体替换不会触发vue的dom更新
        2.vue的state对象初始化以后，如果ajax请求的新对象和原对象接口不同：
            2.1有新增属性 ： this.someObject = Object.assign({}, this.someObject, { a: 1, b: 2 })
            2.2删除属性直接忽略，一般不会删除属性 ok
            2.3改变属性值的时候（如果改变了值得类型）
                2.3.1：基本类型改为引用类型 , 直接修改 ok
                2.3.2：引用类型改为基本类型 , 直接修改（在template中，必须用v-if判断是否存在对应值是否存在） ok
                2.3.3：基本类型改为基本类型 ， 直接修改 ok
                2.3.4：引用类型改为引用类型 ， 递归调用，最后肯定是基本类型改为基本类型或者基本类型改为引用类型
                
                //这是更具业务的特殊处理：得仔细查看
                2.3.5：function虽然是引用类型，但是按照值类型做替换操作，不需要递归调用
                2.3.6：对象里面的数据，新对象只是替换旧对象的值，旧对象有但是新对象没有的值，就沿用旧对象
                2.3.7：数组里面的数据，如果新数组长度小于旧数组，就把久数组截断到新数组长度，不沿用就数组的数据
      缺陷：不支持“正则，日期，函数”的深度克隆
    */
    deepExtend: function(originObj, targetObj) {
      var getTypeFunc=Object.prototype.toString;
      function isObject(obj) {//这里没把function算进来，因为function在这里只要直接赋值，不需要再递归调用
        var type = typeof obj;
        return (type == "object" && obj != null) ;//|| type == "function"
      }
      if (isObject(originObj)&&isObject(targetObj)) {//引用类型被引用类型替换
          for (var key in targetObj) {
            if (targetObj.hasOwnProperty(key)) {

              //都是引用类型&&类型相同才做替换
              if (isObject(originObj[key])&&isObject(targetObj[key])&&getTypeFunc.call(originObj[key])===getTypeFunc.call(targetObj[key])) { //引用类型引用类型替换
                
                if(getTypeFunc.call(originObj[key])==="[object Array]"&&originObj[key].length>targetObj[key].length){//都是数组，得直接截取原来的
                  originObj[key].length=targetObj[key].length;//截断原来的数组，把多出来的删除
                }
                originObj[key] = hj.deepExtend(originObj[key], targetObj[key]);
              } else {
                originObj[key]=targetObj[key];//千万别脑残地写originVal=value;
              }
            }
          }
      }else{
        originObj = targetObj;
      }
      return originObj;
    },

    /*
     *desc:把字符串转化成JOSN格式
     *dataStr:传入的字符串
     *format：‘{"age":25}’,一定要外部单引号，内部双引号的格式，否则会报错
     *note:eval("("+dataStr+")")也能实现相同的功能，但是性能没new Function好
     */
    parseJSON:function(dataStr){//new Function的时候，会自动转化成json
      return JSON.parse?JSON.parse(dataStr):(function (dataStr){return (new Function('return '+dataStr))();})();
    },

    //和$(document).ready一样
    DOMReady: function(callback) {
      var verson = parseInt(navigator.userAgent.substring(30, 31));
      //ie6-8没有DOMContentLoaded事件，所以要用setInterval事件来判断DOM有没有准备好，如果dom好了，那么document.documentElement.doScroll方法存在
      if (navigator.userAgent.indexOf("IE") != -1 && verson < 9) {
        var timeout = setInterval(function() {
          if (document.documentElement.doScroll) {
            callback();
            clearInterval(timeout); //绑定以后，要手动清除之前的setInterval
          }
        }, 20);
      } else { //ie9+和其他浏览器都有addEventListener事件
        document.addEventListener("DOMContentLoaded", callback);
      }
    },

    //把数字变成固定长度，比如把14变成4位固定长度的值“0014”，formatZero(14,4);第二个参数是位数
    formatZero: function(str, type) {
      str += '';
      for (var i = 0, len = str.length; i < type - len; i++) {
        str = '0' + str;
      }
      return str;
    },

               
    /*
     *@desc类的继承方法(Backbone的继承) add by jiajiechen
     *@param
        parent:父类
        protoProps：拓展原型（把该对象中的方法复制给子类原型）（当该对象是某个构造函数的原型，那么那个构造函数设置为子类：这样就能实现子类方法自定义）
        staticProps：拓展静态方法（把该对象中的方法复制给子类静态方法）
     */
    inherits: function(parent, protoProps, staticProps) {
      var child;
      var ctor = function() {};

      //extend方法
      function extend(origin,addObj) {
        for (var key in addObj) {
          origin[key] = addObj[key];
        }
      }

      //设置child构造函数：判断protoProps是否一个原型对象（prototype），如果是则将child赋值为原型对象所属的构造函数
      if (protoProps && protoProps.hasOwnProperty('constructor')) {
        child = protoProps.constructor;
      } else {
        //否则将新建一个构造函数赋值给child
        child = function() {
          //继承类的实例方法
          parent.apply(this, arguments);
        };
      }

      //继承类的静态方法（静态方法属于类，却不属于实例）
      extend(child, parent);

      //只继承原型，不继承实例方法，所以不直接写child.prototype = new parent();
      ctor.prototype = parent.prototype;
      child.prototype = new ctor();

      //拓展原型
      if (protoProps){ extend(child.prototype, protoProps);}

      //拓展静态方法
      if (staticProps) extend(child, staticProps);

      //执行完child.prototype=new ctor后，child.prototype.constructor已经不指向child，所以此处需要把构造函数指回自己
      child.prototype.constructor = child;

      //查找父类可以通过__super__来查找
      child.__super__ = parent.prototype;

      return child;
    },

    //构造函数，可以把“sdf=34&sdf=fd”这种类型的字符串（和location.search结构类似）转化为对象
    buildUrl: function(baseQueryString) {
      var me = hj.buildUrl;
      if (!(this instanceof me)) {
        return new me(baseQueryString);
      }

      //获取key在keyMap中的index
      function getIndex(key) {
        key = key && key.toLowerCase();
        return ArrayIndexOf(keyMap, key);
      }

      function ArrayIndexOf(arr, key) {
        if (arr.indexOf) {
          return arr.indexOf(key);
        } else {
          for (var i = 0, len = arr.length || 0; i < len; i++) {
            if (arr[i] === key) {
              return i;
            }
          }
        }
        return -1;
      }

      var keyMap = []; //保存key.toLowerCase的数组
      var names = []; //保存key的数组
      var values = []; //保存value的数组
      var model = {}; //保存数据的对象

      if (baseQueryString) {
        var collections = baseQueryString.split('&');
        if (collections) {
          for (var i = collections.length - 1; i >= 0; i--) {
            var keyValue = collections[i];
            var keyValueArr = keyValue && keyValue.split('=');
            var key = keyValueArr && keyValueArr[0];
            var value = keyValueArr && keyValueArr[1];
            if (key) {
              model[key] = value;
              set(key, value);
            }
          };
        }
      }

      function set(key, value) {
        if (key && value) {
          var index = getIndex(key);
          if (index >= 0 && index < values.length) {
            values[index] = value;
          } else {
            names.push(key);
            values.push(value);
            keyMap.push(key.toLowerCase());
          }
          model[key] = value;
        }
        return value;
      }

      function get(key) {

        var result = key ? values[getIndex(key)] : model;
        return result;
        //return key ? model[key] : model;
      }

      function remove(key) {
        var _model = model;
        var index = getIndex(key);
        if (key && index > 0) {
          delete model[key];
          names.splice(index, 1);
          values.splice(index, 1);
          keyMap.splice(index, 1);
        } else {
          model = {};
          names = [];
          values = [];
          keyMap = [];
        }
      }

      var encodeURI = function(str) {
        try {
          str = str ? decodeURIComponent(str) : '';
        } catch (e) {};

        return encodeURIComponent(str).replace(/\*/g, "%2A").replace(/-/g, "%2D").replace(/_/g, "%5F").replace(/\./g, "%2E").replace(/!/g, '%21').replace(/~/g, '%7E').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
      };
      this.set = set;
      this.get = get;
      this.remove = remove;
      this.toString = function(t1, t2) {
        t1 = t1 || '=';
        t2 = t2 || '&';
        var result = [];
        for (var index = 0; index < names.length; index++) {
          if (values[index]) {
            result.push(encodeURI(names[index]) + t1 + encodeURI(values[index]));
          }
        }
        return result.join(t2) || '';
      }

    },

    inheritHtml:function (replaceContent,wrapper){
      var matchs=wrapper.match(/\{\{inheritContent\}\}/g);
      return matchs?wrapper.replace(/\{\{inheritContent\}\}/,replaceContent):wrapper;
    },

    //对vue的继承封装
    extendVue:function(parent,_self){
      var obj={};
      var methods=parent.methods||{};
      var tpl=hj.inheritHtml(_self.template,parent.template);
      var methods=_.extend(parent.methods,_self.methods);
      var datas=_.extend(parent.data(),_self.data());
      for(var key in parent){
        _self[key]=_self[key]||parent[key];
      }
      _self.template=tpl;
      _self.methods=methods;//方法不能全部替换，需要逐个继承
      _self.data=function(){
        return datas;
      }.bind(self);
      return _self;
    },

    //包裹ele元素，给该元素的所有事件句柄执行之前添加自己的track代码
    wrap:function(ele){
      var self=ele,i=0;
      ele.addEventListener=tgFunction(ele.addEventListener);
      function tgFunction(callback){
          var _callback=callback;
          return function(){
              var wrapperHandels=function(handel){
                  return function(){

                      self.setAttribute("data-index",++i);
                      handel.apply(this,arguments);
                  }
              }
              if(arguments[1]){//重写调用的handel函数
                  arguments[1]=wrapperHandels(arguments[1]);
              }
              _callback.apply(this,arguments);
          }
      }
      return self;
    },

    /**********************localstorage操作函数 start**********************/

    //通过节点的id，找到对应它的所有数据（每次请求以后，需要把数据存到localstorage里面，localstorage存的场景数量有限制，超出限制会删除之前的场景，同时清楚场景对应的localstorage）
    getDataById: function(id, sceneName) {
      var key = (sceneName || hj.spaIns.defaultSceneType) + "-" + id;
      var val = localStorage[key];
      return val.match(/\{[\s\S]*\}/) ? hj.parseJSON(val) : val;
    },
    removeDataById: function(id, sceneName) {
      if (!id) {
        localStorage.clear()
      } else {
        var key = (sceneName || hj.spaIns.defaultSceneType) + "-" + id;
        localStorage.removeItem(key);
        localStorage[key] = '';
      }
    },
    setDataById: function(id, obj, sceneName) {
      var key = (sceneName || hj.spaIns.defaultSceneType) + "-" + id;
      localStorage[key] = typeof obj == "object" ? JSON.stringify(obj) : obj;
    },

    formatLocalStorage: function(cutArray) {
      (cutArray || []).forEach(function(id) {
        removeDataById(id)
      });
    }

    /**********************localstorage操作函数 end**********************/

  };

  w.hj= (Object.prototype.toString.call(w.hj)==="[object Object]")?Obj.extend(Obj,w.hj):Obj;

  return w;
})(window);


//拓展日期
(function(){
  Date.prototype.addMinute=function(n){
    return new Date(+this+n*60000);
  };
  Date.prototype.addHour=function(n){
    return new Date(+this+n*3600000);
  };
  Date.prototype.addDay=function(n){
    return new Date(+this+n*86400000);
  };

  //y月份添加是这样的，
  //如果n为0-11，那么设置好的月份数就是对应月份的相同date，但是如果那个月份刚好没有对应的那个date，比如3月有30号，但是2月没有30号，此时设置就会失效，时间会变成相同月份的某一天
  //如果n为负数或者大于11的值，那么超过11部分会按照月份继续往后延，比如n为24，就表示2年后；n为-24，就表示2年前；但是如果n月后没有对应的月份数，时间表示就会不准确
  Date.prototype.addMonth=function(n){
    var date= new Date();
    date.setMonth(date.getMonth()+n);
    return date
  };

  //今天：小时，分，秒，毫秒都为0
  Date.prototype.today = function () {
    return new Date().setHours(0,0,0,0);//第一个0设置小时，第二个设置分，第三个设置秒，第四个设置毫秒
  };

  //当前时间戳
  Date.now=function(){
    return +new Date;
  }

  //日期格式化
  Date.prototype.format = function (format) {
      var me = this, formators = Date._formators;
      if (!formators) {
          Date._formators = formators = {

              y: function (date, length) {
                  date = date.getFullYear();
                  return date < 0 ? 'BC' + (-date) : length < 3 && date < 2000 ? date % 100 : date;
              },

              M: function (date) {
                  return date.getMonth() + 1;
              },

              d: function (date) {
                  return date.getDate();
              },

              H: function (date) {
                  return date.getHours();
              },

              m: function (date) {
                  return date.getMinutes();
              },

              s: function (date) {
                  return date.getSeconds();
              },

              e: function (date, length) {
                  return (length === 1 ? '' : length === 2 ? '周' : '星期') + [length === 2 ? '日' : '天', '一', '二', '三', '四', '五', '六'][date.getDay()];
              }

          };
      }
      return (format || 'yyyy/MM/dd HH:mm:ss').replace(/(\w)\1*/g, function (all, key) {
          if (key in formators) {
              key = "" + formators[key](me, all.length);
              while (key.length < all.length) {
                  key = '0' + key;
              }
              all = key;
          }
          return all;
      });
  };

})();


export default utils
