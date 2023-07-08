import { createContext, useContext, useMemo, useState } from 'react';

import type { Capture } from '../../../types';
import type { ReactNode, Dispatch, SetStateAction } from 'react';

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
}

export const TrackerContextProvider = ({ children }: Props) => {
  const [captures, setCaptures] = useState<UICapture[]>([]);

  const contextValue = useMemo<TrackerContextState>(() => ({
    captures,
    setCaptures,
  }), [
    captures,
    setCaptures,
  ]);

  return (
    <TrackerContext.Provider value={contextValue}>
      {children}
    </TrackerContext.Provider>
  );
};

export const useTrackerContext = () => {
  return useContext(TrackerContext);
};
