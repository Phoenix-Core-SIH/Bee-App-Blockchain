import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { HoneycombBackground } from '../../components/HoneycombBackground';

export default function ProfileScreen() {
  const { logout, phoneNumber } = useAuth();
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <HoneycombBackground />
      
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>SO</Text>
          <View style={styles.avatarBadge}>
            <Text style={{ fontSize: 12 }}>🐝</Text>
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Samuel Okafor</Text>
          <Text style={styles.profileFarm}>Sunridge Apiary Farm</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={Colors.danger} />
            <Text style={styles.locationText}>Kwara State, Nigeria</Text>
          </View>
          <Text style={styles.memberText}>{t('member_since')} March 2021</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>5<Text style={{fontSize: 14}}>yrs</Text></Text>
          <Text style={styles.statLabel}>{t('years_farming')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>7</Text>
          <Text style={styles.statLabel}>{t('total_hives')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>28.4<Text style={{fontSize: 14}}>kg</Text></Text>
          <Text style={styles.statLabel}>{t('season_yield')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>2</Text>
          <Text style={styles.statLabel}>{t('apiaries')}</Text>
        </View>
      </View>

      {/* Theme Toggle */}
      <View style={styles.themeToggleCard}>
        <View style={styles.themeToggleLeft}>
          <Ionicons name="sunny" size={24} color={Colors.primary} style={{ marginRight: 12 }} />
          <View>
            <Text style={styles.menuItemTitle}>{t('light_mode')}</Text>
            <Text style={styles.menuItemDesc}>{t('natural_daylight')}</Text>
          </View>
        </View>
        <Switch value={false} trackColor={{ false: Colors.border, true: Colors.primary }} />
      </View>

      {/* Account Section */}
      <Text style={styles.sectionTitle}>{t('account')}</Text>
      <View style={styles.menuGroup}>
        <MenuRow icon="person" title={t('edit_profile')} desc={t('edit_profile_desc')} />
        <MenuRow icon="notifications" title={t('notifications')} desc={t('notifications_desc')} />
        <MenuRow icon="lock-closed" title={t('privacy_security')} desc={t('privacy_desc')} isLast />
      </View>

      {/* Farm Section */}
      <Text style={styles.sectionTitle}>{t('farm')}</Text>
      <View style={styles.menuGroup}>
        <MenuRow icon="leaf" title={t('farm_details')} desc={t('farm_details_desc')} />
        <MenuRow icon="bar-chart" title={t('export_data')} desc={t('export_data_desc')} />
        <MenuRow icon="link" title={t('integrations')} desc={t('integrations_desc')} isLast />
      </View>

      {/* Support Section */}
      <Text style={styles.sectionTitle}>{t('support')}</Text>
      <View style={styles.menuGroup}>
        <MenuRow icon="book" title={t('beekeeper_guide')} desc={t('beekeeper_guide_desc')} />
        <MenuRow icon="chatbubble-ellipses" title={t('help_feedback')} desc={t('help_feedback_desc')} />
        <MenuRow icon="star" title={t('rate_hivetrack')} desc={t('rate_desc')} isLast />
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
        <Text style={styles.signOutText}>{t('sign_out')}</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>HiveTrack v1.0.0 · Made with 🐝 for farmers</Text>
    </ScrollView>
  );
}

function MenuRow({ icon, title, desc, isLast = false }: any) {
  return (
    <TouchableOpacity style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={20} color={Colors.primary} style={styles.menuIcon} />
      <View style={styles.menuTextContent}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        <Text style={styles.menuItemDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMedium} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primaryDark,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  avatarInitials: {
    fontFamily: Typography.heading,
    fontSize: 28,
    fontWeight: Typography.bold,
    color: Colors.white,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: Typography.heading,
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  profileFarm: {
    fontSize: Typography.bodySize,
    fontWeight: Typography.bold,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: Typography.small,
    color: Colors.textMedium,
    marginLeft: 4,
  },
  memberText: {
    fontSize: Typography.tiny,
    color: Colors.textMedium,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    width: '23%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    fontFamily: Typography.heading,
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.primaryDark,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: Typography.bold,
    color: Colors.textMedium,
    marginTop: 4,
    textAlign: 'center',
  },
  themeToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xl,
  },
  themeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: Typography.bold,
    color: Colors.textMedium,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xl,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: {
    marginRight: Spacing.md,
  },
  menuTextContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: Typography.bodySize,
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  menuItemDesc: {
    fontSize: Typography.small,
    color: Colors.textMedium,
    marginTop: 2,
  },
  signOutBtn: {
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  signOutText: {
    color: Colors.danger,
    fontWeight: Typography.bold,
    fontSize: Typography.bodySize,
  },
  footerText: {
    textAlign: 'center',
    fontSize: Typography.tiny,
    color: Colors.textMedium,
    fontFamily: 'monospace',
  }
});
