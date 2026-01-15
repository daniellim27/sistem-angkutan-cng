// mobile/app/gas-transaction-detail/[id].tsx
// Gas Transaction Detail Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { getGasTransactionsByDriver } from '../../src/services/api';
import { getImageUrl } from '../../src/services/api';
import apiClient from '../../src/services/api';

const { width } = Dimensions.get('window');

interface GasTransaction {
  id: number;
  volume_m3: number | string; // Actually stores liters (may come as string)
  rate_per_m3: number | string; // Actually stores rate_per_liter (may come as string)
  total_cost: number | string;
  status: 'pending' | 'approved' | 'rejected';
  surat_jalan_photo_url?: string;
  nota_photo_url?: string;
  biaya_lain_photo_url?: string;
  biaya_lain_amount?: number;
  biaya_lain_description?: string;
  created_at: string;
  vehicle?: {
    license_plate: string;
    type: string;
  };
  depositGroup?: {
    spbg_name: string;
    spbg_location: string;
  };
  nota_ocr_data?: {
    ocr_used: boolean;
    ocr_confidence?: number;
    ocr_extracted_fields?: {
      volume_liters?: boolean;
      rate_per_liter?: boolean;
      total_cost?: boolean;
    };
    ocr_extracted_values?: {
      volume_liters?: number;
      rate_per_liter?: number;
      total_cost?: number;
    };
  };
}

const GasTransactionDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [transaction, setTransaction] = useState<GasTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      // Try to get all transactions and find the one with matching ID
      const response = await getGasTransactionsByDriver();
      if (response.data && response.data.success) {
        const transactions = Array.isArray(response.data.data) ? response.data.data : [];
        const found = transactions.find((t: GasTransaction) => t.id.toString() === id);
        if (found) {
          setTransaction(found);
        } else {
          // If not found in list, try fetching directly (if endpoint exists)
          try {
            const singleResponse = await apiClient.get(`/gas-transactions/${id}`);
            if (singleResponse.data && singleResponse.data.success) {
              setTransaction(singleResponse.data.data);
            } else {
              Alert.alert('Error', 'Transaksi tidak ditemukan');
              router.back();
            }
          } catch (singleError) {
            Alert.alert('Error', 'Transaksi tidak ditemukan');
            router.back();
          }
        }
      } else {
        Alert.alert('Error', 'Gagal memuat data transaksi');
        router.back();
      }
    } catch (error: any) {
      console.error('Error fetching gas transaction:', error);
      // Don't show alert for 503 errors - just show loading state
      if (error.response?.status !== 503) {
        Alert.alert('Error', error.response?.data?.message || 'Gagal memuat data transaksi');
      }
      // Don't navigate back on 503 - let user retry
      if (error.response?.status !== 503) {
        router.back();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTransaction();
    }
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransaction();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'pending':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Disetujui';
      case 'rejected':
        return 'Ditolak';
      case 'pending':
        return 'Menunggu Persetujuan';
      default:
        return status;
    }
  };

  if (loading && !transaction) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Memuat detail transaksi...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome5 name="exclamation-triangle" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Transaksi tidak ditemukan</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Transaksi</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Badge */}
        <View style={[styles.statusCard, { borderLeftColor: getStatusColor(transaction.status) }]}>
          <View style={styles.statusHeader}>
            <FontAwesome5 
              name={transaction.status === 'approved' ? 'check-circle' : transaction.status === 'rejected' ? 'times-circle' : 'clock'} 
              size={24} 
              color={getStatusColor(transaction.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
              {getStatusLabel(transaction.status)}
            </Text>
          </View>
          <Text style={styles.statusSubtext}>
            {formatDate(transaction.created_at)}
          </Text>
        </View>

        {/* Transaction Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informasi Transaksi</Text>
          
          {transaction.depositGroup && (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <FontAwesome5 name="gas-pump" size={16} color="#007AFF" />
                  <Text style={styles.infoLabel}>SPBG</Text>
                </View>
                <Text style={styles.infoValue}>{transaction.depositGroup.spbg_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <FontAwesome5 name="map-marker-alt" size={16} color="#007AFF" />
                  <Text style={styles.infoLabel}>Lokasi</Text>
                </View>
                <Text style={styles.infoValue}>{transaction.depositGroup.spbg_location}</Text>
              </View>
            </>
          )}
          
          {transaction.vehicle && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <FontAwesome5 name="truck" size={16} color="#007AFF" />
                <Text style={styles.infoLabel}>Kendaraan</Text>
              </View>
              <Text style={styles.infoValue}>{transaction.vehicle.license_plate}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <FontAwesome5 name="calendar" size={16} color="#007AFF" />
              <Text style={styles.infoLabel}>Tanggal</Text>
            </View>
            <Text style={styles.infoValue}>{formatDate(transaction.created_at)}</Text>
          </View>
        </View>

        {/* Filling Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detail Pengisian</Text>
          
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Volume</Text>
              <Text style={styles.detailValue}>
                {(() => {
                  // Use OCR extracted value if available, otherwise use main field
                  const rawVolume =
                    transaction.nota_ocr_data?.ocr_extracted_values?.volume_liters ??
                    transaction.volume_m3;
                  const volume =
                    rawVolume != null ? parseFloat(String(rawVolume)) : 0;
                  return !isNaN(volume) ? volume.toFixed(3) : '0.000';
                })()} L
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Rate per Liter</Text>
              <Text style={styles.detailValue}>
                Rp {(() => {
                  // Use OCR extracted value if available, otherwise use main field
                  const rawRate =
                    transaction.nota_ocr_data?.ocr_extracted_values?.rate_per_liter ??
                    transaction.rate_per_m3;
                  const rate =
                    rawRate != null ? parseFloat(String(rawRate)) : 0;
                  return !isNaN(rate) ? rate.toLocaleString('id-ID') : '0';
                })()}
              </Text>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Biaya</Text>
            <Text style={styles.totalAmount}>
              Rp {(() => {
                // Use OCR extracted value if available, otherwise use main field
                const rawTotal =
                  transaction.nota_ocr_data?.ocr_extracted_values?.total_cost ??
                  transaction.total_cost;
                const total =
                  rawTotal != null ? parseFloat(String(rawTotal)) : 0;
                return !isNaN(total) ? total.toLocaleString('id-ID') : '0';
              })()}
            </Text>
          </View>

          {transaction.nota_ocr_data?.ocr_used && (
            <View style={styles.ocrBadge}>
              <FontAwesome5 name="eye" size={16} color="#34C759" />
              <View style={styles.ocrInfo}>
                <Text style={styles.ocrTitle}>Data diambil menggunakan OCR</Text>
                {transaction.nota_ocr_data.ocr_confidence && (
                  <Text style={styles.ocrSubtext}>
                    Confidence: {Math.round(transaction.nota_ocr_data.ocr_confidence * 100)}%
                  </Text>
                )}
                {transaction.nota_ocr_data.ocr_extracted_fields && (
                  <Text style={styles.ocrSubtext}>
                    Volume: {transaction.nota_ocr_data.ocr_extracted_fields.volume_liters ? '✓' : '✗'} | 
                    Rate: {transaction.nota_ocr_data.ocr_extracted_fields.rate_per_liter ? '✓' : '✗'} | 
                    Total: {transaction.nota_ocr_data.ocr_extracted_fields.total_cost ? '✓' : '✗'}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Additional Expenses */}
        {transaction.biaya_lain_amount && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Biaya Lain</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jumlah</Text>
              <Text style={styles.infoValue}>
                Rp {transaction.biaya_lain_amount != null && typeof transaction.biaya_lain_amount === 'number'
                  ? transaction.biaya_lain_amount.toLocaleString('id-ID')
                  : '0'}
              </Text>
            </View>
            {transaction.biaya_lain_description && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Deskripsi</Text>
                <Text style={styles.infoValue}>{transaction.biaya_lain_description}</Text>
              </View>
            )}
          </View>
        )}

        {/* Photos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Foto Dokumentasi</Text>
          
          {transaction.surat_jalan_photo_url && (
            <TouchableOpacity 
              style={styles.photoItem}
              onPress={() => setSelectedImage(transaction.surat_jalan_photo_url || null)}
            >
              <Image
                source={{ uri: getImageUrl(transaction.surat_jalan_photo_url) || '' }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
              <View style={styles.photoInfo}>
                <FontAwesome5 name="file-invoice" size={20} color="#007AFF" />
                <Text style={styles.photoLabel}>Surat Jalan</Text>
              </View>
            </TouchableOpacity>
          )}

          {transaction.nota_photo_url && (
            <TouchableOpacity 
              style={styles.photoItem}
              onPress={() => setSelectedImage(transaction.nota_photo_url || null)}
            >
              <Image
                source={{ uri: getImageUrl(transaction.nota_photo_url) || '' }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
              <View style={styles.photoInfo}>
                <FontAwesome5 name="receipt" size={20} color="#007AFF" />
                <Text style={styles.photoLabel}>Nota</Text>
                {transaction.nota_ocr_data?.ocr_used && (
                  <View style={styles.ocrTag}>
                    <FontAwesome5 name="eye" size={10} color="#34C759" />
                    <Text style={styles.ocrTagText}>OCR</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}

          {transaction.biaya_lain_photo_url && (
            <TouchableOpacity 
              style={styles.photoItem}
              onPress={() => setSelectedImage(transaction.biaya_lain_photo_url || null)}
            >
              <Image
                source={{ uri: getImageUrl(transaction.biaya_lain_photo_url) || '' }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
              <View style={styles.photoInfo}>
                <FontAwesome5 name="file-alt" size={20} color="#007AFF" />
                <Text style={styles.photoLabel}>Biaya Lain</Text>
              </View>
            </TouchableOpacity>
          )}

          {!transaction.surat_jalan_photo_url && !transaction.nota_photo_url && !transaction.biaya_lain_photo_url && (
            <Text style={styles.emptyText}>Tidak ada foto tersedia</Text>
          )}
        </View>
      </ScrollView>

      {/* Image Modal */}
      {selectedImage && (
        <View style={styles.imageModal}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setSelectedImage(null)}
          >
            <FontAwesome5 name="times" size={24} color="#FFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: getImageUrl(selectedImage) || '' }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  backButtonText: {
    marginTop: 16,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    marginLeft: 36,
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'right',
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  totalContainer: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  ocrBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  ocrInfo: {
    marginLeft: 12,
    flex: 1,
  },
  ocrTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  ocrSubtext: {
    fontSize: 12,
    color: '#4CAF50',
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 12,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  photoInfo: {
    marginLeft: 12,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  ocrTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#C8E6C9',
    borderRadius: 4,
  },
  ocrTagText: {
    fontSize: 10,
    color: '#2E7D32',
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  imageModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  fullImage: {
    width: width,
    height: '80%',
  },
});

export default GasTransactionDetailScreen;

