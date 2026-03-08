import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { RecordsProvider } from '@/contexts/RecordsContext';
import { useEffect, useContext } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { RecordsContext } from '@/contexts/RecordsContext';
import { Colors, FontSize, Spacing } from '@/constants/theme';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * AppReady sits INSIDE RecordsProvider so it can read the loading state.
 * It hides the splash only once AsyncStorage has finished initializing,
 * and shows a loading screen in the brief window between splash → app.
 */
function AppReady({ children }: { children: React.ReactNode }) {
  const ctx = useContext(RecordsContext);
  const loading = ctx?.loading ?? true;

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Nalaganje...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <RecordsProvider>
          <AppReady>
            <Stack screenOptions={{ headerShown: false }} />
          </AppReady>
        </RecordsProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
