module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*",
    "/node_modules/**/*",
  ],
  rules: {
    "quotes": ["error", "double"],
    "indent": ["error", 2],
    "no-unused-vars": "warn",
  },
  overrides: [
    {
      files: ["**/*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: ["tsconfig.json"],
        sourceType: "module",
      },
      extends: [
        "eslint:recommended",
        "@typescript-eslint/recommended",
      ],
      plugins: [
        "@typescript-eslint",
      ],
      rules: {
        "@typescript-eslint/no-unused-vars": "warn",
      },
    },
  ],
};