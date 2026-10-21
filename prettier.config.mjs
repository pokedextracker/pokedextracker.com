/** @type {import("prettier").Config & import("@ianvs/prettier-plugin-sort-imports").PluginConfig & import("prettier-plugin-tailwindcss").PluginOptions} */
export default {
  importOrder: ["<BUILTIN_MODULES>", "<THIRD_PARTY_MODULES>", "", "^[./]"],
  importOrderTypeScriptVersion: "6.0.3",
  // The Tailwind plugin sorts class names, and has to come last.
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  tailwindStylesheet: "./app/styles/tailwind.css",
  // Class strings outside a className attribute, so they're sorted too: the
  // icon and text classes some components take, the shapes of a radio or
  // checkbox, and the helpers that build class strings. A constant holding
  // classes is tagged with tw (app/utils/tw.ts).
  tailwindAttributes: ["iconClassName", "textClassName", "box", "mark"],
  tailwindFunctions: [
    "classNames",
    "tw",
    "buttonClassName",
    "formControlClassName",
  ],
};
