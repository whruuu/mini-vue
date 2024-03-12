import { createRenderer } from "../runtime-core/renderer";

// 导出的接口通用
export * from "../runtime-core"

function createElement(type) {
    return document.createElement(type)
}

function patchProp(el,key,prevVal,nextVal) {
    const isOn = key => /^on[A-Z]/.test(key)
    if(isOn(key)){
        // 给元素注册自定义事件
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event,nextVal)
    }else{
        // 给元素添加属性、修改属性、删除属性
        if(nextVal===undefined||nextVal===null){
            el.removeAttribute(key)
        }else{
            el.setAttribute(key,nextVal)
        }
    }
}

/**
 * 
 * @param child 子节点
 * @param parent 父节点
 * @param anchor 锚点，添加到哪个元素之前
 */
function insert(child,parent,anchor) {
    // anchor为null时，默认添加到最后
    parent.insertBefore(child,anchor || null)
}

function remove(child) {
    const parent = child.parentNode
    if(parent){
        parent.removeChild(child)
    }
}

function setElementText(el,text) {
    el.textContent = text
}

// 不再依赖于具体的实现了，而是依赖于稳定的接口，稳定的接口通过参数的方式传入，这种方式就是组合
// 达到后续可以更换不同的渲染平台的目的
const renderer:any = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
})

export function createApp(...args){
    return renderer.createApp(...args)
}


