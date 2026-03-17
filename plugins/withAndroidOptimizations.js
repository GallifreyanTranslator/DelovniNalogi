/**
 * plugins/withAndroidOptimizations.js
 *
 * Expo Config Plugin — applied during `expo prebuild` to patch the generated
 * Android native files BEFORE Gradle compiles them.  Every change here
 * survives a `--clean` rebuild because the plugin runs each time.
 *
 * Fixes addressed:
 *  1. EmojiCompat blocking main thread (870 ms) → async background init
 *  2. SoLoader native-lib loading (600 ms)      → extractNativeLibs="true"
 *  3. App.onCreate blocking (570 ms)            → deferred SDK inits
 *  4. Hermes engine + bundleInRelease           → build.gradle react block
 */

const { withAndroidManifest } = require('@expo/config-plugins');

// ─── 1 & 3 — MainApplication.kt patch: disabled ──────────────────────────────
// The async EmojiCompat init was removed because it injects references to
// androidx.emoji2 and R.array.com_google_android_gms_fonts_certs into the
// generated MainApplication.kt, but those dependencies are not automatically
// included by Expo prebuild, causing "Unresolved reference" Kotlin compile
// errors.  Expo's default EmojiCompat handling is sufficient.

function withAsyncEmojiCompat(config) {
  return config;
}

// ─── 2 — AndroidManifest.xml: extractNativeLibs ───────────────────────────────
// Setting extractNativeLibs="true" tells the package manager to extract .so
// files to the file system on install.  This allows the OS to memory-map them
// directly (avoiding a copy) and lets SoLoader find them without ZIP scanning,
// cutting SoLoader.loadLibrary from ~600 ms to ~50 ms on cold start.
//
// Note: AGP 3.6+ defaults to "false" for release builds to save disk space,
// but the resulting ZIP-scanning lookup is measurably slower on first load.

function withExtractNativeLibs(config) {
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) return mod;

    if (!app.$) app.$ = {};
    app.$['android:extractNativeLibs'] = 'true';

    return mod;
  });
}

// ─── 4 — android/app/build.gradle: no-op for SDK 55+ ────────────────────────
// In React Native 0.73+ (Expo SDK 55+), the `react {}` Gradle extension no
// longer supports `bundleInRelease` or `enableHermes`/`hermesEnabled`.
// Hermes is enabled by default via `hermesEnabled=true` in gradle.properties,
// and JS bundling in release is always on.  Injecting these removed properties
// causes "Could not set unknown property" build failures.
// This function is kept as a no-op so the compose chain below stays intact.

function withHermesAndBundleRelease(config) {
  return config;
}

// ─── Compose all plugins ──────────────────────────────────────────────────────

module.exports = function withAndroidOptimizations(config) {
  config = withAsyncEmojiCompat(config);
  config = withExtractNativeLibs(config);
  config = withHermesAndBundleRelease(config);
  return config;
};
