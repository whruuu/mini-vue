import { h, getCurrentInstance } from "../../lib/whr-mini-vue.esm.js";
export const Foo = {
  name: "Foo",
  render() {
    return h("div", {}, "foo");
  },
  // 1.setup传入一个对象，有emit方法
  setup() {
    const instance = getCurrentInstance();
    console.log("Foo:", instance);
    return {};
  },
};
