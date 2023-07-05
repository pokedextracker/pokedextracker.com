import { QueryClient } from '@tanstack/react-query';

import { PokedexTrackerError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The default retry logic is to retry up to 3 times. We want to retry up
      // to 3 times as well, but if it's a 401, 404, or 422, we don't want that
      // to retry since that's probably a real error, not a transient one.
      retry: (failureCount: number, err: unknown) => {
        if (err instanceof PokedexTrackerError) {
          return failureCount < 3 &&
            err.response.status !== 401 &&
            err.response.status !== 404 &&
            err.response.status !== 422;
        }
        return failureCount < 3;
      },
      // We can probably be smarter about our stale time, but for now, we'll
      // just say that data never gets stale and to always re-fetch on mount.
      // This will give us behavior similar to what we were used to before using
      // React Query. The reason we can just start utilizing all of React
      // Query's fancier stale logic is because there are several scenarios
      // where this will cause issues. The prime one is when editing a resource,
      // if we see that the original changed, we update the working copy. Since
      // the original would "change" whenever it's re-fetched (either because
      // the window was refocused or the component just re-rendered somehow), it
      // would revert all the user's in-progress changes.
      refetchOnMount: 'always',
      staleTime: Infinity,
    },
  },
});
