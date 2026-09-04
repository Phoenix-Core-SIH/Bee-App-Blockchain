import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { HoneycombBackground } from '../components/HoneycombBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'monitor',
    tag: 'REAL-TIME VISIBILITY',
    title: 'Monitor Every Hive',
    body: 'Track temperature, humidity, and colony activity across all your hives from one place.',
    image: require('../assets/onboarding_monitor.jpg'),
  },
  {
    key: 'yields',
    tag: 'SEASON BY SEASON',
    title: 'Track Honey Yields',
    body: 'Log harvests, forecast yields, and see your best-performing apiaries at a glance.',
    image: require('../assets/onboarding_honey.jpg'),
  },
  {
    key: 'alerts',
    tag: 'NEVER MISS A MOMENT',
    title: 'Stay Alert, Stay Ready',
    body: 'Instant notifications when a hive needs attention. Early warnings save colonies.',
    image: require('../assets/onboarding_alert.jpg'),
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentIndex(index);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hivetrack_onboarded', 'true');
    router.replace('/auth/login');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goTo(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <HoneycombBackground />

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={styles.slide}>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <Image source={slide.image} style={styles.illustration} resizeMode="contain" />
            </View>

            {/* Tag pill */}
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{slide.tag}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{slide.title}</Text>

            {/* Body */}
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA button */}
      <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.buttonText}>{isLast ? 'Get Started' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(210, 190, 148, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  skipText: {
    color: Colors.textMedium,
    fontSize: Typography.small,
    fontWeight: Typography.medium,
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: height * 0.12,
  },
  illustrationContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  illustration: {
    width: 200,
    height: 200,
  },
  tagPill: {
    backgroundColor: 'rgba(200, 160, 60, 0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  tagText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: Typography.bold,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 30,
    fontWeight: Typography.bold,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 36,
  },
  body: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 36,
  },
  button: {
    width: width - Spacing.xl * 2,
    backgroundColor: Colors.primaryButton,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: Typography.semibold,
    letterSpacing: 0.3,
  },
});
