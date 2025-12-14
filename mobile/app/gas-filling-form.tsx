// mobile/app/gas-filling-form.tsx
// 3-step camera form: Surat Jalan -> Nota -> Biaya Lain

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/contexts/AuthContext';
import apiClient from '../src/services/api';
import { FontAwesome5 } from '@expo/vector-icons';

interface PhotoState {
  uri: string;
  type?: string;
  name?: string;
}

const GasFillingForm = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Surat Jalan
  const [suratJalanPhoto, setSuratJalanPhoto] = useState<PhotoState | null>(null);

  // Step 2: Nota
  const [notaPhoto, setNotaPhoto] = useState<PhotoState | null>(null);
  const [volumeM3, setVolumeM3] = useState('');
  const [calculationMethod, setCalculationMethod] = useState<'jisdor' | 'fixed'>('jisdor');
  const [ratePerM3, setRatePerM3] = useState('');
  const [jisdorRate, setJisdorRate] = useState('');

  // Step 3: Biaya Lain
  const [biayaLainPhoto, setBiayaLainPhoto] = useState<PhotoState | null>(null);
  const [biayaLainAmount, setBiayaLainAmount] = useState('');
  const [biayaLainDescription, setBiayaLainDescription] = useState('');

  const takePhoto = async (setPhoto: (photo: PhotoState) => void) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !suratJalanPhoto) {
      Alert.alert('Required', 'Please take a photo of Surat Jalan');
      return;
    }
    if (currentStep === 2 && !notaPhoto) {
      Alert.alert('Required', 'Please take a photo of Nota');
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const calculateTotalCost = () => {
    if (!volumeM3 || !ratePerM3) return 0;
    const volume = parseFloat(volumeM3);
    const rate = parseFloat(ratePerM3);
    return volume * rate;
  };

  const handleSubmit = async () => {
    if (!suratJalanPhoto || !notaPhoto) {
      Alert.alert('Required', 'Please complete all required steps');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Append photos
      formData.append('surat_jalan_photo', {
        uri: suratJalanPhoto.uri,
        type: suratJalanPhoto.type || 'image/jpeg',
        name: suratJalanPhoto.name || 'surat_jalan.jpg',
      } as any);

      formData.append('nota_photo', {
        uri: notaPhoto.uri,
        type: notaPhoto.type || 'image/jpeg',
        name: notaPhoto.name || 'nota.jpg',
      } as any);

      if (biayaLainPhoto) {
        formData.append('biaya_lain_photo', {
          uri: biayaLainPhoto.uri,
          type: biayaLainPhoto.type || 'image/jpeg',
          name: biayaLainPhoto.name || 'biaya_lain.jpg',
        } as any);
      }

      // Append form data
      formData.append('volume_m3', volumeM3);
      formData.append('calculation_method', calculationMethod);
      formData.append('rate_per_m3', ratePerM3);
      if (jisdorRate) {
        formData.append('jisdor_rate', jisdorRate);
      }
      formData.append('total_cost', calculateTotalCost().toString());

      if (biayaLainAmount) {
        formData.append('biaya_lain_amount', biayaLainAmount);
      }
      if (biayaLainDescription) {
        formData.append('biaya_lain_description', biayaLainDescription);
      }

      // Fire-and-forget submission
      await apiClient.post('/gas-transactions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Gas transaction submitted successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error submitting gas transaction:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to submit gas transaction'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: Surat Jalan</Text>
      <Text style={styles.stepDescription}>Take a photo of the Surat Jalan</Text>

      {suratJalanPhoto ? (
        <View style={styles.photoContainer}>
          <Image source={{ uri: suratJalanPhoto.uri }} style={styles.photo} />
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => setSuratJalanPhoto(null)}
          >
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => takePhoto(setSuratJalanPhoto)}
        >
          <FontAwesome5 name="camera" size={32} color="#007AFF" />
          <Text style={styles.cameraButtonText}>Take Photo</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Nota</Text>
      <Text style={styles.stepDescription}>Take a photo of the Nota and fill in details</Text>

      {notaPhoto ? (
        <View style={styles.photoContainer}>
          <Image source={{ uri: notaPhoto.uri }} style={styles.photo} />
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => setNotaPhoto(null)}
          >
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => takePhoto(setNotaPhoto)}
        >
          <FontAwesome5 name="camera" size={32} color="#007AFF" />
          <Text style={styles.cameraButtonText}>Take Photo</Text>
        </TouchableOpacity>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Volume (m³)</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => {
            // You can add OCR processing here if needed
            Alert.prompt('Volume', 'Enter volume in m³', (text) => {
              if (text) setVolumeM3(text);
            });
          }}
        >
          <Text style={styles.inputText}>{volumeM3 || 'Enter volume'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Calculation Method</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioButton,
              calculationMethod === 'jisdor' && styles.radioButtonActive,
            ]}
            onPress={() => setCalculationMethod('jisdor')}
          >
            <Text
              style={[
                styles.radioButtonText,
                calculationMethod === 'jisdor' && styles.radioButtonTextActive,
              ]}
            >
              JISDOR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.radioButton,
              calculationMethod === 'fixed' && styles.radioButtonActive,
            ]}
            onPress={() => setCalculationMethod('fixed')}
          >
            <Text
              style={[
                styles.radioButtonText,
                calculationMethod === 'fixed' && styles.radioButtonTextActive,
              ]}
            >
              Fixed Rate
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Rate per m³</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => {
            Alert.prompt('Rate', 'Enter rate per m³', (text) => {
              if (text) setRatePerM3(text);
            });
          }}
        >
          <Text style={styles.inputText}>{ratePerM3 || 'Enter rate'}</Text>
        </TouchableOpacity>
      </View>

      {calculationMethod === 'jisdor' && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>JISDOR Rate</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              Alert.prompt('JISDOR Rate', 'Enter JISDOR rate', (text) => {
                if (text) setJisdorRate(text);
              });
            }}
          >
            <Text style={styles.inputText}>{jisdorRate || 'Enter JISDOR rate'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Cost:</Text>
        <Text style={styles.totalAmount}>
          Rp {calculateTotalCost().toLocaleString('id-ID')}
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3: Biaya Lain (Optional)</Text>
      <Text style={styles.stepDescription}>Add any additional expenses</Text>

      {biayaLainPhoto ? (
        <View style={styles.photoContainer}>
          <Image source={{ uri: biayaLainPhoto.uri }} style={styles.photo} />
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => setBiayaLainPhoto(null)}
          >
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => takePhoto(setBiayaLainPhoto)}
        >
          <FontAwesome5 name="camera" size={32} color="#007AFF" />
          <Text style={styles.cameraButtonText}>Take Photo (Optional)</Text>
        </TouchableOpacity>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Amount</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => {
            Alert.prompt('Amount', 'Enter amount', (text) => {
              if (text) setBiayaLainAmount(text);
            });
          }}
        >
          <Text style={styles.inputText}>{biayaLainAmount || 'Enter amount'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => {
            Alert.prompt('Description', 'Enter description', (text) => {
              if (text) setBiayaLainDescription(text);
            });
          }}
        >
          <Text style={styles.inputText}>
            {biayaLainDescription || 'Enter description'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Gas Filling Form ({currentStep}/3)
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep < 3 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, styles.submitButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.nextButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  cameraButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButtonText: {
    marginTop: 10,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  photoContainer: {
    marginBottom: 20,
  },
  photo: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 10,
  },
  retakeButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  inputText: {
    fontSize: 16,
    color: '#000',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  radioButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  radioButtonText: {
    fontSize: 14,
    color: '#666',
  },
  radioButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  totalContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#34C759',
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GasFillingForm;

