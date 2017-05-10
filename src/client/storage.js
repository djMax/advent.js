let store;

function matches(store, regex) {
  Object.keys(store)
    .filter(k => regex.test(k))
    .forEach(k => LocalStorage.removeItem(k));
}

let fakeStore;
if (typeof window === 'undefined') {
  fakeStore = {};
  store = {
    getItem(k) {
      return fakeStore[k];
    },
    setItem(k, v) {
      fakeStore[k] = v;
    },
    removeItem(k) {
      delete fakeStore[k];
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

  static removeItem(key) {
    return store.removeItem(key);
  }

  static clearUserSettings() {
    if (fakeStore) {
      Object.keys(fakeStore)
        .filter(k => /^user-/.test(k))
        .forEach(k => { delete fakeStore[k]; });
    } else {
      const toRemove = [];
      for (let i = 0; i < store.length; i += 1) {
        const k = store.key(i);
        if (/^user-/.test(k)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(LocalStorage.removeItem);
    }
  }
}