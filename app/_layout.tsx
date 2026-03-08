import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { RecordsProvider } from '@/contexts/RecordsContext';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen as soon as the layout mounts
    SplashScreen.hideAsync();
  }, []);

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
