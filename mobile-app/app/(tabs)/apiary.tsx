import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Mock data matching the design
const APIARIES = [
  {
    id: 1,
    name: 'Coorg Apiary',
    location: 'Madikeri, Karnataka',
    hives: 8,
    healthy: 7,
    yield: 24,
    status: 'Active',
    image: require('../../assets/onboarding_monitor.jpg'), // using placeholder
    hiveList: [
      { id: 'H-01', type: 'Langstroth', status: 'Healthy', queen: 'Active', honey: '85%', pop: 'High', temp: '34°C', fill: 0.85 },
      { id: 'H-02', type: 'Langstroth', status: 'Healthy', queen: 'Active', honey: '70%', pop: 'Medium', temp: '34°C', fill: 0.7 },
    ]
  },
  {
    id: 2,
    name: 'Valley Farm',
    location: 'Chikmagalur, Karnataka',
    hives: 6,
    healthy: 5,
    yield: 14,
    status: 'Active',
    image: require('../../assets/onboarding_honey.jpg'), // using placeholder
    hiveList: []
  }
];

export default function ApiaryScreen() {
  const { t } = useTranslation();
  const [selectedApiaryId, setSelectedApiaryId] = useState<number | null>(APIARIES[0].id);

  const selectedApiary = APIARIES.find(a => a.id === selectedApiaryId);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Section: Apiaries List */}
      <View style={styles.header}>
        <Text style={styles.headerSuper}>{t('apiary_dashboard')}</Text>
        <Text style={styles.headerTitle}>{t('my_apiaries')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.apiaryList}>
        {APIARIES.map(apiary => {
          const isActive = selectedApiaryId === apiary.id;
          return (
            <TouchableOpacity 
              key={apiary.id} 
              style={[styles.apiaryCard, isActive && styles.apiaryCardActive]}
              onPress={() => setSelectedApiaryId(apiary.id)}
            >
              <View style={styles.apiaryCardTop}>
                {/* Simulated Image */}
                <View style={styles.apiaryImagePlaceholder} />
                <View style={styles.apiaryCardInfo}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.apiaryName}>{apiary.name}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{apiary.status}</Text>
                    </View>
                  </View>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={12} color={Colors.danger} />
                    <Text style={styles.locationText}>{apiary.location}</Text>
                  </View>
                  <View style={styles.apiaryStatsRow}>
                    <Text style={styles.apiaryStat}><Text style={styles.bold}>{apiary.hives}</Text> {t('hives_lowercase')}</Text>
                    <Text style={styles.apiaryStat}><Text style={styles.bold}>{apiary.healthy}</Text> {t('healthy')}</Text>
                    <Text style={styles.apiaryStat}><Text style={styles.bold}>{apiary.yield}kg</Text> {t('yield')}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom Section: Hives for Selected Apiary */}
      {selectedApiary && (
        <View style={styles.hivesSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.hivesSectionTitle}>{selectedApiary.name} — Hives</Text>
            <TouchableOpacity>
              <Text style={styles.addHiveText}>{t('add_hive')}</Text>
            </TouchableOpacity>
          </View>

          {selectedApiary.hiveList.map(hive => (
            <View key={hive.id} style={styles.hiveCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.hiveName}>Hive {hive.id} <Text style={styles.hiveType}>{hive.type}</Text></Text>
                <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#2E7D32' }]}>{hive.status}</Text>
                </View>
              </View>

              <View style={styles.hiveStatsGrid}>
                <View style={styles.hiveStatItem}>
                  <Text style={styles.hiveStatIcon}>👑</Text>
                  <Text style={styles.hiveStatValue}>{hive.queen}</Text>
                  <Text style={styles.hiveStatLabel}>Queen</Text>
                </View>
                <View style={styles.hiveStatItem}>
                  <Text style={styles.hiveStatIcon}>🍯</Text>
                  <Text style={styles.hiveStatValue}>{hive.honey}</Text>
                  <Text style={styles.hiveStatLabel}>Honey</Text>
                </View>
                <View style={styles.hiveStatItem}>
                  <Text style={styles.hiveStatIcon}>🐝</Text>
                  <Text style={styles.hiveStatValue}>{hive.pop}</Text>
                  <Text style={styles.hiveStatLabel}>Pop.</Text>
                </View>
                <View style={styles.hiveStatItem}>
                  <Text style={styles.hiveStatIcon}>🌡️</Text>
                  <Text style={styles.hiveStatValue}>{hive.temp}</Text>
                  <Text style={styles.hiveStatLabel}>Temp</Text>
                </View>
              </View>

              <View style={styles.progressBarContainer}>
                <View style={styles.rowBetween}>
                  <Text style={styles.progressLabel}>Honey fill</Text>
                  <Text style={styles.progressLabel}>{hive.honey}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: ((hive.fill * 100) + '%') as any }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.primaryDark, // matching top header color from design
  },
  headerSuper: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.display,
    fontWeight: Typography.bold,
    color: Colors.white,
  },
  apiaryList: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  apiaryCard: {
    width: 320,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    padding: 12,
  },
  apiaryCardActive: {
    borderColor: Colors.primary,
  },
  apiaryCardTop: {
    flexDirection: 'row',
  },
  apiaryImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#E0E0E0',
    borderRadius: Radius.md,
    marginRight: 12,
  },
  apiaryCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  apiaryName: {
    fontFamily: Typography.heading,
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: '#2E7D32',
    textTransform: 'uppercase',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationText: {
    fontSize: Typography.small,
    color: Colors.textMedium,
    marginLeft: 4,
  },
  apiaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  apiaryStat: {
    fontSize: Typography.small,
    color: Colors.textMedium,
  },
  bold: {
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  hivesSection: {
    padding: Spacing.lg,
  },
  hivesSectionTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  addHiveText: {
    fontSize: Typography.bodySize,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  hiveCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  hiveName: {
    fontFamily: Typography.heading,
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  hiveType: {
    fontFamily: Typography.bodyFont,
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: Colors.textMedium,
  },
  hiveStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  hiveStatItem: {
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    width: '23%',
  },
  hiveStatIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  hiveStatValue: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  hiveStatLabel: {
    fontSize: 10,
    color: Colors.textMedium,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressLabel: {
    fontSize: Typography.tiny,
    color: Colors.primaryDark,
    fontWeight: Typography.bold,
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.creamDark,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
});
