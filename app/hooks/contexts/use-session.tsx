import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Session, User } from "../../types";
import { tokenToUser } from "../../utils/state";
import { useUser } from "../queries/users";
import { useLocalStorage, type SetLocalStorageFn } from "../use-local-storage";

interface SessionContextState {
  session: Session | null;
  sessionUser: User | null;
  setToken: SetLocalStorageFn<string | null>;
}

const SessionContext = createContext<SessionContextState>({
  session: null,
  sessionUser: null,
  setToken: () => {},
});

interface Props {
  children: ReactNode;
}

export const SessionProvider = ({ children }: Props) => {
  const [token, setToken] = useLocalStorage<string | null>("token", {
    defaultValue: null,
  });
  const session = useMemo(() => tokenToUser(token), [token]);
  const { data: sessionUser } = useUser(session?.username);

  const contextValue = useMemo<SessionContextState>(
    () => ({
      session,
      sessionUser: sessionUser || null,
      setToken,
    }),
    [session, sessionUser, setToken],
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
