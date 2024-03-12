import { NodeTypes } from "../ast";

// 处理插值语法里的表达式的插件，node是插值节点。{{message}} -> {{_ctx.message}}
export function transformExpression (node) {
    if(node.type === NodeTypes.INTERPOLATION){
        node.content = processExpression(node.content)
    }
}

// 这里的node是message表达式
function processExpression(node) {
    node.content = "_ctx." + node.content
    return node
}