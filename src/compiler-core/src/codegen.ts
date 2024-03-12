import { isString } from "../../shared"
import { NodeTypes } from "./ast"
import { CREATE_ELEMENT_VNODE, helperMapName, TO_DISPLAY_STRING } from "./runtimeHelpers"

// 只负责生成代码，不负责对ast做处理
export function generate (ast) {
    const context = createCodegenContext()
    const {push} = context

    // 导入函数
    genFunctionPreamble(ast,context)

    // render函数
    push("return ")
    const functionName = "render"
    const args = ["_ctx","_cache"]
    const signature = args.join(", ")
    // 拼接函数名和参数
    push(`function ${functionName}(${signature}){`)
    // 拼接函数返回值
    // 不想关心ast的结构,把获取codegenNode的逻辑放在transform,ast.codegenNode = ast.children[0]
    push(`return `)
    genNode(ast.codegenNode, context)   
    push("}")

    return {
        code:context.code
    }
}

function createCodegenContext() {
    const context = {
        code:"",
        push(source){
            context.code+=source
        },
        helper(key){
            return `_${helperMapName[key]}`
        }
    }
    return context
}

function genFunctionPreamble(ast: any,context) {
    const {push} = context
    const VueBinding = "Vue"
    
    const aliasHelper = (s) =>{
        return `${helperMapName[s]} : _${helperMapName[s]}`
    } 
    if(ast.helpers.length>0){
        push(`const { ${ast.helpers.map(aliasHelper).join(",")} } = ${VueBinding}`)
    }
    push("\n")
}

function genNode(node: any, context) {
    switch (node.type) {
        case NodeTypes.TEXT:
            genText(context, node)
            break;
        case NodeTypes.INTERPOLATION:
            genInterpolation(node,context)
            break;
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node,context)
            break;
        case NodeTypes.ELEMENT:
            genElement(node,context)
            break;
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node,context)
            break
        default:
            break;
    }
}

// 复合类型节点
function genCompoundExpression(node: any, context: any) {
    const {push} = context
    const {children} = node
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if(isString(child)){
            push(child)
        }else{
            genNode(child,context)
        }
    }
}

function genElement(node,context) {
    const {push,helper} = context
    const {tag,props,children} = node
    // 不想知道ast树的结构，把children[0]逻辑提前在transformElement里处理好
    // const child = children[0]
    push(`${helper(CREATE_ELEMENT_VNODE)}(`)
    genNodeList(genNullable([tag,props,children]),context)
    push(")")
}

function genNullable(args: any[]) {
    return args.map((arg) => arg || "null")
}

function genNodeList(nodes,context) {
    const {push} = context
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if(isString(node)){
            push(node)
        }else{
            genNode(node,context)
        }

        if(i < nodes.length-1){
            push(", ")
        }
    }
}

function genText(context: any, node: any) {
    const {push} = context
    push(`"${node.content}"`)
}

function genInterpolation(node: any, context: any) {
    const {push,helper} = context
    push(`${helper(TO_DISPLAY_STRING)}(`)
    genNode(node.content,context)
    push(")")
}

function genExpression(node: any, context: any) {
    const {push} = context
    push(`${node.content}`)
}



