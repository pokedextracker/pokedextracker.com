/** @type {import("prettier").Config & import("@ianvs/prettier-plugin-sort-imports").PluginConfig} */
export default {
  importOrder: ["<BUILTIN_MODULES>", "<THIRD_PARTY_MODULES>", "", "^[./]"],
  importOrderTypeScriptVersion: "6.0.3",
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
};
