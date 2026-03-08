import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { RecordsProvider } from '@/contexts/RecordsContext';
import { useContext } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { RecordsContext } from '@/contexts/RecordsContext';
import { Colors, FontSize, Spacing } from '@/constants/theme';

// NOTE: We intentionally do NOT call SplashScreen.preventAutoHideAsync().
// Letting the native splash auto-hide is the most reliable approach on Android.
// Instead we show an in-app loading screen while AsyncStorage initialises.

function AppReady({ children }: { children: React.ReactNode }) {
  const ctx = useContext(RecordsContext);
  const loading = ctx?.loading ?? true;

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
