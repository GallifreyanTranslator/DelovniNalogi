import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

import { RecordsProvider } from './contexts/RecordsContext';
import EntryScreen from './app/(tabs)/index';
import RecordsScreen from './app/(tabs)/records';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RecordsProvider>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#2563eb',
                tabBarInactiveTintColor: '#94a3b8',
                tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
                tabBarStyle: {
                  height: Platform.OS === 'android' ? 68 : 84,
                  paddingBottom: Platform.OS === 'android' ? 10 : 26,
                  paddingTop: 8,
                  backgroundColor: '#ffffff',
                  borderTopWidth: 1,
                  borderTopColor: '#f1f5f9',
                },
              }}
            >
              <Tab.Screen
                name="Vnos"
                component={EntryScreen}
                options={{
                  tabBarIcon: ({ color, size }) => (
                    <MaterialIcons name="add-circle-outline" size={size} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Zapisi"
                component={RecordsScreen}
                options={{
                  tabBarIcon: ({ color, size }) => (
                    <MaterialIcons name="table-chart" size={size} color={color} />
                  ),
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </RecordsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
