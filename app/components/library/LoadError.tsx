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
  // The API reports its own 500s to Rollbar. Anything else, like a timeout or
  // the proxy finding the API down, never reached it, so it isn't reported
  // and is usually worth trying again.
  if (error.response?.status === 500) {
    return (
      <div className="loading">
        Something went wrong on our end. We&apos;ve been notified and will look
        into it.
      </div>
    );
  }

  return (
    <div className="loading">
      Couldn&apos;t load this {thing}. Try refreshing the page.
    </div>
  );
}

// isNotFound reports whether a failed request was a 404.
export function isNotFound(error: FailedRequest | null): boolean {
  return error?.response?.status === 404;
}
