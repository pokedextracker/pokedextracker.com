import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { useLocalStorage, type SetLocalStorageFn } from "../use-local-storage";

const MOBILE_WIDTH = 1100;

// The color of the bar around the page on phones: the theme-color in
// index.html by day, and the night nav's color, which index.html also sets
// before the page draws, at night.
const DAY_THEME_COLOR = "#ffffff";
const NIGHT_THEME_COLOR = "#262626";

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
  // Until the visitor picks one with the toggle, night mode starts as
  // index.html set it before the page drew: their device's.
  const [isNightMode, setIsNightMode] = useLocalStorage("nightMode", {
    defaultValue: document.documentElement.classList.contains("dark"),
    parseAsJson: true,
  });
  const [showInfo, setShowInfo] = useLocalStorage("showInfo", {
    defaultValue: window.innerWidth > MOBILE_WIDTH,
    parseAsJson: true,
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isNightMode);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        isNightMode ? NIGHT_THEME_COLOR : DAY_THEME_COLOR,
      );
  }, [isNightMode]);

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
