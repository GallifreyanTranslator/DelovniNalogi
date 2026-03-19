import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { RecordsProvider } from '@/contexts/RecordsContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <RecordsProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </RecordsProvider>
    </SafeAreaProvider>
  );
}
