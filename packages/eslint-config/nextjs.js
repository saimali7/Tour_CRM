/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "./base.js",
    "next/core-web-vitals",
    "next/typescript",
  ],
  env: {
    browser: true,
    node: true,
  },
  rules: {
    "react/no-unescaped-entities": "off",
    "@next/next/no-html-link-for-pages": "off",
  },
};
