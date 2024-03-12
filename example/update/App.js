import { h, ref } from "../../lib/whr-mini-vue.esm.js";

export const App = {
  name: "App",
  render() {
    return h(
      "div",
      {
        id: "root",
        ...this.props,
      },
      [
        h("div", {}, "count:" + this.count),
        h("button", { onClick: this.onClick }, "click"),
        h(
          "button",
          { onClick: this.onChangePropsDemo1 },
          "changeProps-foo值改变了-new-foo-修改"
        ),
        h(
          "button",
          { onClick: this.onChangePropsDemo2 },
          "changeProps-foo值改变了-undefined -删除"
        ),
        h(
          "button",
          { onClick: this.onChangePropsDemo3 },
          "changeProps- 删除bar属性"
        ),
      ]
    );
  },
  setup() {
    const count = ref(0);
    const onClick = () => {
      count.value++;
    };

    const props = ref({
      foo: "foo",
      bar: "bar",
    });
    const onChangePropsDemo1 = () => {
      props.value.foo = "new-foo";
    };

    const onChangePropsDemo2 = () => {
      props.value.foo = undefined;
    };

    const onChangePropsDemo3 = () => {
      props.value = {
        foo: "foo",
      };
    };

    return {
      count,
      onClick,
      onChangePropsDemo1,
      onChangePropsDemo2,
      onChangePropsDemo3,
      props,
    };
  },
};
