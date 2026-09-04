import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import { HoneycombBackground } from '../../components/HoneycombBackground';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// App Icon component
function AppIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconEmoji}>🐝</Text>
    </View>
  );
}

type TabType = 'login' | 'register';

export default function LoginScreen() {
  const [tab, setTab] = useState<TabType>('login');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');

  const { requestOtp, verifyOtp } = useAuth();

  const handleRequestOtp = async () => {
    if (!phone.trim()) {
      Alert.alert('Enter your phone number');
      return;
    }
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      setOtpSent(true);
      Alert.alert('OTP Sent', `A verification code was sent to ${phone}`);
    } catch (e: any) {
      Alert.alert('Error', e?.data?.detail || 'Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Enter the OTP');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), otp.trim());
      router.replace('/(tabs)/');
    } catch (e: any) {
      Alert.alert('Invalid OTP', 'The code you entered is incorrect. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!phone) {
      Alert.alert('Enter your phone number');
      return;
    }
    setLoading(true);
    try {
      // Backend creates user automatically on first OTP verify (get_or_create)
      // Just send the OTP and let them verify to create their account
      await requestOtp(phone.trim());
      setOtpSent(true);
      Alert.alert('OTP Sent!', 'Enter the code sent to your phone to create your account.');
    } catch (e: any) {
      Alert.alert('Error', e?.data?.phone_number?.[0] || 'Could not send OTP. Check the number and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <HoneycombBackground />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App Icon + Name */}
        <AppIcon />
        <Text style={styles.appName}>HiveTrack</Text>
        <Text style={styles.subtitle}>
          {tab === 'login' ? 'Welcome back, farmer' : 'Join the apiary network'}
        </Text>

        {/* Tab switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === 'login' && styles.tabActive]}
            onPress={() => { setTab('login'); setOtpSent(false); }}
          >
            <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'register' && styles.tabActive]}
            onPress={() => { setTab('register'); setOtpSent(false); }}
          >
            <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <View style={styles.form}>
            {!otpSent ? (
              <>
                <InputField
                  label="PHONE NUMBER"
                  icon="call-outline"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleRequestOtp} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.otpHint}>Enter the 6-digit code sent to {phone}</Text>
                <InputField
                  label="OTP CODE"
                  icon="keypad-outline"
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="• • • • • •"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOtp} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In to HiveTrack</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOtpSent(false)}>
                  <Text style={styles.linkText}>← Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <View style={styles.form}>
            {!otpSent ? (
              <>
                <InputField label="FULL NAME *" icon="person-outline" value={firstName} onChangeText={setFirstName} placeholder="Samuel Okafor" />
                <InputField label="LAST NAME" icon="person-outline" value={lastName} onChangeText={setLastName} placeholder="Okafor" />
                <InputField label="FARM NAME" icon="home-outline" value={farmName} onChangeText={setFarmName} placeholder="Sunridge Apiary" />
                <InputField label="LOCATION" icon="location-outline" value={location} onChangeText={setLocation} placeholder="Kwara State, Nigeria" />
                <InputField label="PHONE NUMBER *" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create My Account</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.otpHint}>
                  Account created! Enter the OTP sent to {phone}
                </Text>
                <InputField
                  label="OTP CODE"
                  icon="keypad-outline"
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="• • • • • •"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Verify & Enter</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Reusable input field ───────────────────────────────────────────────────────
function InputField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  maxLength,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={inputStyles.container}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={inputStyles.inputRow}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} style={inputStyles.icon} />
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: Typography.bold,
    color: Colors.textMedium,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textDark,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primaryButton,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 40,
  },
  appName: {
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: Typography.bold,
    color: Colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 24,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.lg,
    padding: 4,
    width: '100%',
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  tabActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
  form: {
    width: '100%',
  },
  otpHint: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: Colors.primaryButton,
    borderRadius: Radius.lg,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: Typography.semibold,
    letterSpacing: 0.3,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: Typography.medium,
  },
});
