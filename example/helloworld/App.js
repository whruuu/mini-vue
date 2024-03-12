import { h } from "../../lib/whr-mini-vue.esm.js";
import { Foo } from "./Foo.js";
// 直接引用 src\runtime-core\index.ts 是没有的，所以要用rollup先把src下文件打包起来再用
window.self = null;
export const App = {
  //.vue -> <template></template>编译成 -> render() ->需要编译功能
  //视图逻辑这里用render函数，直接返回虚拟节点
  render() {
    window.self = this;
    return h(
      "div",
      {
        id: "root",
        class: ["red,hard"],
        onClick() {
          console.log("click");
        },
        onMousedown() {
          console.log("mouseDown");
        },
      },
      // [
      //   h("p", { class: "red" }, "hi"),
      //   h("p", { class: "blue" }, "mini-vue"),
      // ]
      // this.msg是从setupState取值 -> 创建代理对象挂在instance
      // render函数内的this指向代理对象
      // this.$el -> get root element -> div -> 把渲染时创建的真实元素el存到vnode
      [h("div", {}, "hi," + this.msg), h(Foo, { count: 1 })]
    );
  },
  setup() {
    return {
      msg: "mini-vue-haha",
    };
  },
};
