import { h } from "../../lib/whr-mini-vue.esm.js";
export const Foo = {
  name: "Foo",
  render() {
    const btn = h("button", { onClick: this.emitAdd }, "emitAdd");
    const foo = h("p", {}, "foo");
    return h("div", {}, [foo, btn]);
  },
  // 1.setup传入一个对象，有emit方法
  setup(props, { emit }) {
    const emitAdd = () => {
      // 2.点击btn，用emit触发组件自定义事件，并传入参数
      emit("add", 1, 2);
      emit("add-foo", 1, 2);
    };
    return {
      emitAdd,
    };
  },
};
