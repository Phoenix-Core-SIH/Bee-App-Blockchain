import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { changeLanguage } from '../lib/i18n';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { HoneycombBackground } from '../components/HoneycombBackground';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English', script: 'English' },
  { code: 'hi', label: 'Hindi', script: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', script: 'ಕನ್ನಡ' },
];

export default function LanguageScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('en');

  const handleContinue = async () => {
    await changeLanguage(selected);
    router.replace('/onboarding');
  };

  return (
    <View style={styles.container}>
      <HoneycombBackground />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>🌐</Text>
        </View>
        
        <Text style={styles.title}>{t('language_selector')}</Text>

        <View style={styles.list}>
          {LANGUAGES.map((lang) => {
            const isActive = selected === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.card, isActive && styles.cardActive]}
                onPress={() => setSelected(lang.code)}
              >
                <View style={styles.cardContent}>
                  <Text style={[styles.script, isActive && styles.textActive]}>{lang.script}</Text>
                  <Text style={[styles.label, isActive && styles.textActive]}>{lang.label}</Text>
                </View>
                <View style={[styles.radio, isActive && styles.radioActive]}>
                  {isActive && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>{t('continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(200, 134, 10, 0.15)',
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: Typography.h1,
    fontWeight: Typography.bold,
    color: Colors.textDark,
    marginBottom: Spacing.xxl,
  },
  list: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.creamDark,
  },
  cardContent: {
    gap: 4,
  },
  script: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  label: {
    fontSize: Typography.bodySize,
    color: Colors.textMedium,
  },
  textActive: {
    color: Colors.primaryDark,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.primaryButton,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.bodySize,
    fontWeight: Typography.bold,
  },
});
