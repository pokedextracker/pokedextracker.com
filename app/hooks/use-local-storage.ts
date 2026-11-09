// Based on https://www.30secondsofcode.org/react/s/use-local-storage
import { useCallback, useEffect, useEffectEvent, useState } from "react";

import { localStorage } from "../utils/local-storage";

export type SetLocalStorageFn<T> = (newValue: T) => void;

interface Options<T> {
  defaultValue?: T;
  // Given, this tab follows changes another tab makes to the saved value:
  // this is called with the new value, then this tab's copy changes. Nothing
  // is written back, so the tabs can't write over each other.
  onOtherTabChange?: (newValue: T) => void;
  parseAsJson?: boolean;
}

// parseValue turns a saved value back into what was saved, or the default
// when there isn't one or it can't be read.
function parseValue<T>(value: string | null, options: Options<T>): T {
  try {
    if (value) {
      return options.parseAsJson ? JSON.parse(value) : (value as T);
    }
    return options.defaultValue as T;
  } catch {
    return options.defaultValue as T;
  }
}

export function useLocalStorage<T>(
  key: string,
  options: Options<T>,
): [T, SetLocalStorageFn<T>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      return parseValue(localStorage.getItem(key), options);
    } catch {
      return options.defaultValue as T;
    }
  });

  // Another tab's change fires a storage event here, but a tab's own changes
  // don't. A null key means all of localStorage was cleared.
  const followOtherTabs = Boolean(options.onOtherTabChange);
  const handleOtherTabChange = useEffectEvent((newValue: string | null) => {
    const value = parseValue(newValue, options);
    options.onOtherTabChange?.(value);
    setStoredValue(value);
  });
  useEffect(() => {
    if (!followOtherTabs) {
      return;
    }
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) {
        handleOtherTabChange(e.key === null ? null : e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, followOtherTabs]);

  const { parseAsJson } = options;
  const setValue = useCallback(
    (newValue: T) => {
      if (newValue === null) {
        localStorage.removeItem(key);
      } else {
        const serialized =
          parseAsJson || typeof newValue !== "string"
            ? JSON.stringify(newValue)
            : newValue;
        localStorage.setItem(key, serialized);
      }
      setStoredValue(newValue);
    },
    [key, parseAsJson],
  );

  return [storedValue, setValue];
}
