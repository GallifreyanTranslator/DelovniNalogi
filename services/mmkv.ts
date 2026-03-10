// Web fallback: in-memory Map (used only in browser/preview, not on real devices)
const store = new Map<string, string>();

export const storage = {
  getString: (key: string): string | undefined => store.get(key),
  set: (key: string, value: string): void => { store.set(key, value); },
  delete: (key: string): void => { store.delete(key); },
};
