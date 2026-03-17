// ─── Cross-platform storage shim ──────────────────────────────────────────────
// Uses an in-memory Map as the synchronous read layer (instant, never blocks).
// Writes are persisted asynchronously to localStorage (web) or AsyncStorage
// (native) in the background — the UI never waits for storage.
//
// Why not MMKV? MMKV requires JSI (new architecture). With newArchEnabled:false
// (required for HyperOS/MIUI stability) MMKV throws on new MMKV() and hangs.
// Why not direct AsyncStorage? AsyncStorage.getItem() is async — calling it
// during useState() initializer would require suspense or blocking, both of
// which caused the 100% CPU / freeze issue on first launch.

const mem = new Map<string, string>();

// ─── Async persistence back-end ───────────────────────────────────────────────

function persistSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    } else {
      // Native: fire-and-forget AsyncStorage write
      import('@react-native-async-storage/async-storage')
        .then(({ default: AS }) => AS.setItem(key, value))
        .catch(() => {});
    }
  } catch {}
}

function persistDelete(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    } else {
      import('@react-native-async-storage/async-storage')
        .then(({ default: AS }) => AS.removeItem(key))
        .catch(() => {});
    }
  } catch {}
}

// ─── Public API (synchronous reads, async writes) ─────────────────────────────

export const storage = {
  getString: (key: string): string | undefined => mem.get(key),
  set: (key: string, value: string): void => {
    mem.set(key, value);
    persistSet(key, value);
  },
  delete: (key: string): void => {
    mem.delete(key);
    persistDelete(key);
  },
};

// ─── Hydrate in-memory cache from persistent storage (called once at startup) ──
// This is called from RecordsContext after the first render — never blocks init.

export async function hydrateStorage(keys: string[]): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (const key of keys) {
        const val = window.localStorage.getItem(key);
        if (val !== null) mem.set(key, val);
      }
    } else {
      const { default: AS } = await import('@react-native-async-storage/async-storage');
      const pairs = await AS.multiGet(keys);
      for (const [key, val] of pairs) {
        if (val !== null) mem.set(key, val);
      }
    }
  } catch {
    // If hydration fails, app continues with empty in-memory state — no crash.
  }
}
