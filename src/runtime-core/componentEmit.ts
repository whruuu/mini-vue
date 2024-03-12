import { camelize, toHandlerKey } from "../shared/index"

// emit("add")
export function emit (instance,event,...args) {
    // console.log('emit',event)
    const {props} = instance
    
    // TDD思想：具体->通用
    // add -> Add
    // add-foo -> addFoo -> AddFoo
    
    const handlerName = toHandlerKey(camelize(event))
    const handler = props[handlerName]
    // 如果有就调用事件的回调函数
    handler && handler(...args)
}