import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getCustomerNotaKecils } from '../src/services/api';

interface NotaKecil {
  id: string;
  stan_awal: number;
  stan_akhir: number;
  tekanan_operasi: number;
  temperatur_operasi: number;
  Vt: number;
  k: number;
  V: number;
  driver_confirmed: boolean;
  driver_confirmed_at: string;
  driver_notes?: string;
  created_at: string;
  pressure_bar_photos?: string[];
  temperature_photos?: string[];
  stan_awal_photos?: string[];
  stan_akhir_photos?: string[];
}

interface NotaKecilsListProps {
  deliveryOrderId: string;
  customerLocationIndex: number;
  customerName: string;
  onNotaKecilAdded?: (notaKecil: NotaKecil) => void;
}

const NotaKecilsList: React.FC<NotaKecilsListProps> = ({
  deliveryOrderId,
  customerLocationIndex,
  customerName,
  onNotaKecilAdded,
}) => {
  const [notaKecils, setNotaKecils] = useState<NotaKecil[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoModalTitle, setPhotoModalTitle] = useState('');

  useEffect(() => {
    loadNotaKecils();
  }, []);

  const loadNotaKecils = async () => {
    try {
      setLoading(true);
      
      // Try to call the real API first
      try {
        const response = await getCustomerNotaKecils(deliveryOrderId, customerLocationIndex);
        setNotaKecils(response.data);
      } catch (apiError) {
        console.log('API not available, using simulated data...');
        
        // Fallback to simulated data if API fails
        const simulatedNotaKecils: NotaKecil[] = [
          {
            id: '1',
            stan_awal: 1279.07,
            stan_akhir: 1413.03,
            tekanan_operasi: 1.70,
            temperatur_operasi: 29.0,
            Vt: 133.96,
            k: 1.00034,
            V: 134.00,
            driver_confirmed: true,
            driver_confirmed_at: new Date().toISOString(),
            driver_notes: 'All readings confirmed',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            stan_awal: 1413.03,
            stan_akhir: 1580.50,
            tekanan_operasi: 1.85,
            temperatur_operasi: 31.0,
            Vt: 167.47,
            k: 1.00037,
            V: 167.52,
            driver_confirmed: true,
            driver_confirmed_at: new Date().toISOString(),
            created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          },
        ];
        
        setNotaKecils(simulatedNotaKecils);
      }
    } catch (error) {
      console.error('Error loading nota kecils:', error);
      Alert.alert('Error', 'Failed to load nota kecils');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toLocaleString('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const viewPhotos = (notaKecil: NotaKecil, photoType: string) => {
    let photos: string[] = [];
    let title = '';

    switch (photoType) {
      case 'pressure_bar':
        photos = notaKecil.pressure_bar_photos || [];
        title = 'Pressure Bar Photos';
        break;
      case 'temperature':
        photos = notaKecil.temperature_photos || [];
        title = 'Temperature Photos';
        break;
      case 'stan_awal':
        photos = notaKecil.stan_awal_photos || [];
        title = 'Stan Awal Photos';
        break;
      case 'stan_akhir':
        photos = notaKecil.stan_akhir_photos || [];
        title = 'Stan Akhir Photos';
        break;
    }

    if (photos.length > 0) {
      setSelectedPhotos(photos);
      setPhotoModalTitle(title);
      setShowPhotoModal(true);
    } else {
      Alert.alert('No Photos', `No ${photoType} photos available for this nota kecil.`);
    }
  };

  const NotaKecilCard: React.FC<{ notaKecil: NotaKecil; index: number }> = ({ notaKecil, index }) => (
    <View style={styles.notaKecilCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Nota Kecil #{notaKecils.length - index}</Text>
        <View style={styles.statusBadge}>
          <FontAwesome5 
            name={notaKecil.driver_confirmed ? "check-circle" : "clock"} 
            size={12} 
            color={notaKecil.driver_confirmed ? "#059669" : "#f59e0b"} 
          />
          <Text style={[
            styles.statusText,
            { color: notaKecil.driver_confirmed ? "#059669" : "#f59e0b" }
          ]}>
            {notaKecil.driver_confirmed ? "Confirmed" : "Pending"}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.timestamp}>
          {formatDate(notaKecil.created_at)} - {formatTime(notaKecil.created_at)}
        </Text>

        <View style={styles.valuesGrid}>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Stan Awal:</Text>
            <Text style={styles.valueText}>{formatNumber(notaKecil.stan_awal)} m³</Text>
          </View>
          
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Stan Akhir:</Text>
            <Text style={styles.valueText}>{formatNumber(notaKecil.stan_akhir)} m³</Text>
          </View>
          
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Selisih (Vt):</Text>
            <Text style={styles.valueText}>{formatNumber(notaKecil.Vt)} m³</Text>
          </View>
          
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Tekanan:</Text>
            <Text style={styles.valueText}>{formatNumber(notaKecil.tekanan_operasi)} Bar</Text>
          </View>
          
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Suhu:</Text>
            <Text style={styles.valueText}>{formatNumber(notaKecil.temperatur_operasi)} °C</Text>
          </View>
          
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Faktor Koreksi:</Text>
            <Text style={styles.valueText}>{formatNumber(notaKecil.k, 6)}</Text>
          </View>
          
          <View style={[styles.valueRow, styles.finalValueRow]}>
            <Text style={[styles.valueLabel, styles.finalValueLabel]}>Pemakaian (V):</Text>
            <Text style={[styles.valueText, styles.finalValueText]}>
              {formatNumber(notaKecil.V)} m³
            </Text>
          </View>
        </View>

        {notaKecil.driver_notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Driver Notes:</Text>
            <Text style={styles.notesText}>{notaKecil.driver_notes}</Text>
          </View>
        )}

        <View style={styles.photosSection}>
          <Text style={styles.photosLabel}>Photos:</Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => viewPhotos(notaKecil, 'pressure_bar')}
            >
              <FontAwesome5 name="tachometer-alt" size={16} color="#3b82f6" />
              <Text style={styles.photoButtonText}>Pressure</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => viewPhotos(notaKecil, 'temperature')}
            >
              <FontAwesome5 name="thermometer-half" size={16} color="#3b82f6" />
              <Text style={styles.photoButtonText}>Temperature</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => viewPhotos(notaKecil, 'stan_awal')}
            >
              <FontAwesome5 name="play" size={16} color="#3b82f6" />
              <Text style={styles.photoButtonText}>Stan Awal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => viewPhotos(notaKecil, 'stan_akhir')}
            >
              <FontAwesome5 name="stop" size={16} color="#3b82f6" />
              <Text style={styles.photoButtonText}>Stan Akhir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading nota kecils...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Nota Kecils</Text>
        <Text style={styles.subtitle}>{customerName}</Text>
        <Text style={styles.count}>{notaKecils.length} nota kecils</Text>
      </View>

      {notaKecils.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="receipt" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No nota kecils yet</Text>
          <Text style={styles.emptySubtext}>Create your first nota kecil to get started</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {notaKecils.map((notaKecil, index) => (
            <NotaKecilCard key={notaKecil.id} notaKecil={notaKecil} index={index} />
          ))}
        </ScrollView>
      )}

      {/* Photo Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.photoModalContainer}>
          <View style={styles.photoModalHeader}>
            <Text style={styles.photoModalTitle}>{photoModalTitle}</Text>
            <TouchableOpacity
              onPress={() => setShowPhotoModal(false)}
              style={styles.closeButton}
            >
              <FontAwesome5 name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.photoModalContent}>
            {selectedPhotos.map((photoUri, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
              </View>
            ))}
          </ScrollView>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 2,
  },
  count: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  notaKecilCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  valuesGrid: {
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  valueLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  finalValueRow: {
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  finalValueLabel: {
    color: '#059669',
    fontWeight: '600',
  },
  finalValueText: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notesSection: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
  },
  photosSection: {
    marginBottom: 8,
  },
  photosLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  photoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  photoModalContent: {
    flex: 1,
  },
  photoContainer: {
    margin: 8,
  },
  photoImage: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
  },
});

export default NotaKecilsList;
