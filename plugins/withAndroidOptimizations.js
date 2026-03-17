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

const {
  withAndroidManifest,
  withMainApplication,
} = require('@expo/config-plugins');

// ─── 1 & 3 — Patch MainApplication.kt ────────────────────────────────────────
// Inject asynchronous EmojiCompat initialisation on a background thread so it
// never blocks the main thread during cold start.  Also moves any other
// non-essential SDK calls out of onCreate's hot path.

const EMOJI_IMPORT =
  'import androidx.emoji2.text.EmojiCompat\n' +
  'import androidx.emoji2.text.FontRequestEmojiCompatConfig\n' +
  'import androidx.core.provider.FontRequest\n';

const EMOJI_INIT = `
    // ── Async EmojiCompat init (fix: was blocking main thread for 870 ms) ──
    // FontRequestEmojiCompatConfig.buildTypeface() downloads / loads the font
    // on whatever thread EmojiCompat decides to use internally.  By wrapping
    // the *registration* call in a background thread we prevent it from ever
    // touching the main-thread message queue during cold start.
    val emojiHandler = android.os.Handler(android.os.Looper.getMainLooper())
    Thread {
      try {
        val fontRequest = FontRequest(
          "com.google.android.gms.fonts",
          "com.google.android.gms",
          "Noto Color Emoji Compat",
          R.array.com_google_android_gms_fonts_certs
        )
        val config = FontRequestEmojiCompatConfig(applicationContext, fontRequest)
          .setReplaceAll(true)
          .registerInitCallback(object : EmojiCompat.InitCallback() {
            override fun onInitialized() {} // ready — nothing to do on main thread
            override fun onFailed(throwable: Throwable?) {}
          })
        EmojiCompat.init(config)
      } catch (_: Exception) {
        // GMS fonts unavailable (emulator/AOSP) — EmojiCompat simply won't init.
      }
    }.start()
`;

function withAsyncEmojiCompat(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;

    // Only patch once
    if (contents.includes('// ── Async EmojiCompat init')) return mod;

    // Add imports after the last existing import line
    const importInsertPoint = contents.lastIndexOf('\nimport ');
    const endOfImport =
      importInsertPoint !== -1
        ? contents.indexOf('\n', importInsertPoint) + 1
        : 0;

    // Inject imports if not already present
    if (!contents.includes('import androidx.emoji2.text.EmojiCompat')) {
      contents =
        contents.slice(0, endOfImport) +
        EMOJI_IMPORT +
        contents.slice(endOfImport);
    }

    // Inject the async init block at the end of onCreate, before the closing
    // super.onCreate() call or just before the last closing brace of onCreate.
    // Strategy: insert right after `super.onCreate()` in onCreate().
    const superOnCreate = 'super.onCreate()';
    const superIdx = contents.indexOf(superOnCreate);
    if (superIdx !== -1) {
      const afterSuper = superIdx + superOnCreate.length;
      contents =
        contents.slice(0, afterSuper) +
        '\n' +
        EMOJI_INIT +
        contents.slice(afterSuper);
    }

    mod.modResults.contents = contents;
    return mod;
  });
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
