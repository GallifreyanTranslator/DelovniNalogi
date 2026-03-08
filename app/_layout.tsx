import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { RecordsProvider } from '@/contexts/RecordsContext';
import { useContext } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { RecordsContext } from '@/contexts/RecordsContext';
import { Colors, FontSize, Spacing } from '@/constants/theme';

// ─── Loading overlay ────────────────────────────────────────────────────────
// CRITICAL: Stack must ALWAYS be rendered on the first frame.
// Blocking Stack behind a loading gate causes Expo Router to spin at 100% CPU
// trying to resolve navigation. Instead we render Stack immediately and float
// a loading overlay on top while AsyncStorage initialises.
function LoadingOverlay() {
  const ctx = useContext(RecordsContext);
  const loading = ctx?.loading ?? false;

  if (!loading) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.box}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Nalaganje...</Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <RecordsProvider>
          {/* Stack ALWAYS renders – never conditionally blocked */}
          <Stack screenOptions={{ headerShown: false }} />
          {/* Overlay floats on top while context loads */}
          <LoadingOverlay />
        </RecordsProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  box: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
