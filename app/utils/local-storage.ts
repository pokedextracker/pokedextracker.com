function testLocalStorage() {
  try {
    window.localStorage.setItem("_", "_");
  } catch {
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
    get length(): number {
      return Object.keys(this._data).length;
    },
    setItem(key: string, val: string): void {
      this._data[key] = String(val);
    },
    getItem(key: string): string | null {
      return Object.hasOwn(this._data, key) ? this._data[key] : null;
    },
    key(index: number): string | null {
      return this.getItem(Object.keys(this._data)[index]);
    },
    removeItem(key: string): void {
      Reflect.deleteProperty(this._data, key);
    },
    clear(): void {
      this._data = {};
    },
  };
}

export const localStorage: Storage = storage;
