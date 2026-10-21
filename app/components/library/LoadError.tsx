import { useEffect } from "react";

import { Loading } from "./Loading";
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

  // The API reports its own 500s to Rollbar. Anything else isn't reported:
  // timeouts and the proxy finding the API down never reach it, and are
  // usually worth trying again.
  const message =
    error.response?.status === 500
      ? "Something went wrong on our end. We've been notified and will look into it."
      : `Couldn't load this ${thing}. Try refreshing the page.`;

  // The nav stays, like on the not found page, so there's a way out.
  return (
    <div>
      <Nav />
      <Loading>{message}</Loading>
    </div>
  );
}
