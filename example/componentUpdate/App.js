import { h, ref } from "../../lib/whr-mini-vue.esm.js";
import Child from "./Child.js";
// 直接引用 src\runtime-core\index.ts 是没有的，所以要用rollup先把src下文件打包起来再用
window.self = null;
export const App = {
  name: "App",
  render() {
    window.self = this;
    return h("div", {}, [
      h("div", {}, "你好"),
      h("button", { onClick: this.changeChildProps }, "change child props"),
      h(Child, { msg: this.msg }),
      h("button", { onClick: this.changeCount }, "change self count"),
      h("p", {}, "count:" + this.count),
    ]);
  },
  setup() {
    const msg = ref("123");
    const count = ref(1);
    window.msg = msg;
    const changeChildProps = () => {
      msg.value = "456";
    };
    const changeCount = () => {
      count.value++;
    };
    return { msg, count, changeChildProps, changeCount };
  },
};
