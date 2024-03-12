// 整个mini-vue的出口
export * from "./runtime-dom"

import { baseCompile } from "./compiler-core/src"
import * as runtimeDom from "./runtime-dom"
import { registerRuntimeCompiler } from "./runtime-dom";

function compileToFunction(template) {
    const {code} = baseCompile(template)

    const render = new Function("Vue",code)(runtimeDom)

    return render
}

//通过registerRuntimeCompiler把compileToFunction注入到component，
//将runtime-core和compile-core两个模块解耦
//runtime-core间接引用compile-core的方法
registerRuntimeCompiler(compileToFunction)


// function Function(Vue) {
//     const { 
//         toDisplayString : _toDisplayString,
//         createElementBlock : _createElementBlock 
//     } = Vue

//     return function render(_ctx, _cache, $props, $setup, $data, $options) {
//         return (
//             _openBlock(),
//             _createElementBlock(
//                 "div", 
//                 null, 
//                 "hi," + _toDisplayString(_ctx.message), 
//                 1 /* TEXT */))
//     }
// }