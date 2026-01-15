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
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/contexts/AuthContext';
import apiClient, { createGasTransaction, processNotaOCR } from '../src/services/api';
import { FontAwesome5 } from '@expo/vector-icons';

interface PhotoState {
  uri: string;
  type?: string;
  name?: string;
}

const GasFillingForm = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const depositGroupId = params.deposit_group_id ? parseInt(params.deposit_group_id as string, 10) : undefined;

  // Step 1: Surat Jalan
  const [suratJalanPhoto, setSuratJalanPhoto] = useState<PhotoState | null>(null);

  // Step 2: Nota
  const [notaPhoto, setNotaPhoto] = useState<PhotoState | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResults, setOcrResults] = useState<{
    volume_liters?: number;
    rate_per_liter?: number;
    total_cost?: number;
    ocr_confidence?: number;
    raw_extracted?: {
      volume_liters?: number;
      rate_per_liter?: number;
      total_cost?: number;
    };
  } | null>(null);

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
        const photoData = {
          uri: asset.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`,
        };
        setPhoto(photoData);
        
        // If this is a nota photo, automatically process OCR
        if (setPhoto === setNotaPhoto) {
          processNotaOCRData(photoData);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const processNotaOCRData = async (photo: PhotoState) => {
    try {
      setIsProcessingOCR(true);
      setOcrResults(null);
      
      console.log('Processing nota OCR...');
      const response = await processNotaOCR(photo);
      
      console.log('Nota OCR API Response:', response);
      
      if (response.data && response.data.success && response.data.data) {
        const extractedData = response.data.data;
        setOcrResults(extractedData);
        
        Alert.alert(
          'OCR Complete',
          `Receipt data extracted successfully!\n\nVolume: ${extractedData.volume_liters?.toFixed(3)} L\nRate: Rp ${extractedData.rate_per_liter?.toLocaleString('id-ID')}/L\nTotal: Rp ${extractedData.total_cost?.toLocaleString('id-ID')}\n\nConfidence: ${Math.round((extractedData.ocr_confidence || 0) * 100)}%`
        );
      } else {
        throw new Error('Invalid API response: no data received');
      }
    } catch (error: any) {
      console.error('Nota OCR processing error:', error);
      Alert.alert(
        'OCR Processing Failed',
        `Failed to process nota photo.\n\nError: ${error.message || 'Unknown error'}\n\nPlease try taking the photo again.`
      );
      setOcrResults(null);
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !suratJalanPhoto) {
      Alert.alert('Required', 'Please take a photo of Surat Jalan');
      return;
    }
    if (currentStep === 2) {
      if (!notaPhoto) {
        Alert.alert('Required', 'Please take a photo of Nota');
        return;
      }
      if (isProcessingOCR) {
        Alert.alert('Processing', 'Please wait for OCR processing to complete');
        return;
      }
      if (!ocrResults) {
        Alert.alert('Required', 'Please wait for OCR processing to complete');
        return;
      }
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


  const handleSubmit = async () => {
    if (!suratJalanPhoto || !notaPhoto) {
      Alert.alert('Required', 'Please complete all required steps');
      return;
    }
    if (!ocrResults) {
      Alert.alert('Required', 'Please wait for OCR processing to complete');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use OCR extracted data if available, otherwise use manual input (fallback)
    const finalVolumeLiters = ocrResults?.volume_liters || undefined;
    const finalRatePerLiter = ocrResults?.rate_per_liter || undefined;
    const finalTotalCost = ocrResults?.total_cost || undefined;

    if (!finalVolumeLiters || !finalRatePerLiter || !finalTotalCost) {
      Alert.alert('Required', 'Please take a nota photo and wait for OCR processing to complete');
      return;
    }

    // Clean biaya lain amount (remove thousand separators) before sending
    const biayaLainClean =
      biayaLainAmount && biayaLainAmount.trim()
        ? biayaLainAmount.replace(/\./g, '').trim()
        : '';

    const payload: any = {
        surat_jalan_photo: suratJalanPhoto,
        nota_photo: notaPhoto,
        biaya_lain_photo: biayaLainPhoto,
        // Use OCR extracted data (backend expects volume_m3/rate_per_m3 but stores liters)
        volume_m3: finalVolumeLiters.toString(),
        rate_per_m3: finalRatePerLiter.toString(),
        total_cost: finalTotalCost.toString(),
        biaya_lain_amount: biayaLainClean ? biayaLainClean : undefined,
        biaya_lain_description: biayaLainDescription && biayaLainDescription.trim() ? biayaLainDescription.trim() : undefined,
        deposit_group_id: depositGroupId || undefined,
      };

      const response = await createGasTransaction(payload);
      const tx = response.data?.data;

      const volume = finalVolumeLiters.toFixed(3);
      const rate = finalRatePerLiter.toLocaleString('id-ID');
      const total = finalTotalCost.toLocaleString('id-ID');

      const successMessage = `Gas transaction submitted successfully!\n\nExtracted Data:\nVolume: ${volume} L\nRate: Rp ${rate}/L\nTotal: Rp ${total}`;

      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error submitting gas transaction:', error);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to submit gas transaction');
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
      <Text style={styles.stepDescription}>
        Take a photo of the Nota. Sistem akan memakai OCR untuk membaca volume, harga, dan total secara otomatis.
      </Text>

      {notaPhoto ? (
        <View style={styles.photoContainer}>
          <Image source={{ uri: notaPhoto.uri }} style={styles.photo} />
          {isProcessingOCR && (
            <View style={styles.ocrProcessingOverlay}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.ocrProcessingText}>Processing OCR...</Text>
            </View>
          )}
          {ocrResults && !isProcessingOCR && (
            <View style={styles.ocrResultsOverlay}>
              <Text style={styles.ocrResultsTitle}>Extracted Data:</Text>
              <Text style={styles.ocrResultsText}>
                Volume: {ocrResults.volume_liters?.toFixed(3)} L
              </Text>
              <Text style={styles.ocrResultsText}>
                Rate: Rp {ocrResults.rate_per_liter?.toLocaleString('id-ID')}/L
              </Text>
              <Text style={styles.ocrResultsText}>
                Total: Rp {ocrResults.total_cost?.toLocaleString('id-ID')}
              </Text>
              {ocrResults.ocr_confidence && (
                <Text style={styles.ocrConfidenceText}>
                  Confidence: {Math.round(ocrResults.ocr_confidence * 100)}%
                </Text>
              )}
            </View>
          )}
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => {
              setNotaPhoto(null);
              setOcrResults(null);
            }}
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

      {ocrResults && !isProcessingOCR && (
        <View style={styles.extractedDataContainer}>
          <Text style={styles.extractedDataTitle}>📋 Extracted Receipt Data</Text>
          <View style={styles.extractedDataRow}>
            <Text style={styles.extractedDataLabel}>Volume:</Text>
            <Text style={styles.extractedDataValue}>
              {ocrResults.volume_liters?.toFixed(3)} L
            </Text>
          </View>
          <View style={styles.extractedDataRow}>
            <Text style={styles.extractedDataLabel}>Rate per Liter:</Text>
            <Text style={styles.extractedDataValue}>
              Rp {ocrResults.rate_per_liter?.toLocaleString('id-ID')}
            </Text>
          </View>
          <View style={styles.extractedDataRow}>
            <Text style={styles.extractedDataLabel}>Total Cost:</Text>
            <Text style={styles.extractedDataValue}>
              Rp {ocrResults.total_cost?.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>
      )}
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
        <Text style={styles.label}>Amount (Rp)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter amount (optional)"
          value={biayaLainAmount}
          onChangeText={(text) => {
            // Only allow digits, then format with thousand separators (dot)
            const numeric = text.replace(/[^0-9]/g, '');
            if (!numeric) {
              setBiayaLainAmount('');
              return;
            }
            const formatted = numeric.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            setBiayaLainAmount(formatted);
          }}
          keyboardType="numeric"
          returnKeyType="done"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Enter description (optional)"
          value={biayaLainDescription}
          onChangeText={setBiayaLainDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="done"
        />
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
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    maxHeight: 120,
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
  ocrProcessingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  ocrProcessingText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  ocrResultsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  ocrResultsTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ocrResultsText: {
    color: '#FFF',
    fontSize: 12,
    marginBottom: 2,
  },
  ocrConfidenceText: {
    color: '#90EE90',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  extractedDataContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  extractedDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  extractedDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  extractedDataLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  extractedDataValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  rawDataContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  rawDataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  rawDataText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default GasFillingForm;

