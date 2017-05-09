let store;

if (typeof window === 'undefined') {
  const fakeStore = {};
  store = {
    getItem(k) {
      return fakeStore[k];
    },
    setItem(k, v) {
      fakeStore[k] = v;
    },
  };
} else {
  store = window.localStorage;
}

export class LocalStorage {
  static getItem(str) {
    return store.getItem(str);
  }

  static setItem(key, str) {
    return store.setItem(key, str);
  }
}