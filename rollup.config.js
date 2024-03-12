import typescript from "@rollup/plugin-typescript";
export default {
  input: "./src/index.ts",
  output: [
    // 库一般会打包成2种类型模块规范：
    // 1.cjs -> commonjs
    // 2.esm -> 标准化的模块规范
    {
      format: "cjs",
      file: "lib/whr-mini-vue.cjs.js",
    },
    {
      format: "es",
      file: "lib/whr-mini-vue.esm.js",
    },
  ],

  // 代码是ts写的，要用插件编译一下
  plugins: [typescript()],
};
