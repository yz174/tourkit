import type { StorageAdapter } from "../types";

export function browserStorage(): StorageAdapter {
  return {
    async get(key) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {}
    },
    async remove(key) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {}
    },
  };
}

export function memoryStorage(): StorageAdapter {
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
