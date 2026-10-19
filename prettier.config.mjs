/** @type {import("prettier").Config & import("@ianvs/prettier-plugin-sort-imports").PluginConfig} */
export default {
  importOrder: ["<BUILTIN_MODULES>", "<THIRD_PARTY_MODULES>", "", "^[./]"],
  importOrderTypeScriptVersion: "5.0.4",
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
};
