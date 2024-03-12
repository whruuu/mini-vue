// 程序变动点和稳定点分离开，保证了代码的可测试性
// 程序变动点由外部控制，把想要处理的逻辑通过plugin传入，内部处理完把关键数据比如node返回出来

import { NodeTypes } from "./ast"
import { TO_DISPLAY_STRING } from "./runtimeHelpers"

// 本模块代码是程序稳定点
export function transform (root,options={}) {
    const context = createTransformContext(root,options)
    // 1.遍历 - 深度优先搜索
    // 2.修改 - text的content ->放在plugin
    traverseNode(root,context)
    createRootCodegen(root)
    // 把节点生成code需要的外部函数放在root.helpers上
    root.helpers = [...context.helpers.keys()]
}

function createRootCodegen(root: any) {
    const child = root.children[0]  
    if(child.type === NodeTypes.ELEMENT){   //这个判断条件合适吗
        //codegenNode是transformElement处理过的vnodeElement节点
        root.codegenNode = child.codegenNode    
    }else{
        //没被处理过
        root.codegenNode = root.children[0]
    }
}

function createTransformContext(root: any, options: any) {
    // 全局上下文对象
    const context = {
        root,
        nodeTransforms:options.nodeTransforms || [],
        helpers:new Map(),
        helper(key){
            context.helpers.set(key,1)
        }
    }
    return context
}

function traverseNode(node: any,context) {

    const nodeTransforms = context.nodeTransforms
    let exitFns:any = []

    // 进入时把插件处理函数存起来
    for (let i = 0; i < nodeTransforms.length; i++) {
        const nodeTransform = nodeTransforms[i];
        const onExit = nodeTransform(node,context)
        if(onExit) exitFns.push(onExit)
    }
    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING)
            break;
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            traverseChildren(node, context)
            break;
    
        default:
            break;
    }

    // 退出的时候倒着执行插件处理函数
    let i = exitFns.length
    while(i--){
        exitFns[i]()
    }
}

function traverseChildren(node: any, context: any) {
    const children = node.children

    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i]
            traverseNode(node, context)
        }
    }
}



