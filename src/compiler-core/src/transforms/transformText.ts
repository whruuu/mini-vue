import { NodeTypes } from "../ast";
import { isText } from "../uils";

export function transformText (node) {
    if(node.type===NodeTypes.ELEMENT){
        // Text处理插件退出的时候才执行，所以要return出去；进入的时候执行transformText()只会返回函数不会执行
        return () => {
            const {children} = node
            // 新树新加的一层节点，为复合类型
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if(isText(child)){
                    for (let j = i+1; j < children.length; j++) {
                        const next = children[j];
                        if(isText(next)){
                            // 初始化，孩子节点的第一个节点转为复合节点的父节点
                            if(!currentContainer){
                                currentContainer = children[i] = {
                                    type:NodeTypes.COMPOUND_EXPRESSION,
                                    children:[child]
                                }
                            }

                            currentContainer.children.push(" + ") //字符串类型
                            currentContainer.children.push(next) //对象类型
                            children.splice(j,1)
                            j--
                        }else{
                            // 必须是连续的两个text节点才能转为复合节点
                            currentContainer = undefined
                            break
                        }
                    }
                }
            }
        }
        
    }
    
}