import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../use-local-storage';

import type { ReactNode } from 'react';
import type { SetLocalStorageFn } from '../use-local-storage';

interface LocalStorageContextState {
  hideNotification: boolean;
  setHideNotification: SetLocalStorageFn<boolean>;
  isNightMode: boolean;
  setIsNightMode: SetLocalStorageFn<boolean>;
}

const LocalStorageContext = createContext<LocalStorageContextState>({
  hideNotification: false,
  setHideNotification: () => {},
  isNightMode: false,
  setIsNightMode: () => {},
});

interface Props {
  children: ReactNode;
}

export const LocalStorageContextProvider = ({ children }: Props) => {
  const [hideNotification, setHideNotification] = useLocalStorage('notif-2023.06.08', { defaultValue: false, parseAsJson: true });
  const [isNightMode, setIsNightMode] = useLocalStorage('nightMode', { defaultValue: false, parseAsJson: true });

  const contextValue = useMemo<LocalStorageContextState>(() => ({
    hideNotification,
    setHideNotification,
    isNightMode,
    setIsNightMode,
  }), [
    hideNotification,
    setHideNotification,
    isNightMode,
    setIsNightMode,
  ]);

  return (
    <LocalStorageContext.Provider value={contextValue}>
      {children}
    </LocalStorageContext.Provider>
  );
};

export const useLocalStorageContext = () => {
  return useContext(LocalStorageContext);
};
