import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { processNotaKecilOCR, confirmNotaKecil as confirmNotaKecilAPI, processIndividualPhotoOCR, uploadNotaKecilImagesToGoogleDrive } from '../src/services/api';

interface NotaKecilUploaderProps {
  deliveryOrderId: string;
  customerLocationIndex: number;
  customerName: string;
  customerAddress: string;
  onNotaKecilCreated: (notaKecil: any) => void;
  onClose?: () => void; // Add close callback
}

interface OCRResults {
  id?: string;
  stan_awal: number;
  stan_akhir: number;
  tekanan_operasi: number;
  temperatur_operasi: number;
  Vt: number;
  k: number;
  V: number;
  confidence_scores: {
    stan_awal: number;
    stan_akhir: number;
    tekanan_operasi: number;
    temperatur_operasi: number;
  };
}

interface PhotoState {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

const NotaKecilUploader: React.FC<NotaKecilUploaderProps> = ({
  deliveryOrderId,
  customerLocationIndex,
  customerName,
  customerAddress,
  onNotaKecilCreated,
  onClose,
}) => {
  const [photos, setPhotos] = useState<{
    pressure_bar: PhotoState | null;
    temperature: PhotoState | null;
    stan_awal: PhotoState | null;
    stan_akhir: PhotoState | null;
  }>({
    pressure_bar: null,
    temperature: null,
    stan_awal: null,
    stan_akhir: null,
  });

  const [ocrResults, setOcrResults] = useState<{
    pressure_bar: { value: string; confidence: number; processing: boolean } | null;
    temperature: { value: string; confidence: number; processing: boolean } | null;
    stan_awal: { value: string; confidence: number; processing: boolean } | null;
    stan_akhir: { value: string; confidence: number; processing: boolean } | null;
  }>({
    pressure_bar: null,
    temperature: null,
    stan_awal: null,
    stan_akhir: null,
  });

  const [editedValues, setEditedValues] = useState<{
    stan_awal: string;
    stan_akhir: string;
    tekanan_operasi: string;
    temperatur_operasi: string;
    customer_name: string;
    customer_address: string;
  }>({
    stan_awal: '',
    stan_akhir: '',
    tekanan_operasi: '',
    temperatur_operasi: '',
    customer_name: '',
    customer_address: '',
  });

  const [calculatedValues, setCalculatedValues] = useState<{
    Vt: number;
    k: number;
    V: number;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<{
    type: keyof typeof photos;
    label: string;
    value: string;
  } | null>(null);
  const [driverNotes, setDriverNotes] = useState('');
  const [useRealOCR, setUseRealOCR] = useState(false); // Toggle for real OCR processing
  const [photoUrls, setPhotoUrls] = useState<{
    pressure_bar: string | null;
    temperature: string | null;
    stan_awal: string | null;
    stan_akhir: string | null;
  }>({
    pressure_bar: null,
    temperature: null,
    stan_awal: null,
    stan_akhir: null,
  });

  const takePhoto = async (photoType: keyof typeof photos) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhotos(prev => ({
          ...prev,
          [photoType]: {
            uri: asset.uri,
            fileName: asset.fileName || `${photoType}_${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
          },
        }));

        // Automatically process OCR for this photo
        await processIndividualOCR(photoType, {
          uri: asset.uri,
          fileName: asset.fileName || `${photoType}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const processIndividualOCR = async (photoType: keyof typeof photos, photo: PhotoState) => {
    try {
      // Set processing state
      setOcrResults(prev => ({
        ...prev,
        [photoType]: { value: '', confidence: 0, processing: true }
      }));

      try {
        if (useRealOCR) {
          // Call the real OCR API for individual photo
          console.log(`Processing OCR for ${photoType}...`);
          
          const response = await processIndividualPhotoOCR(
            deliveryOrderId, 
            photoType, 
            customerLocationIndex, 
            photo
          );

        console.log('Full API Response:', response);
        console.log('Response Status:', response.status);
        console.log('Response Headers:', response.headers);
        
        const responseData = response.data;
        
        // Debug logging
        console.log('OCR API Response Data:', responseData);
        console.log('Response Data Type:', typeof responseData);
        console.log('Response Data Keys:', Object.keys(responseData || {}));
        
        // Validate API response
        if (!responseData || !responseData.success) {
          throw new Error('Invalid API response: no success data received');
        }
        
        const ocrData = responseData.data;
        console.log('OCR Data from response:', ocrData);
        
        if (!ocrData || typeof ocrData.extracted_value === 'undefined' || ocrData.extracted_value === null) {
          throw new Error(`Invalid API response: missing extracted_value. OCR Data: ${JSON.stringify(ocrData)}`);
        }
        
        const extractedValue = ocrData.extracted_value?.toString() || '0';
        const confidenceScore = ocrData.confidence_score || 0;
        
        // Set OCR result from API response
        console.log(`Setting OCR result for ${photoType}:`, { value: extractedValue, confidence: confidenceScore });
        
        setOcrResults(prev => {
          const newResults = {
            ...prev,
            [photoType]: { 
              value: extractedValue, 
              confidence: confidenceScore, 
              processing: false 
            }
          };
          console.log('New OCR Results State:', newResults);
          return newResults;
        });

        // Update edited values with OCR result
        const fieldName = getValueField(photoType);
        console.log(`Setting edited value for ${fieldName}:`, extractedValue);
        
        setEditedValues(prev => ({
          ...prev,
          [fieldName]: extractedValue
        }));

          // Store photo URL from API response
          if (ocrData.photo_url) {
            setPhotoUrls(prev => ({
              ...prev,
              [photoType]: ocrData.photo_url
            }));
          }

          // Recalculate gas values
          recalculateGasValues(photoType, extractedValue);

          // Check for mismatch scenario
          const isMismatch = ocrData.is_mismatch;
          const actualField = ocrData.actual_field;
          
          if (isMismatch && actualField) {
            Alert.alert(
              'Photo Type Detected',
              `Expected: ${getPhotoTypeLabel(photoType)}\nDetected: ${getPhotoTypeLabel(actualField)}\nValue: ${extractedValue}\n\nUsing detected value.`,
              [
                { text: 'OK', style: 'default' }
              ]
            );
          } else if (extractedValue === '0') {
            Alert.alert(
              'No Value Detected',
              `Could not extract any meter reading from this photo.\n\nPlease ensure the photo is clear and shows a meter/display.`,
              [
                { text: 'Retake Photo', onPress: () => removePhoto(photoType) },
                { text: 'Continue Anyway', style: 'cancel' }
              ]
            );
          } else {
            Alert.alert(
              'OCR Complete',
              `${getPhotoTypeLabel(photoType)}: ${extractedValue}\nConfidence: ${Math.round(confidenceScore * 100)}%`
            );
          }
        } else {
          // Use simulated data when real OCR is disabled
          console.log(`Using simulated OCR data for ${photoType}...`);
          
          const simulatedResults = {
            pressure_bar: { value: '1.70', confidence: 0.92 },
            temperature: { value: '29.0', confidence: 0.88 },
            stan_awal: { value: '1279.07', confidence: 0.95 },
            stan_akhir: { value: '1413.03', confidence: 0.91 },
          };

          const result = simulatedResults[photoType];
          const extractedValue = result.value;
          const confidenceScore = result.confidence;
          
          // Set OCR result
          setOcrResults(prev => ({
            ...prev,
            [photoType]: { value: extractedValue, confidence: confidenceScore, processing: false }
          }));

          // Update edited values with OCR result
          setEditedValues(prev => ({
            ...prev,
            [getValueField(photoType)]: extractedValue
          }));

          // Store fake photo URL for simulated mode
          setPhotoUrls(prev => ({
            ...prev,
            [photoType]: `/uploads/nota_kecil/simulated_${photoType}_${Date.now()}.jpg`
          }));

          // Recalculate gas values
          recalculateGasValues(photoType, extractedValue);

          Alert.alert(
            'OCR Complete (Simulated)',
            `${getPhotoTypeLabel(photoType)}: ${extractedValue}\nConfidence: ${Math.round(confidenceScore * 100)}%\n\nNote: Using simulated data`
          );
        }

      } catch (apiError) {
        console.error(`API error for ${photoType}:`, apiError);
        console.error('API Error Details:', {
          message: apiError.message,
          stack: apiError.stack,
          response: apiError.response?.data
        });
        
        // Set error state instead of fake data
        setOcrResults(prev => ({
          ...prev,
          [photoType]: { value: '', confidence: 0, processing: false }
        }));

        Alert.alert(
          'OCR Processing Failed',
          `Failed to process ${getPhotoTypeLabel(photoType)} photo.\n\nError: ${apiError.message}\n\nPlease try taking the photo again.`,
          [
            { text: 'Retake Photo', onPress: () => removePhoto(photoType) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }

    } catch (error) {
      console.error(`OCR processing error for ${photoType}:`, error);
      
      // Set error state
      setOcrResults(prev => ({
        ...prev,
        [photoType]: { value: '', confidence: 0, processing: false }
      }));

      Alert.alert('Error', `Failed to process ${getPhotoTypeLabel(photoType)} photo`);
    }
  };

  const getValueField = (photoType: keyof typeof photos): keyof typeof editedValues => {
    switch (photoType) {
      case 'pressure_bar': return 'tekanan_operasi';
      case 'temperature': return 'temperatur_operasi';
      case 'stan_awal': return 'stan_awal';
      case 'stan_akhir': return 'stan_akhir';
      default: return 'stan_awal';
    }
  };

  const getPhotoTypeLabel = (photoType: keyof typeof photos): string => {
    switch (photoType) {
      case 'pressure_bar': return 'Pressure Bar';
      case 'temperature': return 'Temperature';
      case 'stan_awal': return 'Stan Awal';
      case 'stan_akhir': return 'Stan Akhir';
      default: return 'Unknown';
    }
  };

  const recalculateGasValues = (photoType: keyof typeof photos, newValue: string) => {
    const updatedValues = {
      ...editedValues,
      [getValueField(photoType)]: newValue
    };

    const numericValues = {
      stan_awal: parseFloat(updatedValues.stan_awal) || 0,
      stan_akhir: parseFloat(updatedValues.stan_akhir) || 0,
      tekanan_operasi: parseFloat(updatedValues.tekanan_operasi) || 0,
      temperatur_operasi: parseFloat(updatedValues.temperatur_operasi) || 0,
    };

    // Only calculate if we have all required values
    if (numericValues.stan_awal > 0 && numericValues.stan_akhir > 0 && 
        numericValues.tekanan_operasi > 0 && numericValues.temperatur_operasi > 0) {
      const calculated = calculateGasValues(
        numericValues.stan_awal,
        numericValues.stan_akhir,
        numericValues.tekanan_operasi,
        numericValues.temperatur_operasi
      );
      setCalculatedValues(calculated);
    }
  };

  const openEditModal = (photoType: keyof typeof photos) => {
    const ocrResult = ocrResults[photoType];
    if (ocrResult && !ocrResult.processing) {
      setEditingField({
        type: photoType,
        label: getPhotoTypeLabel(photoType),
        value: ocrResult.value
      });
      setShowEditModal(true);
    }
  };

  const saveEditedValue = (newValue: string) => {
    if (editingField) {
      const fieldName = getValueField(editingField.type);
      
      // Update edited values
      setEditedValues(prev => ({
        ...prev,
        [fieldName]: newValue
      }));

      // Update OCR results
      setOcrResults(prev => ({
        ...prev,
        [editingField.type]: {
          ...prev[editingField.type]!,
          value: newValue
        }
      }));

      // Recalculate gas values
      recalculateGasValues(editingField.type, newValue);

      setShowEditModal(false);
      setEditingField(null);
    }
  };

  const removePhoto = (photoType: keyof typeof photos) => {
    setPhotos(prev => ({
      ...prev,
      [photoType]: null,
    }));

    // Clear OCR results for this photo type
    setOcrResults(prev => ({
      ...prev,
      [photoType]: null
    }));

    // Clear edited value for this photo type
    const fieldName = getValueField(photoType);
    setEditedValues(prev => ({
      ...prev,
      [fieldName]: ''
    }));

    // Clear calculated values
    setCalculatedValues(null);
  };

  const calculateGasValues = (
    stanAwal: number,
    stanAkhir: number,
    pressure: number,
    temperature: number
  ) => {
    // Calculate Vt (Volume from Meter)
    const Vt = stanAkhir - stanAwal;

    // Calculate k (Super Compressibility Factor)
    let k: number;
    if (pressure < 4) {
      k = 1 + (0.0002 * pressure);
    } else {
      // For p >= 4 bar, use simplified calculation
      // In real implementation, this would use A.G.A Report NX-19
      k = 1 + (0.0002 * pressure) + (0.0001 * temperature);
    }

    // Calculate V (Final Volume Gas)
    const V = Vt * k;

    return { Vt, k, V };
  };

  const checkIfReadyToConfirm = () => {
    const allPhotosTaken = Object.values(photos).every(photo => photo !== null);
    const allOCRProcessed = Object.values(ocrResults).every(result => 
      result !== null && !result.processing && result.value !== ''
    );

    if (allPhotosTaken && allOCRProcessed) {
      setShowReviewModal(true);
    } else {
      const missingItems = [];
      if (!allPhotosTaken) missingItems.push('photos');
      if (!allOCRProcessed) missingItems.push('OCR processing');
      
      Alert.alert(
        'Not Ready',
        `Please complete: ${missingItems.join(', ')}`
      );
    }
  };

  const handleValueChange = (field: keyof typeof editedValues, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [field]: value,
    }));

    // Only recalculate gas values for numeric fields
    if (field === 'stan_awal' || field === 'stan_akhir' || field === 'tekanan_operasi' || field === 'temperatur_operasi') {
      const numericValues = {
        stan_awal: parseFloat(editedValues.stan_awal) || 0,
        stan_akhir: parseFloat(editedValues.stan_akhir) || 0,
        tekanan_operasi: parseFloat(editedValues.tekanan_operasi) || 0,
        temperatur_operasi: parseFloat(editedValues.temperatur_operasi) || 0,
      };

      // Update the specific field that changed
      numericValues[field] = parseFloat(value) || 0;

      if (numericValues.stan_awal > 0 && numericValues.stan_akhir > 0 && 
          numericValues.tekanan_operasi > 0 && numericValues.temperatur_operasi > 0) {
        const calculated = calculateGasValues(
          numericValues.stan_awal,
          numericValues.stan_akhir,
          numericValues.tekanan_operasi,
          numericValues.temperatur_operasi
        );
        setCalculatedValues(calculated);
      }
    }
  };

  const confirmNotaKecil = async () => {
    if (!calculatedValues) {
      Alert.alert('Error', 'Please review and confirm the calculated values');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Step 1: Upload images to Google Drive
      console.log('Uploading images to Google Drive...');
      const uploadResponse = await uploadNotaKecilImagesToGoogleDrive(
        deliveryOrderId,
        editedValues.customer_name || customerName,
        customerLocationIndex,
        photos
      );
      
      console.log('Google Drive upload response:', uploadResponse);
      console.log('Upload response success:', uploadResponse.success);
      console.log('Upload response data:', uploadResponse.data);
      console.log('Upload response data structure:', JSON.stringify(uploadResponse, null, 2));
      
      // Check if upload was successful
      if (!uploadResponse.success) {
        throw new Error('Image upload failed: ' + uploadResponse.message);
      }
      
      // Safely extract uploadedImages with fallback
      const uploadedImages = uploadResponse.data?.data?.uploadedImages || 
                           uploadResponse.data?.uploadedImages || 
                           {
                             pressure_bar: [],
                             temperature: [],
                             stan_awal: [],
                             stan_akhir: [],
                           };
      
      console.log('Extracted uploadedImages:', uploadedImages);
      
      // Step 2: Create nota kecil record with Google Drive URLs
      const confirmedValues = {
        stan_awal: parseFloat(editedValues.stan_awal),
        stan_akhir: parseFloat(editedValues.stan_akhir),
        tekanan_operasi: parseFloat(editedValues.tekanan_operasi),
        temperatur_operasi: parseFloat(editedValues.temperatur_operasi),
        driver_notes: driverNotes,
        customer_location_index: customerLocationIndex,
        customer_name: editedValues.customer_name,
        customer_address: editedValues.customer_address,
        // Use Google Drive URLs from upload response
        photos: uploadedImages,
        ocr_results: ocrResults, // Include OCR results
      };

      console.log('Confirming nota kecil with values:', confirmedValues);
      console.log('About to call confirmNotaKecilAPI...');
      
      // Call the confirm API to create the nota kecil record
      const response = await confirmNotaKecilAPI(deliveryOrderId, confirmedValues);
      const notaKecil = response.data;
      
      console.log('Nota kecil created successfully:', notaKecil);

      onNotaKecilCreated(notaKecil);
      setShowReviewModal(false);
      
      // Close the main modal if onClose callback is provided
      if (onClose) {
        onClose();
      }
      
      // Reset form
      setPhotos({
        pressure_bar: null,
        temperature: null,
        stan_awal: null,
        stan_akhir: null,
      });
      setOcrResults({
        pressure_bar: null,
        temperature: null,
        stan_awal: null,
        stan_akhir: null,
      });
      setEditedValues({
        stan_awal: '',
        stan_akhir: '',
        tekanan_operasi: '',
        temperatur_operasi: '',
        customer_name: '',
        customer_address: '',
      });
      setCalculatedValues(null);
      setDriverNotes('');
      setPhotoUrls({
        pressure_bar: null,
        temperature: null,
        stan_awal: null,
        stan_akhir: null,
      });

      Alert.alert('Success', 'Nota Kecil created successfully with Google Drive images!');
    } catch (error) {
      console.error('Error creating nota kecil:', error);
      Alert.alert(
        'Error', 
        `Failed to create nota kecil: ${error.message}\n\nPlease try again.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const PhotoButton: React.FC<{
    photoType: keyof typeof photos;
    label: string;
    icon: string;
  }> = ({ photoType, label, icon }) => {
    const ocrResult = ocrResults[photoType];
    
    // Debug logging for PhotoButton render
    console.log(`PhotoButton render for ${photoType}:`, {
      ocrResult,
      hasResult: !!ocrResult,
      value: ocrResult?.value,
      confidence: ocrResult?.confidence,
      processing: ocrResult?.processing
    });
    
    return (
      <View style={styles.photoSection}>
        <Text style={styles.photoLabel}>{label}</Text>
        
        {photos[photoType] ? (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photos[photoType]!.uri }} style={styles.photoImage} />
            
            {/* OCR Processing Status */}
            {ocrResult?.processing && (
              <View style={styles.ocrProcessingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.ocrProcessingText}>Processing OCR...</Text>
              </View>
            )}
            
            {/* OCR Results */}
            {ocrResult && !ocrResult.processing && (
              <View style={styles.ocrResultsOverlay}>
                <Text style={styles.ocrValueText}>{ocrResult.value}</Text>
                <Text style={styles.ocrConfidenceText}>
                  Confidence: {Math.round(ocrResult.confidence * 100)}%
                </Text>
                <TouchableOpacity
                  style={styles.editOcrButton}
                  onPress={() => openEditModal(photoType)}
                >
                  <FontAwesome5 name="edit" size={12} color="#fff" />
                  <Text style={styles.editOcrButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => removePhoto(photoType)}
              >
                <FontAwesome5 name="trash" size={16} color="#fff" />
                <Text style={styles.buttonText}>Hapus</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => takePhoto(photoType)}
              >
                <FontAwesome5 name="camera" size={16} color="#fff" />
                <Text style={styles.buttonText}>Ganti</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.takePhotoButton}
            onPress={() => takePhoto(photoType)}
          >
            <FontAwesome5 name={icon} size={24} color="#3b82f6" />
            <Text style={styles.takePhotoText}>Ambil Foto {label}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>📋 Create Nota Kecil</Text>
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <FontAwesome5 name="times" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerLabel}>Customer Name:</Text>
          <TextInput
            style={styles.customerInput}
            value={editedValues.customer_name}
            onChangeText={(value) => handleValueChange('customer_name', value)}
            placeholder="Enter customer name"
          />
          
          <Text style={styles.customerLabel}>Customer Address:</Text>
          <TextInput
            style={styles.customerInput}
            value={editedValues.customer_address}
            onChangeText={(value) => handleValueChange('customer_address', value)}
            placeholder="Enter customer address"
            multiline
            numberOfLines={2}
          />
        </View>
      </View>
      
      {/* OCR Mode Toggle */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>OCR Mode:</Text>
        <TouchableOpacity
          style={[styles.toggleButton, useRealOCR ? styles.toggleButtonActive : styles.toggleButtonInactive]}
          onPress={() => setUseRealOCR(!useRealOCR)}
        >
          <Text style={[styles.toggleButtonText, useRealOCR ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive]}>
            {useRealOCR ? 'Real OCR' : 'Simulated'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <PhotoButton
          photoType="pressure_bar"
          label="Pressure Bar"
          icon="tachometer-alt"
        />
        
        <PhotoButton
          photoType="temperature"
          label="Temperature"
          icon="thermometer-half"
        />
        
        <PhotoButton
          photoType="stan_awal"
          label="Stan Awal"
          icon="play"
        />
        
        <PhotoButton
          photoType="stan_akhir"
          label="Stan Akhir"
          icon="stop"
        />

        <TouchableOpacity
          style={styles.processButton}
          onPress={checkIfReadyToConfirm}
        >
          <FontAwesome5 name="check-circle" size={20} color="#fff" />
          <Text style={styles.processButtonText}>Review</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📊 Review OCR Results</Text>
            <TouchableOpacity
              onPress={() => setShowReviewModal(false)}
              style={styles.closeButton}
            >
              <FontAwesome5 name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* OCR Results */}
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>📸 Extracted Values</Text>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Stan Awal (m³):</Text>
                <View style={styles.inputWithOCR}>
                  <TextInput
                    style={styles.input}
                    value={editedValues.stan_awal}
                    onChangeText={(value) => handleValueChange('stan_awal', value)}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                  {ocrResults.stan_awal && (
                    <Text style={styles.ocrConfidenceBadge}>
                      {Math.round(ocrResults.stan_awal.confidence * 100)}%
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Stan Akhir (m³):</Text>
                <View style={styles.inputWithOCR}>
                  <TextInput
                    style={styles.input}
                    value={editedValues.stan_akhir}
                    onChangeText={(value) => handleValueChange('stan_akhir', value)}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                  {ocrResults.stan_akhir && (
                    <Text style={styles.ocrConfidenceBadge}>
                      {Math.round(ocrResults.stan_akhir.confidence * 100)}%
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Tekanan (Bar):</Text>
                <View style={styles.inputWithOCR}>
                  <TextInput
                    style={styles.input}
                    value={editedValues.tekanan_operasi}
                    onChangeText={(value) => handleValueChange('tekanan_operasi', value)}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                  {ocrResults.pressure_bar && (
                    <Text style={styles.ocrConfidenceBadge}>
                      {Math.round(ocrResults.pressure_bar.confidence * 100)}%
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Suhu (°C):</Text>
                <View style={styles.inputWithOCR}>
                  <TextInput
                    style={styles.input}
                    value={editedValues.temperatur_operasi}
                    onChangeText={(value) => handleValueChange('temperatur_operasi', value)}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                  {ocrResults.temperature && (
                    <Text style={styles.ocrConfidenceBadge}>
                      {Math.round(ocrResults.temperature.confidence * 100)}%
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Calculated Values */}
            {calculatedValues && (
              <View style={styles.calculatedSection}>
                <Text style={styles.sectionTitle}>🧮 Calculated Values</Text>
                
                <View style={styles.calculatedRow}>
                  <Text style={styles.calculatedLabel}>Vt (Selisih):</Text>
                  <Text style={styles.calculatedValue}>
                    {calculatedValues.Vt.toFixed(2)} m³
                  </Text>
                </View>

                <View style={styles.calculatedRow}>
                  <Text style={styles.calculatedLabel}>k (Faktor Koreksi):</Text>
                  <Text style={styles.calculatedValue}>
                    {calculatedValues.k.toFixed(6)}
                  </Text>
                </View>

                <View style={styles.calculatedRow}>
                  <Text style={styles.calculatedLabel}>V (Pemakaian):</Text>
                  <Text style={[styles.calculatedValue, styles.finalValue]}>
                    {calculatedValues.V.toFixed(2)} m³
                  </Text>
                </View>
              </View>
            )}

            {/* Driver Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>📝 Driver Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={driverNotes}
                onChangeText={setDriverNotes}
                placeholder="Add any notes about this reading..."
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowReviewModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, isProcessing && styles.confirmButtonDisabled]}
              onPress={confirmNotaKecil}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.confirmButtonText}>Uploading to Google Drive...</Text>
                </>
              ) : (
                <>
                  <FontAwesome5 name="check" size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>Confirm & Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Individual Field Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit {editingField?.label}</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.editModalCloseButton}
              >
                <FontAwesome5 name="times" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.editModalContent}>
              <Text style={styles.editModalLabel}>
                Current Value: {editingField?.value}
              </Text>
              
              <TextInput
                style={styles.editModalInput}
                value={editingField?.value || ''}
                onChangeText={(value) => {
                  setEditingField(prev => prev ? { ...prev, value } : null);
                }}
                keyboardType="numeric"
                placeholder="Enter new value"
                autoFocus={true}
              />

              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={styles.editModalCancelButton}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.editModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.editModalSaveButton}
                  onPress={() => saveEditedValue(editingField?.value || '')}
                >
                  <Text style={styles.editModalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  customerInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  customerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 8,
  },
  customerInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  toggleButtonInactive: {
    backgroundColor: '#e5e7eb',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  toggleButtonTextInactive: {
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  photoSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  photoPreview: {
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  photoActions: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  retakeButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  takePhotoButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  takePhotoText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  processButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  processButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  processButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  resultsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calculatedSection: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  notesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    width: 120,
    textAlign: 'right',
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calculatedLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  calculatedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  finalValue: {
    fontSize: 16,
    color: '#059669',
    fontWeight: 'bold',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },

  // OCR Overlay Styles
  ocrProcessingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  ocrProcessingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  ocrResultsOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 6,
    minWidth: 100,
  },
  ocrValueText: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ocrConfidenceText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  editOcrButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  editOcrButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  inputWithOCR: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ocrConfidenceBadge: {
    backgroundColor: '#10b981',
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 40,
    textAlign: 'center',
  },

  // Individual Edit Modal Styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editModalCloseButton: {
    padding: 4,
  },
  editModalContent: {
    padding: 20,
  },
  editModalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  editModalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9fafb',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  editModalSaveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default NotaKecilUploader;
