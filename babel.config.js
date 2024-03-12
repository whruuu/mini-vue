module.exports = {
  //告诉bable以当前node版本为基础作为转换
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript",
  ],
};
