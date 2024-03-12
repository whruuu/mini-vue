import { ref } from "../../lib/whr-mini-vue.esm.js";
window.self = null;
export const App = {
  name: "App",
  // template: "<div>hi,{{message}}</div>",
  // setup() {
  //   return {
  //     message: "mini-vue",
  //   };
  // },
  template: "<div>hi,{{count}}</div>",
  setup() {
    const count = (window.count = ref(1));
    return {
      count,
    };
  },
};
