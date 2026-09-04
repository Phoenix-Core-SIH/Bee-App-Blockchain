import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { Colors } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { loadSavedLanguage } from '../lib/i18n';

export default function RootLayout() {
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.cream } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="language" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
