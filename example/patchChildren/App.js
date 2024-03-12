import { h } from "../../lib/whr-mini-vue.esm.js";
import ArrayToText from "./ArrayToText.js";
import TextToText from "./TextToText.js";
import TextToArray from "./TextToArray.js";
import ArrayToArray from "./ArrayToArray.js";
export const App = {
  name: "App",
  render() {
    return h(
      "div",
      {
        tId: 1,
      },

      [
        h("div", {}, "主页"),
        // h(ArrayToText),
        // h(TextToText),
        // h(TextToArray),
        h(ArrayToArray),
      ]
    );
  },
  setup() {
    return {
      msg: "mini-vue-haha",
    };
  },
};
