import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { useSession } from "../../../hooks/contexts/use-session";
import type { Capture } from "../../../types";
import { isDeletedUser, PokedexTrackerError } from "../../../utils/api";

export type UICapture = Capture & {
  pending?: boolean;
};

interface TrackerContextState {
  captures: UICapture[];
  setCaptures: Dispatch<SetStateAction<UICapture[]>>;
  // Why the last change to the captures couldn't be saved, shown in a banner
  // until it's closed or a later change saves.
  saveError: string | null;
  setSaveError: Dispatch<SetStateAction<string | null>>;
}

const TrackerContext = createContext<TrackerContextState>({
  captures: [],
  setCaptures: () => {},
  saveError: null,
  setSaveError: () => {},
});

interface Props {
  children: ReactNode;
  // The captures as loaded. Marking Pokémon caught changes this copy, so the
  // page doesn't wait on the API.
  initialCaptures: Capture[];
}

export const TrackerContextProvider = ({
  children,
  initialCaptures,
}: Props) => {
  const [captures, setCaptures] = useState<UICapture[]>(initialCaptures);
  const [saveError, setSaveError] = useState<string | null>(null);

  const contextValue = useMemo<TrackerContextState>(
    () => ({
      captures,
      setCaptures,
      saveError,
      setSaveError,
    }),
    [captures, setCaptures, saveError, setSaveError],
  );

  return (
    <TrackerContext.Provider value={contextValue}>
      {children}
    </TrackerContext.Provider>
  );
};

export const useTrackerContext = () => {
  return useContext(TrackerContext);
};

// saveErrorMessage says why a change to the captures couldn't be saved.
function saveErrorMessage(error: unknown): string {
  if (isDeletedUser(error)) {
    return "This account no longer exists.";
  }
  if (!(error instanceof PokedexTrackerError)) {
    // No response at all, like a dropped connection.
    return "Couldn't save your last change. Check your connection and try again.";
  }
  // A proxy's 502 or 503 isn't JSON, so it never gets here: it reads as no
  // response, which is also the right advice.
  if (error.response.status >= 500) {
    return "Couldn't save your last change. Something went wrong on our end, so try again in a bit.";
  }
  return "Couldn't save your last change. Try again.";
}

// useSaveResult is what marking does once its request is done: a save clears
// an earlier failure's banner, and a failure shows one. An account deleted
// elsewhere is signed out of here too. Failures aren't reported: the API
// reports its own 500s, and anything else isn't worth it.
export function useSaveResult() {
  const { setToken } = useSession();
  const { setSaveError } = useTrackerContext();

  return {
    onSaved: () => setSaveError(null),
    onFailed: (error: unknown) => {
      setSaveError(saveErrorMessage(error));
      if (isDeletedUser(error)) {
        setToken(null);
      }
    },
  };
}
