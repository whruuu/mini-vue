import { generate } from "./codegen";
import { baseParse } from "./parse";
import { transform } from "./transform";
import { transformElement } from "./transforms/transformElement";
import { transformExpression } from "./transforms/transformExpression";
import { transformText } from "./transforms/transformText";

export function baseCompile (template) {
    const ast:any = baseParse(template)
    transform(ast,{
        //注意顺序，先生成COMPOUND节点，再转化元素
        nodeTransforms:[transformExpression,transformElement,transformText]
    })
    return generate(ast)
}