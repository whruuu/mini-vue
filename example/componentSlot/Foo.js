import { h, renderSlots } from "../../lib/whr-mini-vue.esm.js";
export const Foo = {
  name: "Foo",
  render() {
    const foo = h("p", {}, "foo");
    const age = 18;
    return h("div", {}, [
      renderSlots(this.$slots, "header", {
        age,
      }),
      foo,
      renderSlots(this.$slots, "footer"),
    ]);
  },
  // 1.setup传入一个对象，有emit方法
  setup() {
    return {};
  },
};
