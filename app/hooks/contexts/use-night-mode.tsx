import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../use-local-storage';

import type { ReactNode } from 'react';
import type { SetLocalStorageFn } from '../use-local-storage';

interface NightModeContextState {
  isNightMode: boolean;
  setIsNightMode: SetLocalStorageFn<boolean>;
}

const NightModeContext = createContext<NightModeContextState>({
  isNightMode: false,
  setIsNightMode: () => {},
});

interface Props {
  children: ReactNode;
}

export const NightModeProvider = ({ children }: Props) => {
  const [isNightMode, setIsNightMode] = useLocalStorage('nightMode', { defaultValue: false, parseAsJson: true });

  const contextValue = useMemo<NightModeContextState>(() => ({
    isNightMode,
    setIsNightMode,
  }), [
    isNightMode,
    setIsNightMode,
  ]);

  return (
    <NightModeContext.Provider value={contextValue}>
      {children}
    </NightModeContext.Provider>
  );
};

export const useNightMode = () => {
  return useContext(NightModeContext);
};
