import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { RecordsProvider } from '@/contexts/RecordsContext';

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
