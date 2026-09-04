import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto'; // Need expo-crypto for idempotency key

const OFFLINE_QUEUE_KEY = 'ml_diagnosis_queue';

export default function DiagnosisScreen() {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [hives, setHives] = useState<any[]>([]);
  const [selectedHive, setSelectedHive] = useState<number | null>(null);

  useEffect(() => {
    fetchHives();
    processOfflineQueue();
  }, []);

  const fetchHives = async () => {
    try {
      // Assuming a generic endpoint to fetch all hives owned by the farmer
      const res = await api.get('/farm/hives/');
      setHives(res.data);
      if (res.data.length > 0) {
        setSelectedHive(res.data[0].id);
      }
    } catch (e) {
      console.log('Failed to fetch hives', e);
      // Fallback for UI if offline or API missing
      setHives([{ id: 1, hive_tag: "HIVE-001 (Offline fallback)" }]);
      setSelectedHive(1);
    }
  };

  const processOfflineQueue = async () => {
    try {
      const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (queueStr) {
        const queue = JSON.parse(queueStr);
        if (queue.length > 0) {
          Alert.alert("Uploading Offline Data", `Uploading ${queue.length} pending diagnoses...`);
          // For a real production app, we would process them sequentially in the background
          // Here we just notify the user that we are aware of them.
          for (let item of queue) {
            try {
               const formData = new FormData();
               formData.append('hive_id', item.hiveId);
               formData.append('idempotency_key', item.idempotencyKey);
               formData.append('image', {
                 uri: item.imageUri,
                 name: 'offline_photo.jpg',
                 type: 'image/jpeg'
               } as any);

               await api.post('/ml/predict/', formData, {
                 headers: { 'Content-Type': 'multipart/form-data' }
               });
            } catch (err) {
               console.log("Failed offline sync for item", err);
            }
          }
          await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
        }
      }
    } catch (e) {
      console.warn("Failed to process offline queue", e);
    }
  };

  const saveToOfflineQueue = async (imageUri: string, hiveId: number, idempotencyKey: string) => {
    try {
      const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      let queue = queueStr ? JSON.parse(queueStr) : [];
      queue.push({ imageUri, hiveId, idempotencyKey });
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      Alert.alert("Saved Offline", "No internet connection. The image will be uploaded automatically when you are back online.");
    } catch (e) {
      console.error("Failed to save to offline queue", e);
    }
  };

  const pickImage = async (useCamera: boolean = false) => {
    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null); // Clear previous result
    }
  };

  const analyzeImage = async () => {
    if (!image || !selectedHive) return;

    setLoading(true);
    const idempotencyKey = Crypto.randomUUID();

    const formData = new FormData();
    formData.append('hive_id', selectedHive.toString());
    formData.append('idempotency_key', idempotencyKey);
    formData.append('image', {
      uri: image,
      name: 'photo.jpg',
      type: 'image/jpeg'
    } as any);

    try {
      const response = await api.post('/ml/predict/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 15000, // Important for low connectivity
      });
      setResult(response.data);
    } catch (error: any) {
      console.log(error);
      if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
         await saveToOfflineQueue(image, selectedHive, idempotencyKey);
      } else {
        Alert.alert("Analysis Failed", error.response?.data?.error || "Could not analyze image.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('tab_diagnosis')}</Text>
      <Text style={styles.subtitle}>Upload a photo of your bees or comb to detect diseases automatically.</Text>

      {/* Hive Selector Mockup */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Select Hive:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hiveScroll}>
          {hives.map(h => (
            <TouchableOpacity 
              key={h.id} 
              style={[styles.hivePill, selectedHive === h.id && styles.hivePillActive]}
              onPress={() => setSelectedHive(h.id)}
            >
              <Text style={[styles.hivePillText, selectedHive === h.id && styles.hivePillTextActive]}>{h.hive_tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={64} color={Colors.borderLight} />
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(true)}>
          <Ionicons name="camera" size={24} color={Colors.primary} />
          <Text style={styles.secondaryButtonText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(false)}>
          <Ionicons name="images" size={24} color={Colors.primary} />
          <Text style={styles.secondaryButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, (!image || loading) && styles.disabledButton]} 
        onPress={analyzeImage}
        disabled={!image || loading}
      >
        {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryButtonText}>Analyze Health</Text>}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Diagnosis Result:</Text>
          <View style={[styles.resultBadge, result.health_status.toLowerCase() === 'healthy' ? styles.badgeSuccess : styles.badgeDanger]}>
             <Text style={styles.resultStatus}>{t(`disease_${result.health_status.toLowerCase()}`)}</Text>
          </View>
          <Text style={styles.resultConfidence}>Confidence: {result.confidence_score}%</Text>
          {result.alert_created && (
            <Text style={styles.alertText}>⚠️ An alert has been automatically created for this hive.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: Typography.h1,
    fontWeight: Typography.bold,
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: Typography.bodySize,
    color: Colors.textMedium,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  pickerContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.bodySize,
    color: Colors.textDark,
    fontWeight: Typography.bold,
    marginBottom: Spacing.sm,
  },
  hiveScroll: {
    flexDirection: 'row',
  },
  hivePill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.cream,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  hivePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  hivePillText: {
    color: Colors.textDark,
    fontWeight: Typography.bold,
  },
  hivePillTextActive: {
    color: Colors.white,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  imagePreview: {
    width: 300,
    height: 300,
    borderRadius: 16,
  },
  placeholder: {
    width: 300,
    height: 300,
    borderRadius: 16,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: Spacing.sm,
    color: Colors.textMedium,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    marginHorizontal: Spacing.xs,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: Typography.bold,
    marginLeft: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  disabledButton: {
    backgroundColor: Colors.borderLight,
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: Typography.bold,
    fontSize: Typography.h3,
  },
  resultContainer: {
    backgroundColor: Colors.cream,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xxl,
  },
  resultTitle: {
    fontWeight: Typography.bold,
    fontSize: Typography.h3,
    marginBottom: Spacing.sm,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    marginBottom: Spacing.sm,
  },
  badgeSuccess: {
    backgroundColor: '#4ade80',
  },
  badgeDanger: {
    backgroundColor: '#f87171',
  },
  resultStatus: {
    color: Colors.white,
    fontWeight: Typography.bold,
  },
  resultConfidence: {
    color: Colors.textDark,
  },
  alertText: {
    marginTop: Spacing.md,
    color: '#ef4444',
    fontWeight: Typography.bold,
  }
});
