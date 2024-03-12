import {
  h,
  ref,
  nextTick,
  getCurrentInstance,
} from "../../lib/whr-mini-vue.esm.js";
export default {
  name: "App",
  render() {
    window.self = this;
    return h("div", {}, [
      h("button", { onClick: this.onClick }, "update"),
      h("p", {}, "count:" + this.count),
    ]);
  },
  setup() {
    const count = ref(1);
    const instance = getCurrentInstance();
    // onClick的回调是宏任务，宏任务里的同步代码执行完，才会执行该宏任务下的微任务队列
    function onClick() {
      for (let i = 0; i < 100; i++) {
        console.log("update");
        count.value = i;
      }
      console.log(instance); //此时count.value其实已经是99了，但instance上的count值还是1，因为视图还没更新
      // nextTick将函数变成微任务
      nextTick(() => {
        // 视图更新只执行一次
        // 拿到更新完后的视图的数据
        console.log(instance); //此时才更新完视图，instance上的count直接变99
      });
    }
    return { count, onClick };
  },
};
