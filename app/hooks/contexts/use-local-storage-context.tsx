import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useLocalStorage, type SetLocalStorageFn } from "../use-local-storage";

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
  const [hideNotification, setHideNotification] = useLocalStorage(
    "notif-2026.10.09",
    { defaultValue: false, parseAsJson: true },
  );
  const [isNightMode, setIsNightMode] = useLocalStorage("nightMode", {
    defaultValue: false,
    parseAsJson: true,
  });
  const [showInfo, setShowInfo] = useLocalStorage("showInfo", {
    defaultValue: window.innerWidth > MOBILE_WIDTH,
    parseAsJson: true,
  });

  const contextValue = useMemo<LocalStorageContextState>(
    () => ({
      hideNotification,
      setHideNotification,
      isNightMode,
      setIsNightMode,
      showInfo,
      setShowInfo,
    }),
    [
      hideNotification,
      setHideNotification,
      isNightMode,
      setIsNightMode,
      showInfo,
      setShowInfo,
    ],
  );

  return (
    <LocalStorageContext.Provider value={contextValue}>
      {children}
    </LocalStorageContext.Provider>
  );
};

export const useLocalStorageContext = () => {
  return useContext(LocalStorageContext);
};
