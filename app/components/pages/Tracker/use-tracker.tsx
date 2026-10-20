import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { Capture } from "../../../types";

export type UICapture = Capture & {
  pending?: boolean;
};

interface TrackerContextState {
  captures: UICapture[];
  setCaptures: Dispatch<SetStateAction<UICapture[]>>;
}

const TrackerContext = createContext<TrackerContextState>({
  captures: [],
  setCaptures: () => {},
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

  const contextValue = useMemo<TrackerContextState>(
    () => ({
      captures,
      setCaptures,
    }),
    [captures, setCaptures],
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
