import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../use-local-storage';

import type { ReactNode } from 'react';
import type { SetLocalStorageFn } from '../use-local-storage';

const MOBILE_WIDTH = 1100;

interface LocalStorageContextState {
  hideNotification: boolean;
  setHideNotification: SetLocalStorageFn<boolean>;
  isNightMode: boolean;
  setIsNightMode: SetLocalStorageFn<boolean>;
  showInfo: boolean;
  setShowInfo: SetLocalStorageFn<boolean>;
}

const LocalStorageContext = createContext<LocalStorageContextState>({
  hideNotification: false,
  setHideNotification: () => {},
  isNightMode: false,
  setIsNightMode: () => {},
  showInfo: false,
  setShowInfo: () => {},
});

interface Props {
  children: ReactNode;
}

export const LocalStorageContextProvider = ({ children }: Props) => {
  const [hideNotification, setHideNotification] = useLocalStorage('notif-2023.06.08', { defaultValue: false, parseAsJson: true });
  const [isNightMode, setIsNightMode] = useLocalStorage('nightMode', { defaultValue: false, parseAsJson: true });
  const [showInfo, setShowInfo] = useLocalStorage('showInfo', { defaultValue: window.innerWidth > MOBILE_WIDTH, parseAsJson: true });

  const contextValue = useMemo<LocalStorageContextState>(() => ({
    hideNotification,
    setHideNotification,
    isNightMode,
    setIsNightMode,
    showInfo,
    setShowInfo,
  }), [
    hideNotification,
    setHideNotification,
    isNightMode,
    setIsNightMode,
    showInfo,
    setShowInfo,
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
