import { h, createTextVnode } from "../../lib/whr-mini-vue.esm.js";
import { Foo } from "./Foo.js";
export const App = {
  name: "App",
  render() {
    const app = h("div", {}, "App");
    // 子组件定义插槽，父组件使用插槽
    // 子组件使用插槽内容进行渲染，父组件声明插槽内容
    // 需求1：组件节点内传入孩子节点，怎么把孩子放到组件某节点内
    // 需求2：组件节点的孩子节点是 一个vnode || 数组
    // const foo = h(Foo, {}, h("p", {}, "123"));
    // const foo = h(Foo, {}, [h("p", {}, "123"), h("p", {}, "456")]);
    // 需求3：具名插槽：key是name，返回值是vnode数组
    // 需求4：作用域插槽：函数参数是子组件给父组件传的插槽数据
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => [
          h("p", {}, "header" + age),
          createTextVnode("你好呀"),
        ],
        footer: () => h("p", {}, "footer"),
      }
    );

    return h("div", {}, [app, foo]);
  },
  setup() {
    return {};
  },
};
