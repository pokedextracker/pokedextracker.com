// Based on https://www.30secondsofcode.org/react/s/use-local-storage
import { useState } from 'react';

export type SetLocalStorageFn<T> = (newValue: T) => void;

interface Options<T> {
  defaultValue?: T;
  parseAsJson?: boolean;
}

export function useLocalStorage<T> (key: string, options: Options<T>): [T, SetLocalStorageFn<T>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const value = window.localStorage.getItem(key);
      if (value) {
        if (options.parseAsJson) {
          return JSON.parse(value);
        }
        return value;
      }
      return options.defaultValue;
    } catch (error) {
      return options.defaultValue;
    }
  });

  const setValue = (newValue: T) => {
    if (newValue === null) {
      window.localStorage.removeItem(key);
    } else {
      const serialized = options.parseAsJson || typeof newValue !== 'string' ? JSON.stringify(newValue) : newValue;
      window.localStorage.setItem(key, serialized);
    }
    setStoredValue(newValue);
  };

  return [storedValue, setValue];
}
