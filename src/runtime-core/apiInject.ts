import { getCurrentInstance } from "./component";

export function provide (key,value) {
    // 存
    const currentInstance:any = getCurrentInstance()
    if(currentInstance){
        // 当前组件没有用到provide时，provide就默认指向父级的provide
        let {provides} = currentInstance
        const parentProvides = currentInstance.parent.provides
        if(provides===parentProvides){
            //init 当前组件第一次调用provide ，provides的原型指向父级provides
            provides = currentInstance.provides = Object.create(parentProvides)    //parentProvides是provides的原型
        }
        // 当前组件再次调用provide时，只给provides添加属性
        provides[key] = value
    }
}

export function inject (key,defaultValue) {
    // 取
    const currentInstance:any = getCurrentInstance()
    if(currentInstance){
        const parentProvides = currentInstance.parent.provides
        if(key in parentProvides){
            return parentProvides[key]
        }else if(defaultValue){
            if(typeof defaultValue === "function"){
                return defaultValue()
            }
            return defaultValue
        }
    }
}