module.exports = {
  extends: ["@tour/eslint-config/base.cjs"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
