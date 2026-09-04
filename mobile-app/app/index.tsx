import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export default function Index() {
  const { isLoggedIn, isLoading } = useAuth();
  const [hasLanguage, setHasLanguage] = useState<boolean | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('hivetrack_language'),
      AsyncStorage.getItem('hivetrack_onboarded')
    ]).then(([lang, onboarded]) => {
      setHasLanguage(!!lang);
      setHasSeenOnboarding(onboarded === 'true');
    }).catch((e) => {
      console.warn("AsyncStorage error:", e);
      setHasLanguage(false);
      setHasSeenOnboarding(false);
    });
  }, []);

  if (isLoading || hasLanguage === null || hasSeenOnboarding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (isLoggedIn) {
    return <Redirect href="/(tabs)/" />;
  }

  if (!hasLanguage) {
    return <Redirect href="/language" />;
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/auth/login" />;
}
