export * from "./toDisplayString"

export const extend = Object.assign;

export const EMPTY_OBJ = {}

export const isObject = (val)=>{
    return val!==null && typeof val === "object"
}

export const isString = (val) => typeof val === "string"

export const hasChanged = (val,newValue)=>{
    return !Object.is(val,newValue)
}

export const hasOwn = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key)

// 转为驼峰命名 add-foo -> addFoo
export const camelize = (str:string)=>{
    return str.replace(/-(\w)/g,(_,c:string)=>{
        return c ? c.toUpperCase() : ""
    })
}

// 首字母大写 addFoo -> AddFoo
const capitalize = (str:string) => {
    return str[0].toUpperCase()+str.slice(1)
}

// 事件回调函数的key addFoo -> onAddFoo
export const toHandlerKey = (str:string)=>{
    return str?"on"+capitalize(str):""
}