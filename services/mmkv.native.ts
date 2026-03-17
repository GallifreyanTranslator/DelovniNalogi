// ─── Native storage shim using AsyncStorage (old arch compatible) ─────────────
// MMKV was removed because it requires JSI/new architecture.
// With newArchEnabled: false (required for HyperOS stability), MMKV crashes.
// This file re-exports the same interface using a synchronous in-memory cache
// that is populated from AsyncStorage in the background — no startup blocking.
export { storage } from './mmkv';
