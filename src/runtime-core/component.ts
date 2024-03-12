import { proxyRefs } from '../reactivity';
import { shallowReadonly } from '../reactivity/reactive';
import { emit } from './componentEmit';
import { initProps } from './componentProps';
import { PublicInstanceProxyHandlers } from './componentPublicInstance';
import { initSlots } from './componentSlots';
export function createComponentInstance (vnode,parent) {
    const component={
        vnode,
        type:vnode.type,
        setupState:{},
        props:{},
        emit:()=>{},
        slots:{},
        provides:parent?parent.provides:{},
        parent,
        isMounted:false,
        subTree:{},
        next:null,//下次要更新的vnode
    }
    // emit.bind(null,component) emit第一个参数写死component占位，用户就只需要传event
    component.emit = emit.bind(null,component) as any
    return component
}

export function setupComponent (instance) {
    initProps(instance,instance.vnode.props)
    initSlots(instance,instance.vnode.children)
    // 初始化一个有状态的component，函数组件是没有状态的
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
    const Component = instance.type
    // {} -> ctx
    instance.proxy = new Proxy({_:instance},PublicInstanceProxyHandlers)
    const {setup} = Component
    if(setup){
        // 在调用组件的setup函数之前赋值给currentInstance
        // setup函数调用时，getCurrentInstance()的时候就是当前组件了
        setCurrentInstance(instance)
        // 返回两种结果：function Object
        const setupResult = setup(shallowReadonly(instance.props),{
            emit:instance.emit
        })
        // 调用完setup函数，清空currentInstance
        setCurrentInstance(null)
        handleSetupResult(instance,setupResult)
    }
}
function handleSetupResult(instance,setupResult: any) {
    //function

    //Object
    if(typeof setupResult === "object"){
        instance.setupState = proxyRefs(setupResult) 
    }

    finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
    const Component = instance.type

    // 用户如果写了render函数，它的优先级是最高的
    if(compiler && !Component.render){
        // 判断用户是否提供template
        if(Component.template){
            Component.render = compiler(Component.template)
        }
    }

    instance.render = Component.render
}

// 中间变量，获取当前instance
let currentInstance = null

// 封装为函数的好处：当currentInstance = instance发生错误时，在函数内打断点即可，否则不知道是哪个赋值出错了
export function setCurrentInstance(instance) {
    currentInstance = instance
}

export function getCurrentInstance () {
    return currentInstance
}


// 依赖注入
let compiler;
export function registerRuntimeCompiler(_compiler){
    compiler = _compiler
}
