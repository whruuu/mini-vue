import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";
import { transformElement } from "../src/transforms/transformElement";
import { transformExpression } from "../src/transforms/transformExpression";
import { transformText } from "../src/transforms/transformText";

describe('codegen', () => {
  it('string', () => {
    const ast = baseParse("hi")
    transform(ast)
    const {code} = generate(ast)
    // 快照（string）
    // 1.抓bug
    // 2.有意更改，在运行的时候命令行加-- -u。
    expect(code).toMatchSnapshot()
  });

  it('interpolation', () => {
    const ast = baseParse("{{message}}")
    // 把对表达式节点的处理用插件transformExpression的方式传入
    transform(ast,{
        nodeTransforms:[transformExpression]
    })
    const {code} = generate(ast)
    expect(code).toMatchSnapshot()
  });


  it('element', () => {
    const ast:any = baseParse("<div>hi,{{message}}</div>")
    // 把对表达式节点的处理用插件transformExpression的方式传入
    transform(ast,{
        //注意顺序，先生成COMPOUND节点，再转化元素
        nodeTransforms:[transformExpression,transformElement,transformText]
    })
    console.log("ast------",ast,ast.codegenNode.children)
    const {code} = generate(ast)
    expect(code).toMatchSnapshot()
  });
})
