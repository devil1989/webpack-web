// polyfill
// import 'babel-polyfill';

// 三种import方式
// import { createStore, applyMiddleware,bindActionCreators } from 'redux'//redux 基础
// import store from './store/detail'//该页面对应的store
// import * as DetailActions from './actions/detail'//该页面对应的action

import Vue from 'vue';//vue框架的对象
import storeInfo from './index.store.js';//包含了当前页面对应的store信息（以及记过了vue封装）
import Nav from '../components/nav/nav.js';//左侧导航栏
import Pop from '../components/pop/pop.js';//弹框
import Scenes from '../components/combine/combine.js';//中间场景集合（单页切换的就是这些场景）
require("../assets/styles/index.scss");//每个js对应该页面的一个css


Vue.config.devtools = true;



export default {}




