function testLocalStorage () {
  try {
    window.localStorage.setItem('_', '_');
  } catch (e) {
    return false;
  }

  return true;
}

let storage;

if (testLocalStorage()) {
  storage = window.localStorage;
} else {
  storage = {
    _data: {},
    setItem (key: string, val: string): void {
      this._data[key] = String(val);
    },
    getItem (key: string): string | null {
      return this._data.hasOwnProperty(key) ? this._data[key] : undefined;
    },
    removeItem (key: string): void {
      Reflect.deleteProperty(this._data, key);
    },
    clear (): void {
      this._data = {};
    },
  };
}

export const localStorage = storage;
