import { h } from "../../lib/whr-mini-vue.esm.js";
import { Foo } from "./Foo.js";
export const App = {
  name: "App",
  render() {
    return h("div", {}, [
      h("div", {}, "App"),
      h(Foo, {
        // add -> Add
        onAdd(a, b) {
          console.log("onAdd", a, b);
        },
        // add-foo -> AddFoo
        onAddFoo(a, b) {
          console.log("onAddFoo", a, b);
        },
      }),
    ]);
  },
  setup() {
    return {};
  },
};
