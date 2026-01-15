// mobile/app/gas-transaction-history.tsx
// Gas Transaction History Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { getGasTransactionsByDriver, getGasTransactionsByDepositGroup } from '../src/services/api';

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
    ocr_extracted_values?: {
      volume_liters?: number;
      rate_per_liter?: number;
      total_cost?: number;
    };
  };
}

const GasTransactionHistory = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ depositGroupId?: string }>();
  const depositGroupId = params.depositGroupId;
  const [transactions, setTransactions] = useState<GasTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      // If depositGroupId is provided, filter by it (same as admin web)
      // Otherwise, show all transactions for the driver
      const response = depositGroupId 
        ? await getGasTransactionsByDepositGroup(depositGroupId)
        : await getGasTransactionsByDriver();
      if (response && response.data && response.data.success) {
        const data = Array.isArray(response.data.data) ? response.data.data : [];
        setTransactions(data);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('Error fetching gas transactions:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load gas transaction history';
      setError(errorMessage);
      setTransactions([]);
      // Don't show alert for 503 errors - just set error state
      if (error.response?.status !== 503) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [depositGroupId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return '-';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '-';
    }
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
        return 'Menunggu';
      default:
        return status;
    }
  };

  const renderTransactionItem = (transaction: GasTransaction) => {
    if (!transaction || !transaction.id) {
      return null;
    }
    
    return (
      <TouchableOpacity
        key={transaction.id}
        style={styles.transactionCard}
        onPress={() => {
          try {
            if (router && transaction && transaction.id) {
              router.push({
                pathname: '/gas-transaction-detail/[id]',
                params: { id: transaction.id.toString() },
              });
            } else {
              Alert.alert('Error', 'Data transaksi tidak valid');
            }
          } catch (error: any) {
            console.error('Error navigating to transaction detail:', error);
            Alert.alert('Error', error?.message || 'Gagal membuka detail transaksi');
          }
        }}
      >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDate}>
            {transaction.created_at ? formatDate(transaction.created_at) : '-'}
          </Text>
          {transaction.depositGroup?.spbg_name && (
            <Text style={styles.spbgName}>{transaction.depositGroup.spbg_name}</Text>
          )}
          {transaction.vehicle?.license_plate && (
            <Text style={styles.vehiclePlate}>{transaction.vehicle.license_plate}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status || 'pending') + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(transaction.status || 'pending') }]}>
            {getStatusLabel(transaction.status || 'pending')}
          </Text>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Volume:</Text>
          <Text style={styles.detailValue}>
            {(() => {
              // Prefer OCR value when available, otherwise use main field
              const rawVolume =
                transaction.nota_ocr_data?.ocr_extracted_values?.volume_liters ??
                transaction.volume_m3;
              const volume =
                rawVolume != null ? parseFloat(String(rawVolume)) : 0;
              return !isNaN(volume) ? volume.toFixed(3) : '0.000';
            })()} L
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rate:</Text>
          <Text style={styles.detailValue}>
            Rp {(() => {
              // Prefer OCR value when available, otherwise use main field
              const rawRate =
                transaction.nota_ocr_data?.ocr_extracted_values?.rate_per_liter ??
                transaction.rate_per_m3;
              const rate =
                rawRate != null ? parseFloat(String(rawRate)) : 0;
              return !isNaN(rate) ? rate.toLocaleString('id-ID') : '0';
            })()}/L
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total:</Text>
          <Text style={styles.totalValue}>
            Rp {(() => {
              // Prefer OCR value when available, otherwise use main field
              const rawTotal =
                transaction.nota_ocr_data?.ocr_extracted_values?.total_cost ??
                transaction.total_cost;
              const total =
                rawTotal != null ? parseFloat(String(rawTotal)) : 0;
              return !isNaN(total) ? total.toLocaleString('id-ID') : '0';
            })()}
          </Text>
        </View>
      </View>

      {transaction.nota_ocr_data?.ocr_used && (
        <View style={styles.ocrBadge}>
          <FontAwesome5 name="eye" size={12} color="#007AFF" />
          <Text style={styles.ocrText}>OCR Used</Text>
        </View>
      )}
      </TouchableOpacity>
    );
  };


  if (loading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Memuat riwayat pengisian gas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            try {
              if (router) {
                router.back();
              }
            } catch (error) {
              console.error('Error navigating back:', error);
            }
          }} 
          style={styles.backButton}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Pengisian Gas</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <View style={styles.errorBanner}>
            <FontAwesome5 name="exclamation-triangle" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {transactions.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="gas-pump" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>Belum ada riwayat pengisian gas</Text>
            <Text style={styles.emptySubtext}>Riwayat pengisian gas akan muncul di sini</Text>
          </View>
        ) : transactions.length > 0 ? (
          <React.Fragment>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Transaksi</Text>
              <Text style={styles.summaryValue}>{transactions.length}</Text>
            </View>
            {transactions.filter(t => t && t.id).map(renderTransactionItem)}
          </React.Fragment>
        ) : null}
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  transactionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  spbgName: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  vehiclePlate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ocrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  ocrText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#007AFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#C62828',
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F5F5',
  },
  backButtonText: {
    marginTop: 16,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default GasTransactionHistory;

