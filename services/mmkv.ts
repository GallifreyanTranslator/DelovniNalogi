// Web fallback: localStorage for persistent storage (replaces in-memory Map)
export const storage = {
  getString: (key: string): string | undefined => {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;
    return window.localStorage.getItem(key) ?? undefined;
  },
  set: (key: string, value: string): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  },
  delete: (key: string): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  },
};
