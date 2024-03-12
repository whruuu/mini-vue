import { h, ref } from "../../lib/whr-mini-vue.esm.js";
// 老的是text，新的是text
const nextChildren = [h("div", {}, "A"), h("div", {}, "B")];
const prevChildren = "oldChildren";
export default {
  name: "TextToArray",
  render() {
    const self = this;

    return self.isChange === true
      ? h("div", {}, nextChildren)
      : h("div", {}, prevChildren);
  },
  setup() {
    const isChange = ref(false);

    window.isChange = isChange;

    return {
      isChange,
    };
  },
};
