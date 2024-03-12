import { h, provide, inject } from "../../lib/whr-mini-vue.esm.js";
const Provider = {
  name: "Provider",
  render() {
    return h("div", {}, [h("p", {}, "Provider"), h(ProviderTwo)]);
  },
  setup() {
    provide("foo", "fooVal");
    provide("bar", "barVal");
  },
};

const ProviderTwo = {
  name: "ProviderTwo",
  render() {
    return h("div", {}, [
      h("p", {}, `ProviderTwo foo:${this.foo}`),
      h(Consumer),
    ]);
  },
  setup() {
    provide("foo", "fooTwo");
    const foo = inject("foo");
    return {
      foo,
    };
  },
};

const Consumer = {
  name: "Consumer",
  render() {
    return h("div", {}, `Consumer:-${this.foo}-${this.bar}-${this.baz}`);
  },
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    // 扩展1、祖级组件没有baz，则返回默认值
    // const baz = inject("baz", "bazDefault");
    // 扩展2、允许用户默认值传入函数
    const baz = inject("baz", () => "bazDefault");

    return {
      foo,
      bar,
      baz,
    };
  },
};

export default {
  name: "App",
  setup() {},
  render() {
    return h("div", {}, [h("p", {}, "apiInject"), h(Provider)]);
  },
};
