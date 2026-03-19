import { Platform } from 'react-native';

// ─── Cross-platform storage shim ──────────────────────────────────────────────
// Uses an in-memory Map as the synchronous read layer (instant, never blocks).
// Writes are persisted asynchronously in the background — the UI never waits.
//
// Web:    uses localStorage (synchronous, reliable)
// Native: uses AsyncStorage (async, fire-and-forget for writes)

const mem = new Map<string, string>();

// ─── Async persistence back-end ───────────────────────────────────────────────

function persistSet(key: string, value: string): void {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch {}
  } else {
    import('@react-native-async-storage/async-storage')
      .then(({ default: AS }) => AS.setItem(key, value))
      .catch(() => {});
  }
}

function persistDelete(key: string): void {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch {}
  } else {
    import('@react-native-async-storage/async-storage')
      .then(({ default: AS }) => AS.removeItem(key))
      .catch(() => {});
  }
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

export async function hydrateStorage(keys: string[]): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      for (const key of keys) {
        const val = localStorage.getItem(key);
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
    // If hydration fails, app continues with empty in-memory state.
  }
}
