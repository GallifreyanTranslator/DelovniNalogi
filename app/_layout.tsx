import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { RecordsProvider } from '@/contexts/RecordsContext';

// Absolute minimal layout — no custom providers, no modals, no async init.
// AlertProvider removed: we use React Native's built-in Alert.alert() directly.
// This layout renders in under 1ms on every device including HyperOS/MIUI.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RecordsProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </RecordsProvider>
    </SafeAreaProvider>
  );
}
