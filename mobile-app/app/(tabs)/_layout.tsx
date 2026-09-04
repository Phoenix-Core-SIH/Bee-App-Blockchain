import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, Modal, View, Text, StyleSheet } from 'react-native';
import { changeLanguage } from '../../lib/i18n';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const setLang = async (code: string) => {
    await changeLanguage(code);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginRight: 16 }}>
        <Ionicons name="language-outline" size={24} color={Colors.primary} />
      </TouchableOpacity>
      
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            <TouchableOpacity style={styles.langOption} onPress={() => setLang('en')}>
              <Text style={[styles.langText, i18n.language === 'en' && styles.langActive]}>English (English)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => setLang('hi')}>
              <Text style={[styles.langText, i18n.language === 'hi' && styles.langActive]}>Hindi (हिन्दी)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => setLang('kn')}>
              <Text style={[styles.langText, i18n.language === 'kn' && styles.langActive]}>Kannada (ಕನ್ನಡ)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => setLang('bn')}>
              <Text style={[styles.langText, i18n.language === 'bn' && styles.langActive]}>Bengali (বাংলা)</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.cream,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: Typography.heading,
          fontWeight: Typography.bold,
          color: Colors.textDark,
        },
        headerRight: () => <LanguageSwitcher />,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.borderLight,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="apiary"
        options={{
          title: t('tab_apiary'),
          tabBarIcon: ({ color }) => <Ionicons name="cube-outline" size={24} color={color} />, // similar to hexagon icon in design
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t('tab_alerts'),
          tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="diagnosis"
        options={{
          title: t('tab_diagnosis'),
          tabBarIcon: ({ color }) => <Ionicons name="camera-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: 16,
    width: '80%',
  },
  modalTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
    color: Colors.textDark,
  },
  langOption: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  langText: {
    fontSize: Typography.bodySize,
    color: Colors.textMedium,
  },
  langActive: {
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
});
