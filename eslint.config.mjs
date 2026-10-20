import js from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// Prettier formats the code (prettier.config.mjs), so these are only rules
// about the code itself.
export default defineConfig(
  {
    ignores: [
      "build",
      "internal/webapp/dist",
      "playwright-report",
      "public",
      "test-results",
      "tmp",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginQuery.configs["flat/recommended"],
  {
    rules: {
      eqeqeq: "error",
      // Console statements are warnings so the editor can tell them apart
      // from real errors. CI fails on warnings too, so none get checked in.
      "no-console": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-throw-literal": "error",
      // typescript-eslint turns this off because TypeScript checks it, but
      // TypeScript only greys out unreachable code by default.
      "no-unreachable": "error",
      "no-useless-rename": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      "prefer-template": "error",
      radix: "error",
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
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "config/**/*.ts"],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: globals.browser,
    },
    plugins: {
      ...react.configs.flat.recommended.plugins,
      "react-hooks": reactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react/boolean-prop-naming": "error",
      "react/jsx-boolean-value": ["error", "never"],
      "react/jsx-sort-props": "error",
      "react/prop-types": "off",
    },
  },
  {
    files: ["*.{js,mjs,ts,mts}", "e2e/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
);
