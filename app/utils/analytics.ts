// Umami's tracker, which the server adds to the page only when analytics are
// set up (pkg/server/analytics.go). It records pageviews, including route
// changes, on its own. Without it, events go nowhere.
declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string>) => void;
    };
  }
}

// trackEvent records something a visitor did, as "Category: action" (like
// "Dex: create"). label adds detail, like which box was marked.
export function trackEvent(category: string, action: string, label?: string) {
  window.umami?.track(
    `${category}: ${action}`,
    label === undefined ? undefined : { label },
  );
}
