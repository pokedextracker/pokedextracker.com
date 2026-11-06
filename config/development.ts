import type { Config } from "./types";

export const Development: Config = {
  API_HOST: "/api",
  // The Vite dev server answers /version with this too (vite.config.mts), so
  // the new version banner never shows while developing.
  BUILD: "development",
  ENVIRONMENT: "development",
  ROLLBAR_TOKEN: "19ffd96c890b422287ce3a06a917678e",
  VERSION: "development",
};
