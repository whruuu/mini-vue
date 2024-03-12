import { createVNodeCall, NodeTypes } from "../ast";
// 添加Element的helper的插件
export function transformElement (node,context) {
    if(node.type === NodeTypes.ELEMENT){
        // element处理插件退出的时候才执行，所以要return出去；进入的时候执行transformElement()只会返回函数不会执行
        return ()=>{

            //中间处理层

            //tag
            const vnodeTag = `"${node.tag}"`

            //props
            let vnodeProps;

            //children
            const children = node.children
            let vnodeChildren = children[0] //vnodeChildren是compound类型节点

            //修改后的元素节点
            node.codegenNode = createVNodeCall(context,vnodeTag,vnodeProps,vnodeChildren)
        }
    }
}