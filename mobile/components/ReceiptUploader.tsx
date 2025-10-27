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
import { processReceiptOCR, confirmReceipt } from '../src/services/api';

interface ReceiptUploaderProps {
  deliveryOrderId: string;
  onReceiptCreated: (receipt: any) => void;
  onClose?: () => void;
}

interface ReceiptData {
  id?: string;
  filling_station_name: string;
  customer_name: string;
  filling_date: string;
  filling_time_start: string;
  filling_time_end: string;
  initial_pressure: number;
  final_pressure: number;
  total_volume: number;
  customer_signatory: string;
  provider_signatory: string;
  confidence_scores: {
    filling_station_name: number;
    customer_name: number;
    filling_date: number;
    filling_time_start: number;
    filling_time_end: number;
    initial_pressure: number;
    final_pressure: number;
    total_volume: number;
  };
}

interface PhotoState {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  deliveryOrderId,
  onReceiptCreated,
  onClose,
}) => {
  const [receiptPhoto, setReceiptPhoto] = useState<PhotoState | null>(null);
  const [ocrResults, setOcrResults] = useState<ReceiptData | null>(null);
  const [editedValues, setEditedValues] = useState<Partial<ReceiptData>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<{
    field: keyof ReceiptData;
    label: string;
    value: string;
  } | null>(null);
  const [driverNotes, setDriverNotes] = useState('');
  const [useRealOCR, setUseRealOCR] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setReceiptPhoto({
          uri: asset.uri,
          fileName: asset.fileName || `receipt_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });

        // Automatically process OCR for this photo
        await processReceiptOCRData({
          uri: asset.uri,
          fileName: asset.fileName || `receipt_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const processReceiptOCRData = async (photo: PhotoState) => {
    try {
      setIsProcessing(true);

      if (useRealOCR) {
        console.log('Processing receipt OCR...');
        
        const response = await processReceiptOCR(deliveryOrderId, photo);
        
        console.log('Receipt OCR API Response:', response);
        
        if (response.data && response.data.success) {
          const extractedData = response.data.data;
          
          setOcrResults(extractedData);
          setEditedValues(extractedData);
          
          if (extractedData.receipt_photo_url) {
            setPhotoUrl(extractedData.receipt_photo_url);
          }

          // Automatically open review modal after successful OCR
          setShowReviewModal(true);

          Alert.alert(
            'OCR Complete',
            `Receipt data extracted successfully!\nConfidence: ${Math.round((extractedData.ocr_confidence_score || 0) * 100)}%\n\nPlease review the extracted data.`
          );
        } else {
          throw new Error('Invalid API response: no data received');
        }
      } else {
        // Use simulated data when real OCR is disabled
        console.log('Using simulated receipt OCR data...');
        
        const simulatedData: ReceiptData = {
          filling_station_name: 'SPBG Rawu',
          customer_name: 'PT Qurpol',
          filling_date: '2025-09-23',
          filling_time_start: '19:01',
          filling_time_end: '19:42',
          initial_pressure: 105,
          final_pressure: 200,
          total_volume: 93.423,
          customer_signatory: 'UJAJANG',
          provider_signatory: 'Angyu',
          confidence_scores: {
            filling_station_name: 0.95,
            customer_name: 0.92,
            filling_date: 0.88,
            filling_time_start: 0.90,
            filling_time_end: 0.90,
            initial_pressure: 0.93,
            final_pressure: 0.94,
            total_volume: 0.91,
          },
        };

        setOcrResults(simulatedData);
        setEditedValues(simulatedData);
        setPhotoUrl(`/uploads/receipts/simulated_receipt_${Date.now()}.jpg`);

        // Automatically open review modal after successful OCR
        setShowReviewModal(true);

        Alert.alert(
          'OCR Complete (Simulated)',
          `Receipt data extracted successfully!\nStation: ${simulatedData.filling_station_name}\nVolume: ${simulatedData.total_volume} M³\n\nNote: Using simulated data\n\nPlease review the extracted data.`
        );
      }
    } catch (error: any) {
      console.error('Receipt OCR processing error:', error);
      
      Alert.alert(
        'OCR Processing Failed',
        `Failed to process receipt photo.\n\nError: ${error.message || 'Unknown error'}\n\nPlease try taking the photo again.`,
        [
          { text: 'Retake Photo', onPress: () => removePhoto() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (field: keyof ReceiptData, label: string) => {
    const currentValue = editedValues[field] || ocrResults?.[field] || '';
    setEditingField({
      field,
      label,
      value: String(currentValue)
    });
    setShowEditModal(true);
  };

  const saveEditedValue = (newValue: string) => {
    if (editingField) {
      setEditedValues(prev => ({
        ...prev,
        [editingField.field]: newValue
      }));
      setShowEditModal(false);
      setEditingField(null);
    }
  };

  const removePhoto = () => {
    setReceiptPhoto(null);
    setOcrResults(null);
    setEditedValues({});
    setPhotoUrl(null);
  };

  const checkIfReadyToConfirm = () => {
    if (!receiptPhoto || !ocrResults) {
      Alert.alert(
        'Not Ready',
        'Please take a receipt photo and wait for OCR processing to complete.'
      );
      return;
    }

    setShowReviewModal(true);
  };

  const confirmReceiptData = async () => {
    if (!ocrResults) {
      Alert.alert('Error', 'Please review and confirm the extracted data');
      return;
    }

    try {
      setIsProcessing(true);
      
      const confirmedValues = {
        ...editedValues,
        driver_notes: driverNotes,
        receipt_photo_url: photoUrl,
      };

      console.log('Confirming receipt with values:', confirmedValues);
      
      const response = await confirmReceipt(deliveryOrderId, confirmedValues);
      const receipt = response.data;
      
      console.log('Receipt created successfully:', receipt);

      onReceiptCreated(receipt);
      setShowReviewModal(false);
      
      if (onClose) {
        onClose();
      }
      
      // Reset form
      setReceiptPhoto(null);
      setOcrResults(null);
      setEditedValues({});
      setDriverNotes('');
      setPhotoUrl(null);

      Alert.alert('Success', 'Receipt data saved successfully!');
    } catch (error: any) {
      console.error('Error creating receipt:', error);
      Alert.alert(
        'Error', 
        `Failed to save receipt data: ${error.message || 'Unknown error'}\n\nPlease try again.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#10b981'; // green
    if (confidence >= 0.7) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>🧾 Upload CNG Receipt</Text>
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <FontAwesome5 name="times" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Delivery Order: #{deliveryOrderId}</Text>
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
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.photoLabel}>CNG Filling Receipt</Text>
          
          {receiptPhoto ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: receiptPhoto.uri }} style={styles.photoImage} />
              
              {/* OCR Processing Status */}
              {isProcessing && (
                <View style={styles.ocrProcessingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.ocrProcessingText}>Processing OCR...</Text>
                </View>
              )}
              
              {/* OCR Results Summary */}
              {ocrResults && !isProcessing && (
                <View style={styles.ocrResultsOverlay}>
                  <Text style={styles.ocrValueText}>
                    {ocrResults.filling_station_name}
                  </Text>
                  <Text style={styles.ocrConfidenceText}>
                    Volume: {ocrResults.total_volume} M³
                  </Text>
                </View>
              )}
              
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => removePhoto()}
                >
                  <FontAwesome5 name="trash" size={16} color="#fff" />
                  <Text style={styles.buttonText}>Hapus</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => takePhoto()}
                >
                  <FontAwesome5 name="camera" size={16} color="#fff" />
                  <Text style={styles.buttonText}>Ganti</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.takePhotoButton}
              onPress={() => takePhoto()}
            >
              <FontAwesome5 name="camera" size={24} color="#3b82f6" />
              <Text style={styles.takePhotoText}>Take Receipt Photo</Text>
              <Text style={styles.takePhotoSubtext}>
                Capture CNG filling receipt for OCR processing
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.processButton, (!receiptPhoto || !ocrResults) && styles.processButtonDisabled]}
          onPress={checkIfReadyToConfirm}
          disabled={!receiptPhoto || !ocrResults}
        >
          <FontAwesome5 name="check-circle" size={20} color="#fff" />
          <Text style={styles.processButtonText}>Review Receipt Data</Text>
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
            <Text style={styles.modalTitle}>📊 Review Receipt Data</Text>
            <TouchableOpacity
              onPress={() => setShowReviewModal(false)}
              style={styles.closeButton}
            >
              <FontAwesome5 name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Receipt Data */}
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>📸 Extracted Receipt Data</Text>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Filling Station:</Text>
                <TouchableOpacity
                  style={styles.editableField}
                  onPress={() => openEditModal('filling_station_name', 'Filling Station')}
                >
                  <Text style={styles.fieldValue}>
                    {editedValues.filling_station_name || ocrResults?.filling_station_name || ''}
                  </Text>
                  <FontAwesome5 name="edit" size={12} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Customer:</Text>
                <TouchableOpacity
                  style={styles.editableField}
                  onPress={() => openEditModal('customer_name', 'Customer Name')}
                >
                  <Text style={styles.fieldValue}>
                    {editedValues.customer_name || ocrResults?.customer_name || ''}
                  </Text>
                  <FontAwesome5 name="edit" size={12} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Filling Date:</Text>
                <TouchableOpacity
                  style={styles.editableField}
                  onPress={() => openEditModal('filling_date', 'Filling Date')}
                >
                  <Text style={styles.fieldValue}>
                    {editedValues.filling_date || ocrResults?.filling_date || ''}
                  </Text>
                  <FontAwesome5 name="edit" size={12} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Time Range:</Text>
                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={styles.editableField}
                    onPress={() => openEditModal('filling_time_start', 'Start Time')}
                  >
                    <Text style={styles.fieldValue}>
                      {editedValues.filling_time_start || ocrResults?.filling_time_start || ''}
                    </Text>
                    <FontAwesome5 name="edit" size={12} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.timeSeparator}>-</Text>
                  <TouchableOpacity
                    style={styles.editableField}
                    onPress={() => openEditModal('filling_time_end', 'End Time')}
                  >
                    <Text style={styles.fieldValue}>
                      {editedValues.filling_time_end || ocrResults?.filling_time_end || ''}
                    </Text>
                    <FontAwesome5 name="edit" size={12} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Pressures (Bar):</Text>
                <View style={styles.pressureRow}>
                  <TouchableOpacity
                    style={styles.editableField}
                    onPress={() => openEditModal('initial_pressure', 'Initial Pressure')}
                  >
                    <Text style={styles.fieldValue}>
                      {editedValues.initial_pressure || ocrResults?.initial_pressure || ''}
                    </Text>
                    <FontAwesome5 name="edit" size={12} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.pressureSeparator}>→</Text>
                  <TouchableOpacity
                    style={styles.editableField}
                    onPress={() => openEditModal('final_pressure', 'Final Pressure')}
                  >
                    <Text style={styles.fieldValue}>
                      {editedValues.final_pressure || ocrResults?.final_pressure || ''}
                    </Text>
                    <FontAwesome5 name="edit" size={12} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Total Volume (M³):</Text>
                <TouchableOpacity
                  style={styles.editableField}
                  onPress={() => openEditModal('total_volume', 'Total Volume')}
                >
                  <Text style={[styles.fieldValue, styles.volumeValue]}>
                    {editedValues.total_volume || ocrResults?.total_volume || ''}
                  </Text>
                  <FontAwesome5 name="edit" size={12} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Signatories:</Text>
                <View style={styles.signatoryRow}>
                  <TouchableOpacity
                    style={styles.editableField}
                    onPress={() => openEditModal('customer_signatory', 'Customer Signatory')}
                  >
                    <Text style={styles.fieldValue}>
                      {editedValues.customer_signatory || ocrResults?.customer_signatory || ''}
                    </Text>
                    <FontAwesome5 name="edit" size={12} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.signatorySeparator}>/</Text>
                  <TouchableOpacity
                    style={styles.editableField}
                    onPress={() => openEditModal('provider_signatory', 'Provider Signatory')}
                  >
                    <Text style={styles.fieldValue}>
                      {editedValues.provider_signatory || ocrResults?.provider_signatory || ''}
                    </Text>
                    <FontAwesome5 name="edit" size={12} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Driver Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>📝 Driver Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={driverNotes}
                onChangeText={setDriverNotes}
                placeholder="Add any notes about this receipt..."
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
              onPress={confirmReceiptData}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.confirmButtonText}>Saving...</Text>
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
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
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
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  takePhotoSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
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
  editableField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
  },
  fieldValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  volumeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeSeparator: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  pressureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressureSeparator: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  signatoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signatorySeparator: {
    fontSize: 14,
    color: '#666',
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
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ocrConfidenceText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
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

export default ReceiptUploader;
