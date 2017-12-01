import Alert from '../alert/alert.js'
require("./pop.scss");
/*
 流程: saveUnit[点击事件] > checkHasActiveChild[验证是否可以保存,有的节点不能禁用] >
       checkSuccess>saveUnitRequest[发送保存请求] > saveSuccess

 页面弹框编辑流程：（每个弹框的请求数据都通过setLocalstorage方法，保存在localStorage里面），
    //三种pop类型如下：
    新增平级弹框：type="create" isSub=false （rowData中的数据，查看index-mock.js的"crm/OrganizationV2/GetNodeExtAttr" case3中的数据 ）
    新增子集弹框：type="create" isSub=true （rowData中的数据）
    编辑弹框：type="edit" isSub=false （rowData中的数据）
    
    内容更新逻辑：只要修改属性，就修改对应的rowData中的数据，然后重新commit操作实现更新
    当前pop类型：在localStorage中，保存一个当前的options数据，每次点击编辑，新增，都需要重新设置当前pop类型，其他操作的时候，只要通过这个pop类型来获取对应的pop类型的数据
    
 */

var templates = require("./pop.html");
var newTemplate = hj.inheritHtml(templates, Alert.template);
const NotesInfo={
    nodeName:"请输入组织名称！",
    functionType:"请选择职能类型",
    organizationType:"请选择组织类型",
    extendType:"请选择拓展类型",
    functionName:"职能类型",
    organizationName:"组织类型",
    extendName:"扩展类型"
};
var Pop = {
    extends: Alert, //继承自Alert
    data: function() {
        return this.$store.state.pops;
    },


    methods: {
        //点击保存事件
        saveUnitAction: function(e) {//后续很多数据都是从这个入口传进来的
            var param = this.getSaveParam();
            var isParamValid=this.checkValidSaveParam(param);
            isParamValid&&this.checkHasActiveChild();
        },

        //title
        checkHasActiveChild: function() {
            debugger
            var opts=this.getPopOptions();
            if (!opts.isActive) {//禁用的话，需要先验证
                var param = {
                    'isMock': false,
                    'mockUrl': "index-mock.js?case=case1",
                    'url': "crm/OrganizationV2/CheckChild",
                    "data":{
                        nodeid:opts.id
                    }
                };
                this.$store.dispatch("checkChildActive", {
                    param: param
                }).then(
                    hj.request.success(this.checkSuccess, this.checkFail),
                    hj.request.error("网络原因请求弹框数据失败")
                )
            } else {//启用状态就直接保存即可
                this.saveUnitRequest();
            }
        },

        checkSuccess: function(rst) {
            var opts=this.getPopOptions();

            if (rst.Status!=0||!rst.Data) { //rst.Status表示查询成功，rst.Data表示允许禁用
                var pop = this.$root.$children[2]; //pop组件
                var originTitle = this.$store.state.pops.data.title;
                var targetTitle = "禁用" + originTitle.substring(2);
                this.$store.commit("updatePop", {
                    data: { //传入最新的弹框的state数据
                        title: targetTitle,
                        btns: [{
                            type: "submit", //提交
                            txt: "确认",
                            callback: function(e) {
                                debugger
                                this.hide();
                                this.saveUnitRequest();
                            }.bind(pop)
                        }, {
                            type: "cancel", //取消
                            txt: "取消",
                            callback: function(e) {
                                this.hide();
                            }.bind(pop)
                        }],
                        needShow: true,
                        content: {
                            isTxt: true,
                            msg: rst.Message,
                            contentInfo: null
                        }
                    }
                });
            } else { //没有提示说明可以直接禁用，直接调用保存接口即可
                this.saveUnitRequest();
            }
        },

        saveUnitRequest: function() {
            var param = this.getSaveParam();
            var isParamValid=this.checkValidSaveParam(param);
            console.log(JSON.stringify(param));
            isParamValid&&this.$store.dispatch('saveUnit', {
                param: param
            }).then(
                hj.request.success(this.saveSuccess, this.saveFail),
                hj.request.error("网络原因请求弹框数据失败")
            );
        },

        saveSuccess: function(rst) {
            var opts=this.getPopOptions();
            if (opts.isSub) { //新增的保存
                hj.spaIns.addScene(rst.Data.nodeid);
            } else { //编辑的保存
                hj.spaIns.updateScene();
            }
        },

        saveFail: function(rst, opts) {
            this.showAlert({
                title: "提示",
                msg: rst.Message
            });
        },

        checkFail: function(rst, opts) {
            this.showAlert({
                title: "提示",
                pop: this.$root.$children[2],
                msg: rst.Message||"校验失败"
            });
        },

        //通用提示框
        showAlert: function(opts) {
            var self=this;
            this.$store.commit("updatePop", {
                data: { //传入最新的弹框的state数据
                    title: opts.title,
                    btns: [{
                        type: "submit", //提交
                        txt: "知道了",
                        callback: function(e) {
                            self.hide();
                        }
                    }],
                    needShow: true,
                    content: {
                        isTxt: true,
                        msg: opts.msg,
                        contentInfo: null
                    }
                }
            });
        },


        //保存参数[后续数据统一放到localstorage中，操作数据也是，写一个统一的数据中心]
        getSaveParam: function(opts) {
            var opts=this.getPopOptions();
            var unitData = hj.getDataById(opts.id);
            var extendAttrs=this.getSelectedExtendAttr();
            return {
                'isMock': false,
                'mockUrl': "index-mock.js?case=case2",
                'url': "crm/OrganizationV2/SaveNode",
                "data": { //包含了基本数据:组织名称,父级组织代码,是否启用,父级组织名称(这个的key前端写死，编辑的时候只有组织名称和组织状态可改，也是前端写死)
                    "rowData":{
                        "id": opts.id, //对应的唯一的标识，新增的时候这个下发0
                        "nodeName": opts.nodeName, //组织名称，【通用可编辑，服务端会下发】：新增的时候下发为0
                        "isActive": opts.isActive, //是否启用【这个服务端不会下发，需要自己赋值】！！
                        'isSub': opts.isSub,//是否是添加子集单元
                        "parentId": unitData.info.parentId, //父级组织代码【这个服务端不会下发，需要赋值】！！
                        "parentName": unitData.info.parentName //父级组织名称[这个服务端不会下发，需要自己赋值]！！
                    },
                    "extendAttrs":extendAttrs
                },
                'type':"post"
            }
        },

        //获取选中的拓展属性【根据不同的弹框类型选取不同的保存数据】
        //目前只有：职能类型，组织类型，扩展类型三个拓展属性
        getSelectedExtendAttr:function(){
            var data=this.getPopOptions(true);
            var rstList=[];
            data.metaData.extendAttrs&&data.metaData.extendAttrs.forEach(function(ele,idx,input){
                if(!ele.needHide&&ele.data){
                    var code=ele.code;
                    var targetEle=ele.data.filter(function(unit,index){
                        return unit.isSelected;
                    });
                    var value=targetEle[0]?targetEle[0].value:null;
                    if(value){
                        rstList.push({code:code,value:value});
                    }
                }
            });
            return rstList.length==0?null:rstList;
        },

        //选择弹框的下拉列表
        selectedItem: function(e) {
            var opts=this.getPopOptions(),formatedData;
            var target = e.target;
            var optionsValue = target.selectedOptions[0].getAttribute("data-val"); //选中项的id
            var id = target.getAttribute("data-id"); //本选项的id
            var cloneContent = JSON.parse(JSON.stringify(this.$store.state.pops.data.content));

            // var isSub= target.selectedOptions[0].getAttribute("data-issub");
            // var popType=target.selectedOptions[0].getAttribute("data-type");
            // var currentSceneInfo=hj.getDataById(hj.spaIns.getCurrentScene()).info;
            
            this.markSelectedItem(cloneContent.contentInfo, id, optionsValue);
            formatedData=this.formatPopState(cloneContent.contentInfo,opts); //this.$store.state.pops.data.content.contentInfo是接口返回的data
            this.$store.commit({
                type: "updatePop",
                data: {
                    content: cloneContent
                }
            });
        },


        //给该栏目的选中的属性做标记【选中属性是个list】
        /*
         cloneData:ajax下发的data数据
         id:拓展信息的那个项的id
         optionsid：拓展信息那个项展开的list中，点击选中的那个子项的id
         */
        markSelectedItem: function(cloneData, id, optionsValue) {
            var extendAttrs = cloneData.metaData.extendAttrs || []; //请求返回的data
            cloneData.metaData.extendAttrs.forEach(function(ele, idx, input) {
                if (ele.id == id) { //遍历拓展属性，找到自己
                    (input[idx].data || []).forEach(function(unit, index, subInput) {
                        if (unit.value == optionsValue) { //自己的拓展属性id和选中的那个属性id做匹配，添加选中标记isSelected
                            subInput[index].isSelected = true;
                        }
                    });
                }
            });
        },


        //core funciton
        //有parentId的，如果他的父级没有选中，就需要隐藏；如果父级选中了一个选项，那么就要把对应的所有和它级联的对象的元素控制显示隐藏：isHide
        //数据结构件见：index-mock.js的crm/org/ GetNodeExtAttr 属性的case3
        //1.父级有选中，展示对应选项
        //2.父级没有选中||没有父级，隐藏所有子项
        //给extendAttrs的对象单元添加needHide，控制是否展示这个元素节点
        //给extendAttrs的对象单元中的data的单元添加isHide，控制option元素是否展示
        formatPopState: function(cloneData,opts) {
            var self = this;
            var extendAttrs = cloneData.metaData.extendAttrs || []; //请求返回的data
            if (cloneData.rowData) { //因为后台不会返回父节点名称，需要从之前的请求获取，然后到这里赋值
                cloneData.rowData.parentName = opts.parentName;
                cloneData.rowData.type=opts.type;
                cloneData.rowData.isSub=opts.isSub;
                cloneData.rowData.title=opts.title;
                cloneData.rowData.isActive=opts.isActive;
                //和checkedBoxList里面的value通过v-model="data.content.contentInfo.rowData.isActive"，来实现和isActive同步
                cloneData.rowData.checkedBoxList=[{text:"启用",value:"true"},{text:"禁用",value:"false"}];
            }

            //这里的逻辑复杂了，【用ajax选择后获取级联信息，就没那么多事情了，哎，暂时这么做吧，以后决不能妥协】
            // 1.按照顺序对每个object做解析（每一个对象对应一行拓展属性）
            // 2.如果是顶级级联属性（parentId为null）就直接展示，如果不是顶级级联项就直接隐藏
            // 3.寻找每个顶级级联项的1级关联项，（顶级级联项的nextOptionCode和其他的optionCode匹配），展示他们
            // 4.寻找1级机联项的2级机联项，（1级机联项的nextOptionCode和2级机联项optionCode匹配），展示他们
            // 5.依次类推，直到最后一级，那一级没有nextOptionCode或者找不到optionCode
            extendAttrs.forEach(function(ele, idx, input) { //联动的顶级节点
                if (!ele.parentId) { //顶层展示
                    input[idx].needHide = false;
                } else { //非顶层元素需要判断是否需要展示
                    input[idx].needHide = self.checkHasRelated(input[idx],extendAttrs) ? true : false;
                }
            });
            this.setLocalstorage(opts,cloneData);
            return cloneData;
        },

        /*
         desc:设置保存参数
         @param
            opts:{ //弹框基础信息
                    title: title,
                    parentName: nodeName,//父节点名称
                    type: typeDes,//edit还是create
                    isSub: false//是否是新增子集
                }
            targetData：弹框请求返回后，再进过格式化的数据，用于渲染pop
         */
        setLocalstorage:function(opts,targetData){
            //添加pop 缓存
            if(targetData){//格式化后的弹框返回数据

                /*
                 *逻辑梳理：新增，编辑，以及里面的修改input，selected，启用禁用等操作，都等修改更新opts
                 */
                if(opts.type=="edit"){
                    localStorage["currentEditPopInfo"]=JSON.stringify(targetData);
                }else{
                    if(opts.isSub){
                        localStorage["currentAddedPopInfo"]=JSON.stringify(targetData);
                    }else{
                        localStorage["currentAddedSubPopInfo"]=JSON.stringify(targetData);
                    }
                }
            }else{//没有第二个参数，说明保存的只是编辑的数据
                localStorage["CurPopOptions"]=JSON.stringify(opts);
            }
        },

        //获取当前弹框的数据
        getPopOptions:function(isAllData){
            var opts=localStorage["CurPopOptions"]?JSON.parse(localStorage["CurPopOptions"]):{};
            if(opts.type=="edit"){
                return localStorage["currentEditPopInfo"]?(isAllData?JSON.parse(localStorage["currentEditPopInfo"]):JSON.parse(localStorage["currentEditPopInfo"]).rowData):null;
            }else{
                if(opts.isSub){
                    return localStorage["currentAddedPopInfo"]?(isAllData?JSON.parse(localStorage["currentAddedPopInfo"]):JSON.parse(localStorage["currentAddedPopInfo"]).rowData):null;
                }else{
                    return localStorage["currentAddedSubPopInfo"]?(isAllData?JSON.parse(localStorage["currentAddedSubPopInfo"]):JSON.parse(localStorage["currentAddedSubPopInfo"]).rowData):null;
                }
            }
        },

        //判定保存节点请求参数是否正确
        checkValidSaveParam:function(param){
            var isAllValid=false;
            var validNodeName=this.checkNodeName(param);//check方法里面做对应操作还是后续统一做对应操作
            var validFunctionType=this.checkFunctionType(param);
            var validOrganizationType=this.checkOrganizationType(param);
            var validExtendType=this.checkExtendType(param);
            var msg="";
            if(validNodeName.isValid&&validFunctionType.isValid&&validOrganizationType.isValid&&validExtendType.isValid){
                isAllValid=true;
            }else{
                if(!validNodeName.isValid){
                    msg=validNodeName.msg;
                }else if(!validFunctionType.isValid){
                    msg=validFunctionType.msg;
                }else if(!validOrganizationType.isValid){
                    msg=validOrganizationType.msg;
                }else if(!validExtendType.isValid){
                    msg=validExtendType.msg;
                }
                this.showAlert({title:"提示",msg:msg});
            }
            return isAllValid
        },


        checkNodeName:function(param){
            var rst={
                isValid:false,
                msg:NotesInfo.nodeName//提示信息
            };
            if(param.data&&param.data.rowData&&param.data.rowData.nodeName){
                rst.isValid=true;
            }

            return rst;
        },

        // functionName:"职能类型",
        // organizationName:"职能类型",
        // extendName:"职能类型"
        checkFunctionType:function(param){
            return {
                isValid:this.checkHasType(NotesInfo.functionName)||false,
                msg:NotesInfo.functionType//提示信息
            };
        },

        checkOrganizationType:function(param){
            return {
                isValid:this.checkHasType(NotesInfo.organizationName)||false,
                msg:NotesInfo.organizationType//提示信息
            };
        },

        checkExtendType:function(param){
            return {
                isValid:this.checkHasType(NotesInfo.extendName)||false,
                msg:NotesInfo.extendType//提示信息
            };
        },

        checkHasType:function(type){
            var hasType=false;
            var data=this.getPopOptions(true);
            if(data&&data.metaData&&data.metaData.extendAttrs&&_.isArray(data.metaData.extendAttrs)){
                var targetEle=data.metaData.extendAttrs.filter(function(ele,idx,input){
                    return ele.name===type
                });
                if(targetEle[0]){
                    hasType=(targetEle[0].data||[]).some(function(unit,index){
                        return unit.isSelected
                    });
                }
            }

            return hasType;
        },

        //验证该元素是否需要展示，如果需要展示，找到他的上级级联元素，拿到上级的selected，处理该元素的isHide
        //target：拓展属性1级子元素，也就是extendAttrs数组中的那个对象，判断这个对象是否需要展示
        checkHasRelated: function(target,extendAttrs) {
            var self = this;
            var needHide = true;
            extendAttrs.forEach(function(ele, idx, input) {
                if (target && target.parentId == input[idx].id) { //找到input级联项（遍历最外层的对象数组）

                    //找到父级选中的那个选中项
                    var tgEle = (input[idx].data || []).filter(function(unit) {
                        return unit.isSelected
                    });
                    var nextOptionCode = tgEle[0]?tgEle[0].nextOptionCode:null;//找到下拉选中的那个nextOptionCode

                    if (nextOptionCode) { //父级有isSelected

                        //判断是否和父级级联选中的那个项有关联
                        var hasRelated = (target.data || []).some(function(subUnit) {
                            return subUnit.optionCode == nextOptionCode
                        });

                        if (hasRelated) { //该元素有级联的父级级联元素
                            if (!input[idx].parentId) { //同时父级级联是最顶级的
                                needHide = false;
                                (target.data || []).forEach(function(sub, index, subInput) {
                                    if (subInput[index].optionCode != nextOptionCode) { //没有和父级关联就需要隐藏
                                        subInput[index].isHide = true
                                    }
                                });
                            } else { //父级不是顶级级联项，需要再往上找，万一最上层的级联不是顶级级联项，就不需要展示了
                                needHide = self.checkHasRelated(input[idx],extendAttrs);
                            }
                        }
                    }
                }
            });
            return needHide;
        },

        //修改组织名称:v-model已经实现双向绑定，这里只要同步数据到localstorage即可
        unitNameChange:function(e){
            var self=this;
            clearTimeout(window.inputChange);
            window.inputChange=setTimeout(function(){//防止频繁输出操作量过大
                var targetData=self.getPopOptions(true);
                var opts=targetData.rowData;
                opts.nodeName=self.data.content.contentInfo.rowData.nodeName;
                self.setLocalstorage(opts,targetData);
            },300);//300毫秒之内的输入都不保存
        },

        //修改组织状态v-model已经绑定，只要把数据同步到localstorage即可
        unitStateChange:function(e){
            var targetData=this.getPopOptions(true);
            var opts=targetData.rowData;
            opts.isActive=this.data.content.contentInfo.rowData.isActive=="true"?true:false;
            this.setLocalstorage(opts,targetData);
        }
    },
    template: newTemplate //第一个是自己的template，后面的是继承父组件的tempalte，第三个参数表示，默认的继承都是把父组件中的{{content}}
};


export default Pop