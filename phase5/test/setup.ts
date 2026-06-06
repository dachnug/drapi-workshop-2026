/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview Vitest global setup. The jsdom environment runs with an opaque
 * origin, so the Web Storage API (`localStorage`) is not provided. The app code
 * relies on `globalThis.localStorage`, so this installs a minimal in-memory
 * `Storage` implementation when one is absent. Each test should still clear it
 * (e.g. in `beforeEach`) to stay isolated.
 */

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true
  });
}
