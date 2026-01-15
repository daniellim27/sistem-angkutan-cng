// mobile/app/(tabs)/ghost-mode.tsx
// Ghost Mode: Full screen map with proximity-based "ISI GAS" button

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../../src/contexts/AuthContext';
import apiClient from '../../src/services/api';
import { getGasTransactionsByDepositGroup } from '../../src/services/api';
import { FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const GhostMode = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [vehicleLocation, setVehicleLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isNearSPBG, setIsNearSPBG] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [nearestSpbg, setNearestSpbg] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGasButton, setShowGasButton] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'map'>('map');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Animation for ISI GAS button
  const buttonScale = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Check proximity using vehicle's GPS location (scraped from Inovatracks)
  useEffect(() => {
    const checkProximity = async () => {
      try {
        // This endpoint automatically uses the vehicle's GPS location from Inovatracks
        // No need to pass phone location - it uses the scraped vehicle location
        const response = await apiClient.get('/tracking/proximity/spbg');

        if (response.data.success) {
          const { isNear, distance: dist, nearestSpbg: spbg, vehicleLocation: vehLoc } = response.data.data;
          
          // Update vehicle location from response
          if (vehLoc) {
            setVehicleLocation({
              latitude: vehLoc.latitude,
              longitude: vehLoc.longitude
            });
          }
          
          setIsNearSPBG(isNear);
          setDistance(dist);
          setNearestSpbg(spbg);
          setErrorMessage(null);

          // Animate button if within 200m
          if (isNear && dist <= 200) {
            setShowGasButton(true);
            Animated.parallel([
              Animated.spring(buttonScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
              }),
              Animated.timing(buttonOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();
          } else {
            setShowGasButton(false);
            Animated.parallel([
              Animated.spring(buttonScale, {
                toValue: 0,
                useNativeDriver: true,
              }),
              Animated.timing(buttonOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start();
          }
        } else {
          setErrorMessage(response.data.message || 'Tidak dapat memuat lokasi kendaraan');
        }
      } catch (error: any) {
        console.error('Error checking proximity:', error);
        const errorMsg = error.response?.data?.message || 'Tidak dapat memuat lokasi kendaraan dari Inovatracks';
        setErrorMessage(errorMsg);
        
        // Hide button on error
        setShowGasButton(false);
        Animated.parallel([
          Animated.spring(buttonScale, { toValue: 0, useNativeDriver: true }),
          Animated.timing(buttonOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      }
    };

    checkProximity();
    const interval = setInterval(checkProximity, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Initial load - get vehicle location
  useEffect(() => {
    const fetchVehicleLocation = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/tracking/proximity/spbg');
        
        if (response.data.success && response.data.data.vehicleLocation) {
          const vehLoc = response.data.data.vehicleLocation;
          setVehicleLocation({
            latitude: vehLoc.latitude,
            longitude: vehLoc.longitude
          });
          setIsLoading(false);
        } else {
          setErrorMessage(response.data.message || 'Lokasi kendaraan belum tersedia');
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Error fetching vehicle location:', error);
        setErrorMessage(error.response?.data?.message || 'Tidak dapat memuat lokasi kendaraan');
        setIsLoading(false);
      }
    };

    fetchVehicleLocation();
  }, []);

  const handleIsiGasPress = () => {
    if (nearestSpbg?.id) {
      router.push(`/gas-filling-form?deposit_group_id=${nearestSpbg.id}`);
    } else {
      router.push('/gas-filling-form');
    }
  };

  // Fetch history when nearest SPBG changes and when dashboard is active
  const loadHistory = async () => {
    if (!nearestSpbg || !nearestSpbg.id || viewMode !== 'dashboard') return;
    setHistoryLoading(true);
    try {
      const resp = await getGasTransactionsByDepositGroup(nearestSpbg.id);
      if (resp.data && resp.data.success) {
        setHistory(Array.isArray(resp.data.data) ? resp.data.data : []);
        setErrorMessage(null);
      } else {
        setHistory([]);
      }
    } catch (err: any) {
      console.error('Error fetching gas transactions history:', err);
      // Show specific message when access is denied for drivers
      if (err?.response?.status === 403) {
        setErrorMessage('Akses ditolak: Anda tidak diizinkan melihat riwayat SPBG.');
      }
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [nearestSpbg, viewMode]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Memuat lokasi kendaraan...</Text>
        <Text style={styles.loadingSubtext}>Menggunakan GPS dari Inovatracks</Text>
      </View>
    );
  }

  if (!vehicleLocation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {errorMessage || 'Lokasi kendaraan belum tersedia'}
        </Text>
        <Text style={styles.errorSubtext}>
          Lokasi kendaraan diambil dari Inovatracks setiap 5 menit
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top toggle to switch between Dashboard (history) and Map */}
      <View style={styles.topToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'dashboard' && styles.toggleActive]}
          onPress={() => setViewMode('dashboard')}
        >
          <Text style={[styles.toggleText, viewMode === 'dashboard' && styles.toggleTextActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'map' && styles.toggleActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'map' && (
        <>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: vehicleLocation.latitude,
              longitude: vehicleLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            region={{
              latitude: vehicleLocation.latitude,
              longitude: vehicleLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {/* Vehicle location marker (from Inovatracks) */}
            {vehicleLocation && (
              <Marker
                coordinate={{
                  latitude: vehicleLocation.latitude,
                  longitude: vehicleLocation.longitude,
                }}
                title="Lokasi Kendaraan"
                description="GPS dari Inovatracks"
                pinColor="blue"
              />
            )}
            
            {/* SPBG marker */}
            {nearestSpbg && (
              <Marker
                coordinate={{
                  latitude: parseFloat(nearestSpbg.latitude),
                  longitude: parseFloat(nearestSpbg.longitude),
                }}
                title={nearestSpbg.spbg_name || nearestSpbg.spbg_location}
                pinColor="green"
              />
            )}
          </MapView>

          {/* Distance overlay showing how many meters left to SPBG */}
          {distance !== null && nearestSpbg && (
            <View style={styles.distanceIndicator}>
              <Text style={styles.distanceText}>
                {distance <= 200 ? '✓' : '○'} {Math.max(0, Math.round(distance))} m lagi ke SPBG
              </Text>
              <Text style={styles.spbgNameText}>
                {nearestSpbg.spbg_name || nearestSpbg.spbg_location}
              </Text>
              {vehicleLocation && (
                <Text style={styles.locationText}>
                  Kendaraan: {vehicleLocation.latitude.toFixed(6)}, {vehicleLocation.longitude.toFixed(6)}
                </Text>
              )}
            </View>
          )}
        </>
      )}

      {/* Dashboard / History view */}
      {viewMode === 'dashboard' && (
        <View style={styles.dashboardContainer}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
            <Text style={styles.dashboardTitle}>Riwayat Isi Gas SPBG</Text>
            <View style={{flexDirection:'row', gap:12}}>
              <TouchableOpacity 
                onPress={() => {
                  if (nearestSpbg?.id) {
                    router.push({
                      pathname: '/gas-transaction-history',
                      params: { depositGroupId: nearestSpbg.id.toString() },
                    });
                  } else {
                    router.push('/gas-transaction-history');
                  }
                }} 
                style={{padding:6}}
              >
                <Text style={{color:'#007AFF', fontWeight:'600'}}>Lihat Semua</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={loadHistory} style={{padding:6}}>
                <Text style={{color:'#007AFF', fontWeight:'600'}}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : nearestSpbg && history.length === 0 ? (
            <Text style={styles.noHistoryText}>Belum ada transaksi untuk SPBG ini.</Text>
          ) : !nearestSpbg ? (
            <Text style={styles.noHistoryText}>Tidak ada SPBG terdekat. Tunggu hingga kendaraan ditemukan.</Text>
          ) : (
            <ScrollView style={styles.historyList}>
              {history.map((h) => {
                // Prefer OCR values when available, fall back to main fields
                const rawVolume =
                  h?.nota_ocr_data?.ocr_extracted_values?.volume_liters ??
                  h?.volume_m3;
                const rawRate =
                  h?.nota_ocr_data?.ocr_extracted_values?.rate_per_liter ??
                  h?.rate_per_m3;
                const rawTotal =
                  h?.nota_ocr_data?.ocr_extracted_values?.total_cost ??
                  h?.total_cost;

                const volume =
                  rawVolume != null ? parseFloat(String(rawVolume)) : 0;
                const rate = rawRate != null ? parseFloat(String(rawRate)) : 0;
                const total =
                  rawTotal != null ? parseFloat(String(rawTotal)) : 0;

                return (
                  <View key={h.id} style={styles.historyItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>
                        {h.driver?.driverProfile?.full_name ||
                          h.driver?.username ||
                          'Driver'}
                      </Text>
                      <Text style={styles.historySub}>
                        {new Date(h.created_at).toLocaleString()}
                      </Text>
                      <Text style={styles.historySub}>
                        Volume:{' '}
                        {!isNaN(volume) ? volume.toFixed(3) : '0.000'} L
                      </Text>
                      <Text style={styles.historySub}>
                        Harga/Liter: Rp{' '}
                        {!isNaN(rate)
                          ? rate.toLocaleString('id-ID')
                          : '0'}
                        /L
                      </Text>
                      <Text style={styles.historySub}>
                        Rp{' '}
                        {!isNaN(total)
                          ? total.toLocaleString('id-ID')
                          : '0'}{' '}
                        • {h.status}
                      </Text>
                    </View>
                    {h.nota_photo_url && (
                      <View style={styles.historyThumbContainer}>
                        <Text style={styles.historyThumbText}>Nota</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      {/* ISI GAS Button - Animated */}
      {showGasButton && (
        <Animated.View
          style={[
            styles.gasButtonContainer,
            {
              opacity: buttonOpacity,
              transform: [{ scale: buttonScale }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.gasButton}
            onPress={handleIsiGasPress}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="gas-pump" size={24} color="#FFF" />
            <Text style={styles.gasButtonText}>ISI GAS</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  distanceIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  distanceText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  spbgNameText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  locationText: {
    color: '#FFF',
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  errorBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
  },
  gasButtonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  gasButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gasButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  topToggle: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 20,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    marginHorizontal: 6,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  dashboardContainer: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    bottom: 120,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 12,
    zIndex: 15,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  historySub: {
    fontSize: 12,
    color: '#666',
  },
  noHistoryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  historyThumbContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  historyThumbText: {
    fontSize: 10,
    color: '#333',
  },
});

export default GhostMode;

