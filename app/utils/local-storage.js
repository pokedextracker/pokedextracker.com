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
    setItem: function (id, val) {
      this._data[id] = String(val);
    },
    getItem: function (id) {
      return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
    },
    removeItem: function (id) {
      Reflect.deleteProperty(this._data, id);
    },
    clear: function () {
      this._data = {};
    }
  };
}

export const localStorage = storage;
