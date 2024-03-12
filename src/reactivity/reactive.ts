import { isObject } from './../shared/index';
import { mutableHandler, readonlyHandlers ,shallowReadonlyHandlers} from "./baseHandlers";

export const enum ReactiveFlags {
    IS_REACTIVE="_v_isReactive",
    IS_READONLY="_v_isReadonly"
}

export function reactive (raw) {
    return createReactiveObject(raw,mutableHandler)
}

export function readonly (raw) {
    return createReactiveObject(raw,readonlyHandlers)
}

export function shallowReadonly (raw) {
    return createReactiveObject(raw,shallowReadonlyHandlers)
}

function createReactiveObject(target: any,baseHandlers) {
    if(!isObject(target)){
        console.warn(`target ${target}必须是一个对象`)
        return target
    }
    return new Proxy(target, baseHandlers);
}

export function isReactive (value) {
    // 当value是reactive时,会触发get函数;
    // 当value不是reactive时,由于value没有ReactiveFlags.IS_REACTIVE属性,会返回undefined,去两次反转为布尔值即可
    return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly (value) {
    return !!value[ReactiveFlags.IS_READONLY]
    
}

export function isProxy (value) {
    return isReactive(value) || isReadonly(value)
}

