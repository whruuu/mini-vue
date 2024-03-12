import { hasOwn } from "../shared/index"

const publicPropertiesMap = {
    $el:(i) => i.vnode.el,
    $slots:(i) => i.slots,
    $props:(i)=>i.props
}

export const PublicInstanceProxyHandlers = {
    get({_:instance},key){
        // 通过setupState获取this.msg
        const {setupState,props} = instance
        
        if(hasOwn(setupState,key)){
            return setupState[key]
        }else if(hasOwn(props,key)){
            return props[key]
        }

        // if(key==="$el"){
            // 这里的instance.type = Component，并没有mountElement，vnode就没有el
            // 应该在mountElement结束之后给instance.vnode.el赋值
            // return instance.vnode.el
        // }
        const publicGetter = publicPropertiesMap[key]
        if(publicGetter){
            return publicGetter(instance)
        }
    },
}