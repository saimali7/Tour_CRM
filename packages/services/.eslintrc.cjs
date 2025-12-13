module.exports = {
  extends: ["@tour/eslint-config/base.js"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
