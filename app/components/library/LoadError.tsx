import { useEffect } from "react";

import { Nav } from "./Nav";

interface FailedRequest {
  response?: Response;
}

interface Props {
  error: FailedRequest;
  // What couldn't be loaded, like "dex" or "profile".
  thing: string;
}

// LoadError stands in for a page whose data failed to load for a reason other
// than it not existing. Something that doesn't exist gets the not found page
// instead.
export function LoadError({ error, thing }: Props) {
  useEffect(() => {
    document.title = "Error | Pokédex Tracker";
  }, []);

  // The API reports its own 500s to Rollbar. Anything else, like a timeout or
  // the proxy finding the API down, never reached it, so it isn't reported
  // and is usually worth trying again.
  const message =
    error.response?.status === 500
      ? "Something went wrong on our end. We've been notified and will look into it."
      : `Couldn't load this ${thing}. Try refreshing the page.`;

  // The nav stays, like on the not found page, so there's a way out.
  return (
    <div>
      <Nav />
      <div className="loading">{message}</div>
    </div>
  );
}

// isNotFound reports whether a failed request was a 404.
export function isNotFound(error: FailedRequest | null): boolean {
  return error?.response?.status === 404;
}
