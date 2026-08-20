import type { StorageAdapter } from "@tourkit/core";

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export function createStorageAdapter(store: AsyncStorageLike): StorageAdapter {
  return {
    get: (key) => store.getItem(key),
    set: (key, value) => store.setItem(key, value),
    remove: (key) => store.removeItem(key),
  };
}

export function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
  };
}
