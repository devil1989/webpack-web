/*
 *author:chenjiajie
 *time:2017/08/22
 *description:给予webapck的单页面应用程序（SPA）
 */

//单页面应用程序history.pushstate,popState和window.onhashchange实现单页面
// 切换 tab（展示的隐藏，隐藏的展示）
// 添加，删除tab
// 展示，隐藏tab
// 场景动画
// 历史记录：修改hash的时候，浏览器支持前后跳转，需要pushstate

// 路由字符串#&scene=val-1 (
//   1.支持多条路：展开多个目录结构；road=value1&road=value2
//   2.支持场景话，一个场景对应某个页面):scene=value-1表示存在value这个key的场景，1表示展示，0表示隐藏（注意，一个场景必须是除了nav的一整个块）
//   3.支持nav隐藏&nav=hide的时候隐藏
  
// 点击事件都是触发url的change事件

//执行流程：
//点击 > 获取对应scene > 修改对应url的hash > 解析hash来渲染场景 > history.pushstate

//解析hash: 解析hash,获取所有scene，nav参数和值 > 根据scene和nav渲染左侧树（需要自己寻找路径） > 根据多个scene渲染当前展示的tab内容和隐藏tab的内容
/*scene渲染: 每个scene=value的value值都不相同，每个value值作为localstorage中的key，该scene的当前内容作为value保存在localstorage中，用于缓存，没缓存就等于新开页面
             url例子: #scene=combine-key1-key2|con-key3-key4&nav=0
                  &符号为1级分隔符，分隔最大单元，scene是场景单元，nav是左侧导航单元，后续可以拓展其他单元
                  |符号是2级分隔符，以scene的值为例，场景分为多中类型，combine是一种场景，con也是一种场景；
                  -符号是3级分隔符，以combine-key1-key2为例，表示combine类型场景下的值有key1和key2两个相同类型的场景，最后的那个场景（key2）属于需要展示的场景，其他都隐藏
 */


/*
 执行流程：
  1.hashchange事件触发
  2.判断hash是否存在scene场景，存在的话继续
  3.根据hash或去或有的场景类型，每种场景类型有多个场景;获取场景的同时，还会判断是否有场景数量限制，每种类型的场景的数量超过最大值，会截断场景到10个，并标注场景数量超标
  4.场景数量超标的话，调用changedHash重新设置hash
  5.场景数量未超标，就循环创建每一个场景
    5.1创建场景的时候，hash的最后一个值为展示的场景，其他场景虽然创建好了，但得隐藏
    5.2创建场景的时候，需要把创建的所有场景的id保存到currentSceneArray这个数组中
    5.3拿currentSceneArray中保存的场景元素的id和hash的场景作对比，删除hash中不存在，但是页面中却存在的场景

 
 待做功能：？？
  1.单页生命周期没写
  2.场景切换动画可配置没写
  3.nav展示隐藏功能没写
  4.很多可配置项没抽离出来
  5.各个场景之间那些公用的资源抽离出来，做一个公共资源接口提供调用；各个场景的独立资源各自不相互影响
 */
var SPA = function(opts) {
  var outputData = {};
  var wrapper=opts.wrapper;//场景插入地址
  var maxNum=opts.maxNum;//最多保存10个场景，多出来的场景删除，先入先出顺序删除
  var callbackFunc=opts.callback;//单页的callback，每次hashchange之后，场景更新，更新完以后需要调用callback，让原来的js文件处理场景的业务逻辑和展现，spa文件不处理业务

  window.onhashchange = function(e) {
    var obj = hj.buildUrl(location.hash.substr(1)).get();
    if (obj.scene) {
      if(delRepeat()){//有重复就return，自动changehash，再次调用hashchange事件
        return;
      }
      outputData.nav = obj.nav;
      outputData.scene=getScene();
      
      if(outputData.scene.isOutOfRange){
        formatLocalStorage(outputData.cutArray);//每次超出的时候，需要把多出来的id的场景数据从localstorage删除
        changedHash(outputData.scene.sceneArray);//根据最新的array重新拼接hash
      }
      else{
        callbackFunc(outputData);
      }
    }
  }

  function getCurrentScene(){
    var arr=location.hash.match(/\=combine[\s\S]*?(?=\&)/)[0].substring(9).split("-");
    return arr[arr.length-1];
  }


  //获取所有场景
  /*超出限制就截取场景*/
  function getScene(){
    var obj = hj.buildUrl(location.hash.substr(1)).get();
    var arr = (obj.scene||"").split("|");//combine等不同的场景类型，后续可扩展
    var currentScene;
    var sceneArray=[];
    var isOutOfRange=false;
    var cutArray;
    for (var i = 0, len = arr.length; i < len; i++) {
        var val = arr[i].split("-");//combine-fdfuisuius-fdfuisuius-sd:场景类型combine，场景名称fdfuisuius（确保场景唯一性，多个场景用-连接），最后一个是需哟啊展示的场景
        var itemOutOfRange=(val.slice(1).length>maxNum);
        var len2=val.slice(1).length;
        currentScene=val[val.length-1];
        isOutOfRange=isOutOfRange||itemOutOfRange;

        if(itemOutOfRange){//保存删除的那几个，需要在localstorage中删除
          cutArray=val.slice(1).slice(0,len2-maxNum);
        }
        val[0]&&currentScene&&sceneArray.push({
          key:val[0],//场景的类型
          value:(maxNum&&itemOutOfRange)?val.slice(1).slice(len2-maxNum):val.slice(1)
        });
    }

    return {
      cutArray:cutArray,//被切掉的scene
      sceneArray:sceneArray,//所有场景类型
      currentScene:currentScene||"",//combine类型对应的场景id
      isOutOfRange:isOutOfRange//任何一个类型的场景的场景数量超过maxNum，就设为ture，超过最大场景数限制
    }
  }

  //传入新的scene数组，然后生成新的location.hash
  /*
    arr结构：
      [{
        key:"combine",//场景名称
        value:["1","9","8","4","2"]//所有场景值
      },{}]
   */
  function changedHash(arr){
    var obj = hj.buildUrl(location.hash.substr(1)).get();
    var targetHashArray=[];
    var sceneArr=[];

    for (var i = 0; i < arr.length; i++) {
      sceneArr.push(arr[i].key+"-"+arr[i].value.join("-"));
    }

    for (var key in obj){
      if(key=="scene"){
        targetHashArray.push(key+"="+sceneArr.join("|"));
      }else{
        targetHashArray.push(key+"="+obj[key]);
      }
    }

    location.hash="#"+targetHashArray.reverse().join("&");
  }

  //刷新页面作用相同，但是这里只是修改了hash来执行hashchange操作，这样也是刷新页面
  function updateScene(){
     var obj=hj.buildUrl(location.hash).get();
      if(obj.hashchange){
          location.hash=location.hash.replace(/hashchange\=[\d]{1,}/g,"hashchange="+(obj.hashchange-0+1));
      }
      else{
          location.hash+="&hashchange=0";//只是hash刷新触发对应onhashchange事件
      }
  }

  function delRepeat(){
    var hasRepeat=false;
    var match=location.hash.match(/\=combine[\s\S]*?(?=\&)/);
    if(match){
      var arr=match[0].substring(9).split("-");
      var newArr=_.uniq(arr.reverse()).reverse();
      if(arr.length!=newArr.length){
        hasRepeat=true;
        var str="=combine-"+newArr.join("-");  
        location.hash=location.hash.replace(match[0],str);
      }
    }
    return hasRepeat
  }


  //判断是否存在合法的场景str,不传参数表示，只要有任意一个场景即可
  function hasScene(str){
    var obj = hj.buildUrl(location.hash.substr(1)).get();
    return obj.scene&&(obj.scene.split("|")||[]).some(function(unit){//场景类型-值
      var arr2=unit.split("-")||[];
      return (arr2.slice(1)||[]).some(function(subUnit){
        return str?(subUnit==str):subUnit
      });
    });
  }

  //删除某个combine场景,
  function deleteScene(nodeId){
    if(hasScene(nodeId)){
      var tgIndex;
      var senceArray=getScene().sceneArray||[];
      senceArray.forEach(function (ele,idx,input) {
        if(input[idx].key==SceneConst){
          (input[idx].value||[]).forEach(function (unit,index) {
            if(unit==nodeId){
              removeDataById(nodeId,SceneConst);
              input[idx].value.splice(index,1);
            }
          })
        }
      });
      changedHash(senceArray);
    }
  }
  
  //原来存在场景就，把场景拿到最后面作为展示场景；如果没有，就在后面添加
  function addScene(sceneId) {
    var obj = hj.buildUrl(location.hash.substr(1)).get();
    var tgIndex=null;
    var arr = (obj.scene||"").split("|");
    var targetArray=[];
    var targetHashArray=[];
    for (var i = 0, len = arr.length; i < len; i++) {
        var sceneType=(arr[i].split("-")||[])[0];
        var val = (arr[i].split("-")||[]).slice(1);
        for(var j=0;j<val.length;j++){
          if(val[j]==sceneId){
            tgIndex=j;
          }
        }
        if(tgIndex!==null){
          val.splice(tgIndex,1);
          tgIndex=null;
        }
        targetArray.push(sceneType+"-"+val.join("-")+"-"+sceneId);
    }
    ;

    for (var key in obj){
      if(key=="scene"){
        targetHashArray.push(key+"="+targetArray.join("|"));
      }else{
        targetHashArray.push(key+"="+obj[key]);
      }
    }

    location.hash="#"+targetHashArray.reverse().join("&");

  }

  var outPutApu=hj.spaIns = {
    data:outputData,
    getScene:getScene,
    hasScene:hasScene,//对外接口，是否存在某个场景
    addScene:addScene,
    deleteScene:deleteScene,
    updateScene:updateScene,
    getCurrentScene:getCurrentScene,
    defaultSceneType:'combine'
  }
  //对外的接口
  return outPutApu;
}

hj.spa=SPA;

export default SPA


