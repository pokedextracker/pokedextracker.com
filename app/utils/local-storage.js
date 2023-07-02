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
    setItem (id, val) {
      this._data[id] = String(val);
    },
    getItem (id) {
      return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
    },
    removeItem (id) {
      Reflect.deleteProperty(this._data, id);
    },
    clear () {
      this._data = {};
    },
  };
}

export const localStorage = storage;
