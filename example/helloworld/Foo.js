import { h } from "../../lib/whr-mini-vue.esm.js";
export const Foo = {
  setup(props) {
    // 1.要实现从setup的props传进来
    console.log(props);
    // 3.props是readonly的响应式对象
  },
  render() {
    // 2.要实现render函数里可以通过this获取props里key的值
    return h("div", {}, "foo: " + this.count);
  },
};
