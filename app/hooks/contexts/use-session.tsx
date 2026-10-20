import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  type ReactNode,
} from "react";

import type { Session, User } from "../../types";
import { isNotFound, type PokedexTrackerError } from "../../utils/api";
import { tokenToUser } from "../../utils/state";
import { TOKEN_KEY } from "../../utils/token";
import { QueryKey as UserQueryKey, useUser } from "../queries/users";
import { useLocalStorage, type SetLocalStorageFn } from "../use-local-storage";

interface SessionContextState {
  session: Session | null;
  sessionUser: User | null;
  // Whether sessionUser is still loading for the first time.
  sessionUserIsLoading: boolean;
  // Why sessionUser couldn't be loaded, like a server error, once loading is
  // done. The session itself still stands.
  sessionUserError: PokedexTrackerError | null;
  setToken: SetLocalStorageFn<string | null>;
}

const SessionContext = createContext<SessionContextState>({
  session: null,
  sessionUser: null,
  sessionUserIsLoading: false,
  sessionUserError: null,
  setToken: () => {},
});

interface Props {
  children: ReactNode;
}

export const SessionProvider = ({ children }: Props) => {
  const queryClient = useQueryClient();
  const [token, setStoredToken] = useLocalStorage<string | null>(TOKEN_KEY, {
    defaultValue: null,
  });
  const tokenSession = useMemo(() => tokenToUser(token), [token]);
  const {
    data: tokenUser,
    error: tokenUserError,
    isFetching: tokenUserIsFetching,
    isLoading: tokenUserIsLoading,
  } = useUser(tokenSession?.username);

  // A new token's user is fetched again before it's checked: the cached one
  // can be from before the database was reset, with a different id.
  const setToken = useCallback(
    (newToken: string | null) => {
      const newSession = tokenToUser(newToken);
      if (newSession) {
        // Without cancelling a fetch that's already on its way, like the one
        // saving the account starts.
        queryClient.invalidateQueries(
          { queryKey: [UserQueryKey.RetrieveUser, newSession.username] },
          { cancelRefetch: false },
        );
      }
      setStoredToken(newToken);
    },
    [queryClient, setStoredToken],
  );

  // A token from another database, like staging's, can name a user who has a
  // different id here, or who doesn't exist here at all. It isn't a login for
  // this site, so it counts as signed out and is cleared. A server error
  // doesn't count, so an outage can't sign anyone out.
  const stale = Boolean(
    tokenSession &&
    !tokenUserIsFetching &&
    ((tokenUser && tokenUser.id !== tokenSession.id) ||
      isNotFound(tokenUserError)),
  );
  const clearToken = useEffectEvent(() => setToken(null));
  useEffect(() => {
    if (stale) {
      clearToken();
    }
  }, [stale]);

  const session = stale ? null : tokenSession;
  // Only the user the token is for: while a new token's user is fetched
  // again, the cached one can still be another database's.
  const sessionUser =
    session && tokenUser?.id === session.id ? tokenUser : null;
  const sessionUserError =
    session && !tokenUserIsLoading ? tokenUserError : null;

  const contextValue = useMemo<SessionContextState>(
    () => ({
      session,
      sessionUser,
      sessionUserIsLoading: tokenUserIsLoading,
      sessionUserError,
      setToken,
    }),
    [session, sessionUser, tokenUserIsLoading, sessionUserError, setToken],
  );

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  return useContext(SessionContext);
};
