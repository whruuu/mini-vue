import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";


describe('transform', () => {
  it('happy path', () => {
    const ast = baseParse("<div>hi,{{message}}</div>")

    const plugin = (node) => {
        if(node.type===NodeTypes.TEXT){
            node.content = node.content + "mini-vue"
        }
    }
    
    // 程序变动点由外部控制，把想要处理的逻辑通过plugin传入，内部处理完把关键数据比如node返回出来
    transform(ast,{
        nodeTransforms:[plugin]
    })

    const nodeText = ast.children[0].children[0]
    expect(nodeText.content).toBe("hi,mini-vue")
  });
})
