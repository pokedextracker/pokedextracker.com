import type { Config } from "./types";

export const Development: Config = {
  API_HOST: "/api",
  // The Vite dev server answers /version with this too (vite.config.mts), so
  // the new version banner never shows while developing.
  BUILD: "development",
  ENVIRONMENT: "development",
  SENTRY_DSN:
    "https://5042d6a50748d18f4c6d5495ca48b8c3@o48077.ingest.us.sentry.io/4512390974472192",
  VERSION: "development",
};
