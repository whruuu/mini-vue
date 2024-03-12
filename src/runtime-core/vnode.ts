import { isObject } from './../shared/index';
import { ShapeFlags } from "../shared/ShapeFlags"

export const Fragment = Symbol("Fragment")
export const Text = Symbol("Text")

export {createVnode as createElementVNode}

export function createVnode (type,props?,children?) {
    const vnode = {
        type,
        props,
        children,
        el:null,
        shapeFlag:getShapeFlag(type),
        key:props && props.key,
        component:null
    }

    if(typeof children === "string"){
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    }else if(Array.isArray(children)){
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    }

    // 判断children为slot  => 组件节点 && chidren object
    if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
        if(isObject(children)){
            vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
        }
    }
    return vnode
}

export function createTextVnode(text:string) {
    return createVnode(Text,{},text)
}

function getShapeFlag(type) {
    return typeof type === "string" ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}