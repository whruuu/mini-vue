import { extend } from './../shared/index';
import { isObject } from "../shared"
import { track, trigger } from "./effect"
import { reactive, ReactiveFlags, readonly } from "./reactive"

// 这样只在初始化的时候调用一次函数
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true,true)

function createGetter(isReadOnly=false,shallow=false){
    return function get(target,key){
        if(key===ReactiveFlags.IS_REACTIVE){
            return !isReadOnly
        }else if(key === ReactiveFlags.IS_READONLY){
            return isReadOnly
        }

        const res = Reflect.get(target,key)

        if(shallow){
            return res
        }

        // 看看res是不是object
        if(isObject(res)){
            return isReadOnly ? readonly(res) : reactive(res)
        }

        if(!isReadOnly){
            //收集依赖
            track(target,key)
        }
        return res
    }
}

function createSetter(){
    return function set(target, key, value){
        const res = Reflect.set(target,key,value)
        //触发依赖
        trigger(target,key)
        return res
    }
}

export const mutableHandler = {
    get,
    set,
}

export const readonlyHandlers = {
    get:readonlyGet,
    set(target, key, value) {
        console.warn(`key:${key} set失败,因为target是readonly的`,target)
        return true
    },
}

export const shallowReadonlyHandlers = extend({},readonlyHandlers,{
    get:shallowReadonlyGet
})