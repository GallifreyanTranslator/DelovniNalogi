import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { RecordsProvider } from '@/contexts/RecordsContext';
import { StyleSheet } from 'react-native';

// ─── Root Layout ─────────────────────────────────────────────────────────────
// Keep this as MINIMAL as possible. AsyncStorage loading is now deferred
// inside RecordsContext (100ms post-render), so loading=false from the start.
// Stack always renders immediately – no conditional gates, no overlays.
export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <RecordsProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </RecordsProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({});
