import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen() {
  const { phoneNumber } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.phone}>{phoneNumber || 'Farmer'}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="apps" size={24} color={Colors.primary} style={styles.statIcon} />
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Active Hives</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="water" size={24} color={Colors.primary} style={styles.statIcon} />
          <Text style={styles.statValue}>45 kg</Text>
          <Text style={styles.statLabel}>Yield this season</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityCard}>
        <View style={styles.activityIcon}>
          <Ionicons name="leaf" size={20} color={Colors.success} />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>Harvest Completed</Text>
          <Text style={styles.activityDesc}>10kg from Apiary A, Hive 3</Text>
        </View>
        <Text style={styles.activityTime}>2h ago</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.h3,
    color: Colors.textMedium,
  },
  phone: {
    fontFamily: Typography.heading,
    fontSize: Typography.h1,
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.textDark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.small,
    color: Colors.textMedium,
  },
  sectionTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Typography.bodySize,
    fontWeight: Typography.semibold,
    color: Colors.textDark,
  },
  activityDesc: {
    fontSize: Typography.small,
    color: Colors.textMedium,
    marginTop: 2,
  },
  activityTime: {
    fontSize: Typography.tiny,
    color: Colors.textLight,
  },
});
