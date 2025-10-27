import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getReceiptsForDO, deleteReceipt, getImageUrl } from '../src/services/api';

interface ReceiptListProps {
  deliveryOrderId: string;
  onReceiptSelected?: (receipt: any) => void;
  onClose?: () => void;
}

interface Receipt {
  id: string;
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
  receipt_photo_url: string;
  ocr_confidence_score: number;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

const ReceiptList: React.FC<ReceiptListProps> = ({
  deliveryOrderId,
  onReceiptSelected,
  onClose,
}) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);

  useEffect(() => {
    loadReceipts();
  }, [deliveryOrderId]);

  const loadReceipts = async () => {
    try {
      setIsLoading(true);
      const response = await getReceiptsForDO(deliveryOrderId);
      
      if (response.data && response.data.success) {
        setReceipts(response.data.data || []);
      } else {
        setReceipts([]);
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
      Alert.alert('Error', 'Failed to load receipts');
      setReceipts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiptPress = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
    
    if (onReceiptSelected) {
      onReceiptSelected(receipt);
    }
  };

  const handleDeleteReceipt = (receipt: Receipt) => {
    setReceiptToDelete(receipt);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteReceipt = async () => {
    if (!receiptToDelete) return;

    try {
      await deleteReceipt(receiptToDelete.id);
      
      // Remove from local state
      setReceipts(prev => prev.filter(r => r.id !== receiptToDelete.id));
      
      Alert.alert('Success', 'Receipt deleted successfully');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      Alert.alert('Error', 'Failed to delete receipt');
    } finally {
      setShowDeleteConfirm(false);
      setReceiptToDelete(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return '#10b981'; // green
    if (confidence >= 0.7) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getVerificationStatus = (receipt: Receipt) => {
    if (receipt.is_verified) {
      return {
        text: 'Verified',
        color: '#10b981',
        icon: 'check-circle'
      };
    } else {
      return {
        text: 'Pending',
        color: '#f59e0b',
        icon: 'clock'
      };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const ReceiptCard: React.FC<{ receipt: Receipt }> = ({ receipt }) => {
    const verificationStatus = getVerificationStatus(receipt);
    
    return (
      <TouchableOpacity
        style={styles.receiptCard}
        onPress={() => handleReceiptPress(receipt)}
      >
        <View style={styles.receiptHeader}>
          <View style={styles.receiptInfo}>
            <Text style={styles.stationName}>{receipt.filling_station_name}</Text>
            <Text style={styles.customerName}>{receipt.customer_name}</Text>
          </View>
          <View style={styles.receiptActions}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteReceipt(receipt)}
            >
              <FontAwesome5 name="trash" size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.receiptDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{receipt.filling_date}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {receipt.filling_time_start} - {receipt.filling_time_end}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Volume:</Text>
            <Text style={[styles.detailValue, styles.volumeValue]}>
              {receipt.total_volume} M³
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pressure:</Text>
            <Text style={styles.detailValue}>
              {receipt.initial_pressure} → {receipt.final_pressure} bar
            </Text>
          </View>
        </View>

        <View style={styles.receiptFooter}>
          <Text style={styles.createdAt}>
            {formatDate(receipt.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading receipts...</Text>
      </View>
    );
  }

  if (receipts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome5 name="receipt" size={48} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No Receipts Found</Text>
        <Text style={styles.emptySubtitle}>
          Upload CNG filling receipts to track fuel consumption
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>CNG Receipts</Text>
            <Text style={styles.headerSubtitle}>
              {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} found
            </Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.headerCloseButton}>
              <FontAwesome5 name="times" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.receiptsList}>
        {receipts.map((receipt) => (
          <ReceiptCard key={receipt.id} receipt={receipt} />
        ))}
      </ScrollView>

      {/* Receipt Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Receipt Details</Text>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={styles.closeButton}
            >
              <FontAwesome5 name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedReceipt && (
            <ScrollView style={styles.modalContent}>
              {/* Receipt Photo */}
              {selectedReceipt.receipt_photo_url && (
                <View style={styles.photoSection}>
                  <Text style={styles.sectionTitle}>Receipt Photo</Text>
                  <Image
                    source={{ uri: getImageUrl(selectedReceipt.receipt_photo_url) }}
                    style={styles.receiptPhoto}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Receipt Information */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Receipt Information</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Filling Station:</Text>
                  <Text style={styles.infoValue}>{selectedReceipt.filling_station_name}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Customer:</Text>
                  <Text style={styles.infoValue}>{selectedReceipt.customer_name}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date:</Text>
                  <Text style={styles.infoValue}>{selectedReceipt.filling_date}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Time Range:</Text>
                  <Text style={styles.infoValue}>
                    {selectedReceipt.filling_time_start} - {selectedReceipt.filling_time_end}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Initial Pressure:</Text>
                  <Text style={styles.infoValue}>{selectedReceipt.initial_pressure} bar</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Final Pressure:</Text>
                  <Text style={styles.infoValue}>{selectedReceipt.final_pressure} bar</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total Volume:</Text>
                  <Text style={[styles.infoValue, styles.volumeInfo]}>
                    {selectedReceipt.total_volume} M³
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Customer Signatory:</Text>
                  <Text style={styles.infoValue}>{selectedReceipt.customer_signatory}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Provider Signatory:</Text>
                  <Text style={styles.infoValue}>{selectedReceipt.provider_signatory}</Text>
                </View>
              </View>

              {/* OCR Information */}
              <View style={styles.ocrSection}>
                <Text style={styles.sectionTitle}>OCR Information</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Confidence Score:</Text>
                  <Text style={[
                    styles.infoValue,
                    { color: getConfidenceColor(selectedReceipt.ocr_confidence_score) }
                  ]}>
                    {Math.round(selectedReceipt.ocr_confidence_score * 100)}%
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Verification Status:</Text>
                  <View style={styles.verificationContainer}>
                    <FontAwesome5 
                      name={getVerificationStatus(selectedReceipt).icon} 
                      size={16} 
                      color={getVerificationStatus(selectedReceipt).color} 
                    />
                    <Text style={[
                      styles.infoValue,
                      { color: getVerificationStatus(selectedReceipt).color }
                    ]}>
                      {getVerificationStatus(selectedReceipt).text}
                    </Text>
                  </View>
                </View>
                
                {selectedReceipt.verified_by && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Verified By:</Text>
                    <Text style={styles.infoValue}>{selectedReceipt.verified_by}</Text>
                  </View>
                )}
                
                {selectedReceipt.verified_at && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Verified At:</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(selectedReceipt.verified_at)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Timestamps */}
              <View style={styles.timestampSection}>
                <Text style={styles.sectionTitle}>Timestamps</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Created:</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(selectedReceipt.created_at)}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Updated:</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(selectedReceipt.updated_at)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Text style={styles.deleteModalTitle}>Delete Receipt</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this receipt? This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmDeleteReceipt}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
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
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCloseButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  receiptsList: {
    flex: 1,
    padding: 16,
  },
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  receiptInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  receiptDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  volumeValue: {
    fontWeight: 'bold',
    color: '#059669',
  },
  receiptFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'flex-end',
  },
  createdAt: {
    fontSize: 12,
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
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
  photoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  receiptPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ocrSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timestampSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  volumeInfo: {
    fontWeight: 'bold',
    color: '#059669',
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ReceiptList;
