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
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../../src/contexts/AuthContext';
import apiClient from '../../src/services/api';
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
    router.push('/gas-filling-form');
  };

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

      {/* Distance indicator */}
      {distance !== null && (
        <View style={styles.distanceIndicator}>
          <Text style={styles.distanceText}>
            {distance <= 200 ? '✓' : '○'} {distance}m dari SPBG
          </Text>
          {nearestSpbg && (
            <Text style={styles.spbgNameText}>
              {nearestSpbg.spbg_name || nearestSpbg.spbg_location}
            </Text>
          )}
          {vehicleLocation && (
            <Text style={styles.locationText}>
              Kendaraan: {vehicleLocation.latitude.toFixed(6)}, {vehicleLocation.longitude.toFixed(6)}
            </Text>
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
});

export default GhostMode;

