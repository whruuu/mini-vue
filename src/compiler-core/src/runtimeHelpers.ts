export const TO_DISPLAY_STRING = Symbol('toDisplayString')
export const CREATE_ELEMENT_VNODE = Symbol('createElementVNode')


// 做反向映射
export const helperMapName = {
    // TO_DISPLAY_STRING是变量，所以要加[]
    [TO_DISPLAY_STRING]:"toDisplayString",
    [CREATE_ELEMENT_VNODE]:"createElementVNode"
}