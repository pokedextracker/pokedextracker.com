import * as Sentry from "@sentry/react";

import { Config } from "../../config";
import { PokedexTrackerError } from "./api";

// groupApiErrors puts each kind of failed API request in its own issue. Sentry
// groups by stack trace, and every API error's is the same (handleResponse,
// since the caller is lost across the await), so otherwise a deleted account
// and a wrong account's token would share one issue, and resolving it for one
// would hide the other. The API's error code, like "forbidden" or
// "deleted_user", tells them apart. Anything else keeps Sentry's grouping.
export function groupApiErrors<E extends { fingerprint?: string[] }>(
  event: E,
  hint: { originalException?: unknown },
): E {
  const error = hint.originalException;
  if (error instanceof PokedexTrackerError && error.code) {
    event.fingerprint = ["{{ default }}", error.code];
  }
  return event;
}

// initSentry turns on error reporting for uncaught errors and unhandled
// rejections. Development sends nothing. Errors only count when they come from
// the site's own scripts, so ones from browser extensions and injected scripts
// don't use up the quota. That means the bundles under /assets/, not the page
// itself: in-app browsers like the Google app on iOS inject scripts that report
// the page's URL as theirs, and the page's own inline scripts either run before
// Sentry starts or catch their errors. The check needs a stack trace, so
// extension errors that come without one are dropped by their message instead.
export function initSentry() {
  Sentry.init({
    dsn: Config.SENTRY_DSN,
    enabled: Config.ENVIRONMENT !== "development",
    environment: Config.ENVIRONMENT,
    release: Config.VERSION,
    allowUrls: [/^https:\/\/(staging\.)?pokedextracker\.com\/assets\//],
    ignoreErrors: [
      // A Safari extension on iOS failing to message its own tab. The site
      // never calls the extension API.
      /runtime\.sendMessage\(\)/,
    ],
    beforeSend: groupApiErrors,
  });
}
