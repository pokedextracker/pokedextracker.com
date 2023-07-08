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
    get length (): number {
      return Object.keys(this._data).length;
    },
    setItem (key: string, val: string): void {
      this._data[key] = String(val);
    },
    getItem (key: string): string | null {
      return this._data.hasOwnProperty(key) ? this._data[key] : undefined;
    },
    key (index: number): string | null {
      return this.getItem(Object.keys(this._data)[index]);
    },
    removeItem (key: string): void {
      Reflect.deleteProperty(this._data, key);
    },
    clear (): void {
      this._data = {};
    },
  };
}

export const localStorage: Storage = storage;
