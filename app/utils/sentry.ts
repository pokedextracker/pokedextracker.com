import * as Sentry from "@sentry/react";

import { Config } from "../../config";

// initSentry turns on error reporting for uncaught errors and unhandled
// rejections. Development sends nothing. Errors only count when they come from
// the site's own scripts, so ones from browser extensions and injected scripts
// don't use up the quota.
export function initSentry() {
  Sentry.init({
    dsn: Config.SENTRY_DSN,
    enabled: Config.ENVIRONMENT !== "development",
    environment: Config.ENVIRONMENT,
    release: Config.VERSION,
    allowUrls: [/^https:\/\/(staging\.)?pokedextracker\.com\//],
  });
}
