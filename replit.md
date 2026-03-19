# Delovni Nalogi (onspace-app)

## Overview
A Slovenian work order entry mobile app built with Expo React Native. Allows users to log work orders across multiple municipalities (Kranj, Šenčur, Preddvor, Jezersko) through a step-by-step wizard interface.

## Architecture
- **Framework**: Expo SDK ~55 with React Navigation (no Expo Router)
- **Language**: TypeScript
- **Platform**: React Native (iOS, Android, Web via react-native-web)
- **Navigation**: React Navigation v6 (`@react-navigation/native` + `@react-navigation/bottom-tabs`)
- **Entry point**: `index.js` → `App.tsx` (standard React Native entry, not expo-router)

## Why React Navigation instead of Expo Router
Expo Router's async file-based route discovery caused the Android app to freeze at the splash screen — its internal SplashScreen management would deadlock if route loading took too long. React Navigation is synchronous, predictable, and gives explicit splash screen control.

## Project Structure
- `index.js` - App entry point: registers root component, enables screens + gesture handler
- `App.tsx` - Root component: NavigationContainer, bottom tabs, providers, SplashScreen control
- `app/(tabs)/` - Screen components (imported directly by App.tsx, not via file routing)
  - `index.tsx` - Entry wizard screen (8-step work order form)
  - `records.tsx` - Records list screen with Excel export
- `components/` - Reusable UI components (OptionButton, StepHeader)
- `constants/` - App data (`data.ts`) and theme (`theme.ts`)
- `contexts/RecordsContext.tsx` - Global state for work records
- `hooks/useRecords.ts` - Hook for record management
- `services/` - Business logic
  - `mmkv.ts` - Cross-platform storage shim (localStorage on web, AsyncStorage on native)
  - `export.ts` - Custom XLSX builder (no external xlsx lib; pure JS zip writer)
- `plugins/withAndroidOptimizations.js` - No-op Expo config plugin (kept for app.json reference)
- `metro.config.js` - Metro config with blockList for `.local/` and `.git/`
- `babel.config.js` - babel-preset-expo + module-resolver for `@/` path alias

## Storage
- Web: `localStorage` via the storage shim
- Native: `@react-native-async-storage/async-storage` via the storage shim
- No backend — all data stored locally on device

## Key Features
- 8-step work order entry wizard
- Location selection (Kranj, Šenčur, Preddvor, Jezersko)
- Records management with Excel export (custom ZIP/XLSX writer, no external lib)
- File sharing via `expo-sharing`

## Running in Replit
- Workflow: "Start application" runs `npx expo start --web --port 5000`
- Access at port 5000 (web view)
- Metro bundler with hot module reloading

## Android Build (CI)
- CI: GitHub Actions via `codemagic.yaml`
- Steps: checkout → Node 20 → Java 17 → `npm install` → `expo prebuild` → `gradlew assembleDebug`
- No version patching in CI — package.json has correct SDK 55 versions

## Deployment
- Static export via `npx expo export --platform web`
- Output directory: `dist/`
