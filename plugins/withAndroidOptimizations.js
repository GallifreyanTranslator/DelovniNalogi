/**
 * plugins/withAndroidOptimizations.js
 *
 * Expo Config Plugin — applied during `expo prebuild`.
 * All previous patches (EmojiCompat, extractNativeLibs, bundleInRelease,
 * hermesEnabled) have been removed because they are either unsupported in
 * React Native 0.83+ / Expo SDK 55, or are now defaults that don't need
 * explicit configuration.
 *
 * This file is kept to avoid breaking the app.json plugins reference.
 */

module.exports = function withAndroidOptimizations(config) {
  return config;
};
