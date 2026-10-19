module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  ignorePatterns: ["public", "build", "tmp", "internal/webapp/dist"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: "16",
    },
  },
  plugins: ["react", "@typescript-eslint", "@tanstack/query"],
  globals: {
    find: "off",
  },
  extends: [
    "plugin:react/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@tanstack/eslint-plugin-query/recommended",
  ],
  // Prettier formats the code (prettier.config.mjs), so these are only rules
  // about the code itself.
  rules: {
    eqeqeq: "error",
    "no-cond-assign": "error",
    // We're making console statements report as warnings, so that it's easier
    // to tell in the editor when there are real errors vs just console
    // statements. But CI checks that there aren't any warnings in addition to
    // errors, so we're still enforcing that no console statements are checked
    // in.
    "no-console": "warn",
    "no-debugger": "error",
    "no-delete-var": "error",
    "no-dupe-args": "error",
    "no-dupe-else-if": "error",
    "no-duplicate-case": "error",
    "no-empty": "error",
    "no-empty-pattern": "error",
    "no-eval": "error",
    "no-ex-assign": "error",
    "no-func-assign": "error",
    "no-implied-eval": "error",
    "no-import-assign": "error",
    "no-invalid-regexp": "error",
    "no-irregular-whitespace": "error",
    "no-misleading-character-class": "error",
    "no-redeclare": "off", // TypeScript extension
    "no-regex-spaces": "error",
    "no-shadow": "off", // TypeScript extension
    "no-shadow-restricted-names": "error",
    "no-throw-literal": "error",
    "no-undef": "error",
    "no-unexpected-multiline": "error",
    "no-unreachable": "error",
    "no-unused-vars": "off", // TypeScript extension
    "no-use-before-define": "off", // TypeScript extension
    "no-useless-rename": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-const": ["error", { destructuring: "all" }],
    "prefer-template": "error",
    radix: "error",
    "react/boolean-prop-naming": "error",
    "react/jsx-boolean-value": [
      "error",
      "never",
      {
        always: [
          // We always want isRange because of the DatePicker component. The type
          // of its props uses a union type, so the JSX needs to explicitly be a
          // boolean value, not just the presence of the prop.
          "isRange",
        ],
      },
    ],
    "react/jsx-sort-props": "error",
    "react/jsx-uses-react": "off",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    yoda: "error",
    "@typescript-eslint/array-type": ["error", { default: "array" }],
    "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { fixStyle: "inline-type-imports" },
    ],
    "@typescript-eslint/method-signature-style": "error",
    "@typescript-eslint/no-confusing-non-null-assertion": "error",
    "@typescript-eslint/no-redeclare": "error",
    "@typescript-eslint/no-shadow": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-use-before-define": "off",
  },
};
