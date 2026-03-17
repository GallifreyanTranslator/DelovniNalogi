# Delovni Nalogi (onspace-app)

## Overview
A Slovenian work order entry mobile app built with Expo React Native. Allows users to log work orders across multiple municipalities (Kranj, Šenčur, Preddvor, Jezersko) through a step-by-step wizard interface.

## Architecture
- **Framework**: Expo SDK ~55 with Expo Router (file-based routing)
- **Language**: TypeScript
- **Platform**: React Native (iOS, Android, Web via react-native-web)
- **Routing**: Expo Router with file-based routing in `app/` directory

## Project Structure
- `app/` - Expo Router screens and layouts
  - `_layout.tsx` - Root layout with SafeAreaProvider and RecordsProvider
  - `(tabs)/` - Tab-based navigation with "Vnos" (Entry) and "Zapisi" (Records) tabs
- `components/` - Reusable UI components
- `constants/` - App data (`data.ts`) and theme (`theme.ts`)
- `contexts/RecordsContext.tsx` - Global state for work records
- `hooks/useRecords.ts` - Hook for record management
- `services/` - Storage services
  - `mmkv.ts` - Cross-platform storage shim (localStorage on web, AsyncStorage on native)
  - `mmkv.native.ts` - Native re-export
- `plugins/` - Expo config plugins

## Storage
- Web: `localStorage` via the MMKV shim
- Native: `@react-native-async-storage/async-storage` via the MMKV shim
- No backend — all data stored locally on device

## Key Features
- 8-step work order entry wizard
- Location selection (Kranj, Šenčur, Preddvor, Jezersko)
- Records management with Excel export (`xlsx`)
- File sharing via `expo-sharing`

## Running in Replit
- Workflow: "Start application" runs `npx expo start --web --port 5000`
- Access at port 5000 (web view)
- Metro bundler with hot module reloading

## Deployment
- Static export via `npx expo export --platform web`
- Output directory: `dist/`
- Deployment target: static
