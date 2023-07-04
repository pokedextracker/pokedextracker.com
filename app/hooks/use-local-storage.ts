// Based on https://www.30secondsofcode.org/react/s/use-local-storage
import { useState } from 'react';

export type SetLocalStorageFn<T> = (newValue: T) => void;

export function useLocalStorage<T> (key: string, defaultValue?: T): [T, SetLocalStorageFn<T>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const value = window.localStorage.getItem(key);
      if (value) {
        return JSON.parse(value);
      }
      return defaultValue;
    } catch (error) {
      return defaultValue;
    }
  });

  const setValue = (newValue: T) => {
    window.localStorage.setItem(key, JSON.stringify(newValue));
    setStoredValue(newValue);
  };

  return [storedValue, setValue];
}
