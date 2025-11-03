import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import apiClient from '../api/axiosConfig';
import GasStationToolbar from './GasStationToolbar';
import { GasStationApi, GasStation } from '../api/gasStationApi';
import { getCustomerLocationsWithCoords, CustomerLocation } from '../api/customerApi';
import StaticRouteDisplay from './StaticRouteDisplay';
import DistanceComplianceCard from './DistanceComplianceCard';
import { useDistanceTracking } from '../hooks/useDistanceTracking';

// Fix for default markers
const DefaultIcon = L.Icon.Default as any;
DefaultIcon.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for delivery order locations
const createLocationIcon = (type: 'spbu' | 'unload' | 'additional_unload') => {
  const iconConfigs = {
    spbu: {
      html: '⛽',
      className: 'custom-location-icon spbu-icon',
      bgColor: '#dc2626', // Red for SPBU
      textColor: 'white'
    },
    unload: {
      html: '📍',
      className: 'custom-location-icon unload-icon',
      bgColor: '#16a34a', // Green for unload
      textColor: 'white'
    },
    additional_unload: {
      html: '📦',
      className: 'custom-location-icon additional-unload-icon',
      bgColor: '#ca8a04', // Yellow for additional unload
      textColor: 'white'
    }
  };

  const config = iconConfigs[type];
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${config.bgColor};
        color: ${config.textColor};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${config.html}
      </div>
    `,
    className: config.className,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Custom icons for customer and SPBG locations (moved outside component to avoid recreation)
const createCustomerIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background-color: #2563eb;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        👤
      </div>
    `,
    className: 'custom-customer-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const createSPBGIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background-color: #dc2626;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ⛽
      </div>
    `,
    className: 'custom-spbg-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Add custom CSS for vehicle markers
const vehicleMarkerStyles = `
  .vehicle-marker-with-label {
    background: transparent !important;
    border: none !important;
  }
  
  .vehicle-label {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 250, 0.95)) !important;
    color: #2d3748 !important;
    padding: 3px 8px !important;
    border-radius: 6px !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    border: 1px solid rgba(226, 232, 240, 0.8) !important;
    white-space: nowrap !important;
    margin-bottom: 3px !important;
    font-family: 'Segoe UI', 'Arial', sans-serif !important;
    letter-spacing: 0.5px !important;
    text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8) !important;
    min-width: 70px !important;
    text-align: center !important;
    max-width: 85px !important;
  }
  
  .vehicle-icon {
    transition: transform 0.2s ease !important;
  }
  
  .vehicle-marker-with-label:hover .vehicle-icon {
    transform: scale(1.1) !important;
  }
  
  .vehicle-marker-with-label:hover .vehicle-label {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95)) !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 6px rgba(0, 0, 0, 0.1) !important;
  }
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = vehicleMarkerStyles;
  if (!document.head.querySelector('style[data-vehicle-markers]')) {
    styleElement.setAttribute('data-vehicle-markers', 'true');
    document.head.appendChild(styleElement);
  }
}

// Color palette for vehicle trails - ensuring good contrast and visibility
const TRAIL_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal  
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Lavender
  '#85C1E9', // Sky Blue
  '#F8C471', // Orange
  '#82E0AA', // Light Green
  '#F1948A', // Salmon
  '#AED6F1', // Light Blue
  '#D7BDE2', // Light Purple
  '#A3E4D7', // Aqua
  '#FAD7A0', // Peach
  '#D5A6BD', // Rose
  '#A9DFBF', // Pale Green
  '#F9E79F'  // Pale Yellow
];

// Generate unique color for vehicle based on index
const getVehicleTrailColor = (index: number): string => {
  return TRAIL_COLORS[index % TRAIL_COLORS.length];
};

// Custom icons for different vehicle states with license plate labels
const createVehicleIcon = (status: string, heading?: number, licensePlate?: string, deviceId?: string) => {
  const iconColor = status === 'active' ? 'green' : status === 'idle' ? 'orange' : 'red';
  const rotation = heading || 0;
  
  // Create the display label - prioritize license plate, fallback to device ID
  const displayLabel = licensePlate || deviceId || 'Unknown';
  
  // Indonesian license plates are max 9 characters (e.g., BE8879ADU)
  // Format: 2 letters + 4 numbers + 3 letters = 9 chars max
  const shortLabel = displayLabel.length > 9 ? displayLabel.substring(0, 9) : displayLabel;
  
  return L.divIcon({
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
      ">
        <!-- License plate label -->
        <div class="vehicle-label">
          ${shortLabel}
        </div>
        <!-- Vehicle icon -->
        <div class="vehicle-icon" style="
          width: 30px; 
          height: 30px; 
          background: ${iconColor}; 
          border: 2px solid white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          transform: rotate(${rotation}deg);
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">
          🚛
        </div>
      </div>
    `,
    className: 'vehicle-marker-with-label',
    iconSize: [90, 50], // Slightly increased width for 9-character plates
    iconAnchor: [45, 45], // Adjusted anchor point for new width
    popupAnchor: [0, -45] // Adjusted popup anchor
  });
};

interface SPBGLocation {
  id: number;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  type: string;
  display_name: string;
}

// Union type for both gas stations and SPBG locations
type LocationMarker = GasStation | SPBGLocation;

// Type guard to check if it's an SPBG location
const isSPBGLocation = (item: LocationMarker): item is SPBGLocation => {
  return 'type' in item && 'location' in item && !('station_type' in item);
};

interface DriverLocation {
  id: number;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  status: string;
  device_id?: string;
  vehicle_id?: number;
  vehicle?: {
    id: number;
    license_plate: string;
    type: string;
  };
  driver?: {
    username: string;
    driverProfile?: {
      full_name: string;
      phone: string;
    };
  };
  deliveryOrder?: {
    id: number;
    do_number: string;
    status: string;
  };
}

interface TrailPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
  heading?: number;
  status: string;
}

interface VehicleTrail {
  deviceId: string;
  originalDeviceId: string;
  vehicle?: {
    id: number;
    license_plate: string;
    type: string;
  };
  driver?: {
    username: string;
    driverProfile?: {
      full_name: string;
    };
  };
  points: TrailPoint[];
  pointCount: number;
  startTime: string;
  endTime: string;
  colorIndex: number;
  totalDistance?: number; // Added for distance
  deviceVariations?: string[]; // Added for device variations
}

interface TrackingStats {
  activeVehicles: number;
  totalVehicles: number;
  activePercentage: string;
  recentLocations: number;
  lastUpdated: string;
}

interface LiveTrackingMapProps {
  deliveryOrderId?: number;
  vehicleId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
  onActiveVehiclesUpdate?: (vehicles: DriverLocation[]) => void;
  onTrailsUpdate?: (trails: VehicleTrail[]) => void;
}

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  deliveryOrderId,
  vehicleId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  className = "h-96",
  onActiveVehiclesUpdate,
  onTrailsUpdate
}) => {
  const [vehicles, setVehicles] = useState<DriverLocation[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<DriverLocation | null>(null);
  const [trackingStats, setTrackingStats] = useState<TrackingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Trail-related state
  const [trails, setTrails] = useState<VehicleTrail[]>([]);
  const [showTrails, setShowTrails] = useState(false); // Default to false
  const [loadingTrails, setLoadingTrails] = useState(false);
  
  // Gas Station state
  const [gasStations, setGasStations] = useState<LocationMarker[]>([]);
  const [loadingGasStations, setLoadingGasStations] = useState(false);
  
  // Customer locations state
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [loadingCustomerLocations, setLoadingCustomerLocations] = useState(false);
  const [updatingCustomerCoordinates, setUpdatingCustomerCoordinates] = useState(false);
  
  // Show/hide toggles
  const [showCustomerLocations, setShowCustomerLocations] = useState(false);
  const [showSPBGLocations, setShowSPBGLocations] = useState(false);
  
  // Delivery Order location markers state
  const [deliveryOrderData, setDeliveryOrderData] = useState<any>(null);
  const [locationMarkers, setLocationMarkers] = useState<Array<{
    type: 'spbu' | 'unload' | 'additional_unload';
    position: [number, number];
    label: string;
    address: string;
  }>>([]);

  // Routing state
  const [showRoute, setShowRoute] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    time: number;
  } | null>(null);
  
  // Fixed trail duration - 24 hours only
  const trailHours = 24;

  // Distance tracking hook
  const {
    data: distanceData,
    loading: distanceLoading,
    error: distanceError,
    refresh: refreshDistance,
    calculateCompliance
  } = useDistanceTracking({
    deliveryOrderId: deliveryOrderId || 0,
    autoRefresh: autoRefresh,
    refreshInterval: refreshInterval,
    tolerancePercentage: 31.0,
    plannedDistance: routeInfo && typeof routeInfo.distance === 'number' ? routeInfo.distance / 1000 : undefined // Convert from meters to km
  });


  // Refs for request cancellation
  const trackingAbortController = useRef<AbortController | null>(null);
  const trailAbortController = useRef<AbortController | null>(null);
  const trailTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable trail fetching function
  const fetchTrailData = useCallback(async () => {
    try {
      setLoadingTrails(true);
      
      // Create new abort controller
      trailAbortController.current = new AbortController();
      
      const params: any = { hours: trailHours };
      if (deliveryOrderId) params.deliveryOrderId = deliveryOrderId;
      if (vehicleId) params.vehicleId = vehicleId;

      const response = await apiClient.get('/tracking/trails', { 
        params,
        signal: trailAbortController.current.signal,
        timeout: 15000 // 15 second timeout for trails
      });
      
      if (response.data.success) {
        setTrails(response.data.data);
        if (onTrailsUpdate) {
          onTrailsUpdate(response.data.data);
        }
      }
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Error fetching trail data:', err);
      }
    } finally {
      setLoadingTrails(false);
    }
  }, [deliveryOrderId, vehicleId, onTrailsUpdate]); // Removed trailHours since it's now constant

  // Debounced trail fetching
  const debouncedFetchTrails = useCallback(() => {
    // Clear existing timeout
    if (trailTimeoutRef.current) {
      clearTimeout(trailTimeoutRef.current);
    }

    // Cancel previous trail request
    if (trailAbortController.current) {
      trailAbortController.current.abort();
    }

    // Don't fetch if trails are disabled
    if (!showTrails) {
      setTrails([]);
      if (onTrailsUpdate) {
        onTrailsUpdate([]);
      }
      return;
    }

    trailTimeoutRef.current = setTimeout(() => {
      fetchTrailData();
    }, 1000); // 1 second debounce
  }, [showTrails, fetchTrailData, onTrailsUpdate]);

  // Gas Station (SPBG) fetching function
  const fetchGasStations = useCallback(async () => {
    try {
      setLoadingGasStations(true);
      
      // Use the new endpoint that gets SPBG locations from deposit groups and geocodes them
      const response = await apiClient.get('/deposit-groups/spbg-locations-with-coords');
      
      if (response.data && response.data.success && response.data.data) {
        setGasStations(response.data.data);
      } else {
        console.error('❌ API response not successful:', response.data);
        setGasStations([]);
      }
    } catch (err: any) {
      console.error('❌ Error fetching SPBG locations:', err);
    } finally {
      setLoadingGasStations(false);
    }
  }, []);

  // Customer locations fetching function
  const fetchCustomerLocations = useCallback(async () => {
    try {
      setLoadingCustomerLocations(true);
      console.log('🔍 Fetching customer locations...');
      const locations = await getCustomerLocationsWithCoords();
      console.log('✅ Customer locations received:', {
        count: locations.length,
        sample: locations[0],
        allData: locations
      });
      setCustomerLocations(locations);
      
      if (locations.length === 0) {
        console.warn('⚠️ No customer locations with coordinates found in database');
      }
    } catch (err: any) {
      console.error('❌ Error fetching customer locations:', err);
      setCustomerLocations([]);
    } finally {
      setLoadingCustomerLocations(false);
    }
  }, []);

  // Update customer coordinates using geocoding
  const handleUpdateCustomerCoordinates = useCallback(async () => {
    if (!window.confirm('This will geocode all customers without coordinates. This may take a few minutes. Continue?')) {
      return;
    }
    
    try {
      setUpdatingCustomerCoordinates(true);
      console.log('🔍 Updating customer coordinates...');
      
      const response = await apiClient.post('/customers/update-coordinates');
      
      if (response.data.success) {
        alert(`✅ Successfully updated ${response.data.data.updated} customer location(s)!\n\nTotal: ${response.data.data.total}\nUpdated: ${response.data.data.updated}\nFailed: ${response.data.data.failed}`);
        
        // Refresh customer locations
        if (showCustomerLocations) {
          fetchCustomerLocations();
        }
      } else {
        alert('❌ Failed to update customer coordinates: ' + response.data.message);
      }
    } catch (err: any) {
      console.error('❌ Error updating customer coordinates:', err);
      alert('❌ Error updating customer coordinates: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingCustomerCoordinates(false);
    }
  }, [showCustomerLocations, fetchCustomerLocations]);

  // Fetch delivery order data and create location markers
  const fetchDeliveryOrderLocations = useCallback(async () => {
    if (!deliveryOrderId) return;
    
    try {
      const response = await apiClient.get(`/delivery-orders/${deliveryOrderId}`);
      if (response.data.success || response.data.id) {
        const deliveryOrder = response.data.success ? response.data.data : response.data;
        setDeliveryOrderData(deliveryOrder);
        
        // Debug logging to check coordinate data
        console.log('🔍 Delivery Order Data:', {
          id: deliveryOrder.id,
          do_number: deliveryOrder.do_number,
          load_location: deliveryOrder.load_location,
          load_latitude: deliveryOrder.load_latitude,
          load_longitude: deliveryOrder.load_longitude,
          unload_location: deliveryOrder.unload_location,
          unload_latitude: deliveryOrder.unload_latitude,
          unload_longitude: deliveryOrder.unload_longitude,
          additional_unload_locations: deliveryOrder.additional_unload_locations
        });
        
        const markers: Array<{
          type: 'spbu' | 'unload' | 'additional_unload';
          position: [number, number];
          label: string;
          address: string;
        }> = [];
        
        // Add SPBU (load location) marker
        if (deliveryOrder.load_latitude && deliveryOrder.load_longitude) {
          markers.push({
            type: 'spbu',
            position: [parseFloat(deliveryOrder.load_latitude), parseFloat(deliveryOrder.load_longitude)],
            label: 'SPBU Location',
            address: deliveryOrder.load_location || 'SPBU Location'
          });
        }
        
        // Add unload location marker
        if (deliveryOrder.unload_latitude && deliveryOrder.unload_longitude) {
          markers.push({
            type: 'unload',
            position: [parseFloat(deliveryOrder.unload_latitude), parseFloat(deliveryOrder.unload_longitude)],
            label: 'Unload Location',
            address: deliveryOrder.unload_location || 'Customer Location'
          });
        }
        
        // Add additional unload locations
        if (Array.isArray(deliveryOrder.additional_unload_locations)) {
          deliveryOrder.additional_unload_locations.forEach((location: any, index: number) => {
            if (location.latitude && location.longitude) {
              markers.push({
                type: 'additional_unload',
                position: [parseFloat(location.latitude), parseFloat(location.longitude)],
                label: `Unload Location ${index + 2}`,
                address: location.location || `Additional Unload ${index + 1}`
              });
            }
          });
        }
        
        setLocationMarkers(markers);
        console.log('🎯 Loaded delivery order location markers:', markers);
      }
    } catch (err: any) {
      console.error('Error fetching delivery order locations:', err);
    }
  }, [deliveryOrderId]);

  // Memoized waypoints key for static route (only delivery locations)
  const routeWaypointsKey = useMemo(() => {
    if (locationMarkers.length === 0) return null;
    
    const markersKey = locationMarkers
      .map(m => `${m.type}-${m.position[0].toFixed(4)}-${m.position[1].toFixed(4)}`)
      .sort()
      .join('|');
    
    return markersKey;
  }, [locationMarkers]); // Only depend on delivery locations for static route

  // Calculate route waypoints for delivery locations only (static route)
  const calculateRouteWaypoints = useCallback(() => {
    const waypoints: L.LatLng[] = [];
    
    // Add delivery order locations as waypoints in logical order
    // First SPBU locations, then unload locations, then additional unload locations
    const sortedMarkers = [...locationMarkers].sort((a, b) => {
      const order = { spbu: 1, unload: 2, additional_unload: 3 };
      return order[a.type] - order[b.type];
    });
    
    sortedMarkers.forEach(marker => {
      waypoints.push(L.latLng(marker.position[0], marker.position[1]));
    });
    
    return waypoints;
  }, [locationMarkers]); // Only depend on delivery locations, not vehicle position

  // Memoized route waypoints to prevent unnecessary recalculations
  const routeWaypoints = useMemo(() => {
    if (!showRoute) return [];
    return calculateRouteWaypoints();
  }, [showRoute, calculateRouteWaypoints]);

  // Stable callback for route loading to prevent unnecessary re-renders
  const handleRouteLoaded = useCallback((route: any) => {
    setRouteInfo({
      distance: route.distance,
      time: route.duration
    });
  }, []);

  // Fetch tracking data
  const fetchTrackingData = useCallback(async () => {
    try {
      // Cancel previous tracking request
      if (trackingAbortController.current) {
        trackingAbortController.current.abort();
      }

      // Create new abort controller
      trackingAbortController.current = new AbortController();

      if (deliveryOrderId) {
        // Fetch specific delivery tracking
        const response = await apiClient.get(`/tracking/delivery/${deliveryOrderId}`, {
          signal: trackingAbortController.current.signal,
          timeout: 20000 // 20 second timeout
        });
        if (response.data.success && response.data.data.currentLocation) {
          setSelectedVehicle(response.data.data.currentLocation);
          setVehicles([response.data.data.currentLocation]);
          
          // Notify parent component
          if (onActiveVehiclesUpdate) {
            onActiveVehiclesUpdate([response.data.data.currentLocation]);
          }
        }
      } else if (vehicleId) {
        // Fetch all active vehicles and find the selected one
        const response = await apiClient.get('/tracking/vehicles/active', {
          signal: trackingAbortController.current.signal,
          timeout: 20000
        });
        if (response.data.success) {
          const allVehicles = response.data.data;
          
          // Find the selected vehicle by ID (check both vehicle_id and device ID)
          const selectedVehicleData = allVehicles.find((vehicle: DriverLocation) => 
            vehicle.vehicle_id === vehicleId || 
            vehicle.id === vehicleId ||
            (vehicle.device_id && vehicle.device_id.toString().includes(vehicleId.toString()))
          );
          
          if (selectedVehicleData) {
            setSelectedVehicle(selectedVehicleData);
            setVehicles([selectedVehicleData]); // Show only selected vehicle
          } else {
            // If vehicle not found in active list, show all and let user know
            setVehicles(allVehicles);
            setSelectedVehicle(null);
          }
          
          // Notify parent component of active vehicles for dropdown
          if (onActiveVehiclesUpdate) {
            onActiveVehiclesUpdate(allVehicles);
          }
        }
      } else {
        // Fetch all active vehicles
        const response = await apiClient.get('/tracking/vehicles/active', {
          signal: trackingAbortController.current.signal,
          timeout: 20000
        });
        if (response.data.success) {
          setVehicles(response.data.data);
          
          // Notify parent component of active vehicles for dropdown
          if (onActiveVehiclesUpdate) {
            onActiveVehiclesUpdate(response.data.data);
          }
        }
      }

      // Fetch tracking statistics (less frequently)
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdate.getTime();
      if (timeSinceLastUpdate > 60000) { // Only every minute
        const statsResponse = await apiClient.get('/tracking/stats', {
          signal: trackingAbortController.current.signal,
          timeout: 15000
        });
        if (statsResponse.data.success) {
          setTrackingStats(statsResponse.data.data);
        }
      }

      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Error fetching tracking data:', err);
        
        // Handle timeout errors specifically
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          setError('Request timed out. The tracking server may be experiencing high load. Please try again.');
        } else if (err.code === 'NETWORK_ERROR') {
          setError('Network connection error. Please check your internet connection.');
        } else {
          setError(err.response?.data?.message || 'Failed to fetch tracking data. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [deliveryOrderId, vehicleId, onActiveVehiclesUpdate]); // Removed lastUpdate from dependencies

  // Manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchTrackingData();
    if (showTrails) {
      debouncedFetchTrails();
    }
  };

  // Auto-refresh effect for tracking data only
  useEffect(() => {
    fetchTrackingData();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchTrackingData, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      // Cleanup abort controllers
      if (trackingAbortController.current) {
        trackingAbortController.current.abort();
      }
    };
  }, [fetchTrackingData, autoRefresh, refreshInterval]);

  // Separate effect for trail data (less frequent updates)
  useEffect(() => {
    // Disable trails for delivery order tracking or when manually disabled
    if (!showTrails || deliveryOrderId) {
      // Clear trails when disabled or when tracking specific delivery
      setTrails([]);
      if (onTrailsUpdate) {
        onTrailsUpdate([]);
      }
      return;
    }

    debouncedFetchTrails();

    // Cleanup on unmount
    return () => {
      if (trailTimeoutRef.current) {
        clearTimeout(trailTimeoutRef.current);
      }
      if (trailAbortController.current) {
        trailAbortController.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTrails, deliveryOrderId, vehicleId]); // Removed trailHours since it's now constant

  // Effect for gas stations
  useEffect(() => {
    fetchGasStations();
  }, [fetchGasStations]);

  // Effect for gas stations when SPBG toggle is enabled
  useEffect(() => {
    if (showSPBGLocations) {
      fetchGasStations();
    }
  }, [showSPBGLocations, fetchGasStations]);

  // Effect for customer locations
  useEffect(() => {
    if (showCustomerLocations) {
      fetchCustomerLocations();
    }
  }, [showCustomerLocations, fetchCustomerLocations]);

  // Effect for delivery order locations
  useEffect(() => {
    fetchDeliveryOrderLocations();
  }, [fetchDeliveryOrderLocations]);

  // Log waypoints calculation for debugging
  useEffect(() => {
    if (showRoute) {
      // console.log('🗺️ Calculating waypoints:', {
      //   showRoute,
      //   waypointsCount: routeWaypoints.length,
      //   hasVehicle: !!selectedVehicle,
      //   locationMarkersCount: locationMarkers.length
      // }); // Reduced logging
      
      if (routeWaypoints.length >= 2) {
        // console.log('✅ Waypoints set for routing:', routeWaypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }))); // Reduced logging
      } else {
        // console.log('⚠️ Not enough waypoints for routing'); // Reduced logging
      }
    } else {
      // console.log('🚫 Routing disabled'); // Reduced logging
    }
  }, [showRoute, routeWaypoints, selectedVehicle, locationMarkers.length]);

  // Calculate map center
  const getMapCenter = (): [number, number] => {
    if (selectedVehicle) {
      return [selectedVehicle.latitude, selectedVehicle.longitude];
    }
    
    if (vehicles.length > 0) {
      const avgLat = vehicles.reduce((sum, v) => sum + v.latitude, 0) / vehicles.length;
      const avgLng = vehicles.reduce((sum, v) => sum + v.longitude, 0) / vehicles.length;
      return [avgLat, avgLng];
    }
    
    return [-6.2088, 106.8456]; // Jakarta default
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - then.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 border border-red-200 rounded-lg`}>
        <div className="text-center p-6">
          <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Map</div>
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Live GPS Tracking</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '🔄' : '↻'} Refresh
            </button>
          </div>
        </div>

        {/* Trail Controls - Only show for general vehicle tracking, not for specific delivery tracking */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {!deliveryOrderId && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showTrails}
                onChange={(e) => setShowTrails(e.target.checked)}
                className="rounded"
              />
              <span>Show Vehicle Trails</span>
            </label>
          )}

          {/* Customer and SPBG Location Controls */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showCustomerLocations}
              onChange={(e) => setShowCustomerLocations(e.target.checked)}
              className="rounded"
            />
            <span>Show Customer Locations</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showSPBGLocations}
              onChange={(e) => setShowSPBGLocations(e.target.checked)}
              className="rounded"
            />
            <span>Show SPBG Locations</span>
          </label>

          {showTrails && loadingTrails && (
            <span className="text-gray-500">Loading trails...</span>
          )}

          {showCustomerLocations && loadingCustomerLocations && (
            <span className="text-gray-500">Loading customer locations...</span>
          )}
          
          {showCustomerLocations && !loadingCustomerLocations && customerLocations.length === 0 && (
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-xs">⚠️ No customer locations with coordinates found</span>
              <button
                onClick={handleUpdateCustomerCoordinates}
                disabled={updatingCustomerCoordinates}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Geocode customer addresses to add map coordinates"
              >
                {updatingCustomerCoordinates ? 'Updating...' : '📍 Add Coordinates'}
              </button>
            </div>
          )}
          
          {showCustomerLocations && !loadingCustomerLocations && customerLocations.length > 0 && (
            <span className="text-green-600 text-xs">✓ {customerLocations.length} customer location{customerLocations.length !== 1 ? 's' : ''} loaded</span>
          )}

          {showSPBGLocations && loadingGasStations && (
            <span className="text-gray-500">Loading SPBG locations...</span>
          )}
          
          {showSPBGLocations && !loadingGasStations && gasStations.length === 0 && (
            <span className="text-amber-600 text-xs">⚠️ No SPBG locations found</span>
          )}
          
          {showSPBGLocations && !loadingGasStations && gasStations.length > 0 && (
            <span className="text-green-600 text-xs">✓ {gasStations.length} SPBG location{gasStations.length !== 1 ? 's' : ''} loaded</span>
          )}

          {loadingGasStations && (
            <span className="text-gray-500">Loading gas stations...</span>
          )}

          {/* Only show delivery route checkbox when tracking a specific delivery order */}
          {deliveryOrderId && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showRoute}
                onChange={(e) => setShowRoute(e.target.checked)}
                className="rounded"
              />
              <span>Show Delivery Route</span>
            </label>
          )}

          {/* Only show route info when tracking a specific delivery order and route is enabled */}
          {deliveryOrderId && showRoute && routeInfo && (
            <div className="flex items-center space-x-4 text-xs bg-blue-50 px-3 py-1 rounded">
              <span className="font-medium text-blue-800">
                📏 {(routeInfo.distance / 1000).toFixed(1)} km
              </span>
              <span className="font-medium text-blue-800">
                ⏱️ {Math.round(routeInfo.time / 60)} min
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        {trackingStats && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
            <div className="flex flex-wrap gap-4">
              <span>Active: {trackingStats.activeVehicles}/{trackingStats.totalVehicles}</span>
              <span>Last updated: {formatTimeAgo(lastUpdate.toISOString())}</span>
              {!deliveryOrderId && showTrails && trails.length > 0 && (
                <>
                  <span>Total trail points: {trails.reduce((sum, t) => sum + t.pointCount, 0)}</span>
                  <span>Avg points/trail: {(trails.reduce((sum, t) => sum + t.pointCount, 0) / trails.length).toFixed(1)}</span>
                  {trails.some(t => t.deviceVariations && t.deviceVariations.length > 1) && (
                    <span className="text-yellow-600">⚠️ Mixed device IDs detected</span>
                  )}
                </>
              )}
              {gasStations.length > 0 && (
                <span>⛽ Gas stations: {gasStations.length}</span>
              )}
              {locationMarkers.length > 0 && (
                <span>📍 Delivery locations: {locationMarkers.length}</span>
              )}
            </div>
            
            {/* Location Markers Legend */}
            {locationMarkers.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-1">Delivery Locations:</div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {locationMarkers.some(m => m.type === 'spbu') && (
                    <span className="flex items-center gap-1">
                      <span style={{color: '#dc2626'}}>⛽</span> SPBU Location
                    </span>
                  )}
                  {locationMarkers.some(m => m.type === 'unload') && (
                    <span className="flex items-center gap-1">
                      <span style={{color: '#16a34a'}}>📍</span> Unload Location
                    </span>
                  )}
                  {locationMarkers.some(m => m.type === 'additional_unload') && (
                    <span className="flex items-center gap-1">
                      <span style={{color: '#ca8a04'}}>📦</span> Additional Unload
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className={`${className} w-full rounded-lg overflow-hidden border`}>
        <MapContainer
          center={getMapCenter()}
          zoom={vehicles.length === 1 ? 15 : 12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="© OpenStreetMap contributors, © CARTO"
            subdomains="abcd"
            maxZoom={19}
          />
          
          {/* Vehicle Trails */}
          {showTrails && trails.map((trail) => {
            const trailColor = getVehicleTrailColor(trail.colorIndex);
            const positions: [number, number][] = trail.points.map(point => [point.latitude, point.longitude]);
            
            return (
              <Polyline
                key={`trail-${trail.deviceId}`}
                positions={positions}
                pathOptions={{
                  color: trailColor,
                  weight: 3,
                  opacity: 0.7,
                  dashArray: '5, 10' // Dashed line style
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h4 className="font-semibold text-blue-600 mb-2">
                      Vehicle Trail: {trail.vehicle?.license_plate || trail.deviceId}
                    </h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Points:</strong> {trail.pointCount}</div>
                      <div><strong>Duration:</strong> {formatTimeAgo(trail.startTime)} to {formatTimeAgo(trail.endTime)}</div>
                      {trail.totalDistance && (
                        <div><strong>Distance:</strong> {trail.totalDistance.toFixed(2)} km</div>
                      )}
                      <div style={{ color: trailColor, fontWeight: 'bold' }}>
                        <strong>Trail Color:</strong> {trailColor}
                      </div>
                      {trail.deviceVariations && trail.deviceVariations.length > 1 && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="text-xs text-yellow-800">
                            <strong>⚠️ Multiple Device IDs:</strong>
                            <div className="mt-1">
                              {trail.deviceVariations.map((deviceId, idx) => (
                                <div key={idx} className="truncate">• {deviceId}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}
          
          {/* Current Vehicle Positions */}
          {vehicles.map((vehicle) => (
            <Marker
              key={vehicle.id}
              position={[vehicle.latitude, vehicle.longitude]}
              icon={createVehicleIcon(vehicle.status, vehicle.heading, vehicle.vehicle?.license_plate, vehicle.device_id)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-semibold text-blue-600 mb-2">
                    {vehicle.vehicle?.license_plate || `GPS Device: ${vehicle.device_id || 'Unknown'}`}
                  </h4>
                  
                  {vehicle.driver?.driverProfile && (
                    <div className="mb-2">
                      <strong>Driver:</strong> {vehicle.driver.driverProfile.full_name}
                      {vehicle.driver.driverProfile.phone && (
                        <div className="text-sm text-gray-600">📞 {vehicle.driver.driverProfile.phone}</div>
                      )}
                    </div>
                  )}
                  
                  {vehicle.deliveryOrder && (
                    <div className="mb-2">
                      <strong>Delivery:</strong> {vehicle.deliveryOrder.do_number}
                      <div className="text-sm">
                        Status: <span className="text-blue-600">{vehicle.deliveryOrder.status}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>📍 Lat: {vehicle.latitude.toFixed(5)}, Lng: {vehicle.longitude.toFixed(5)}</div>
                    {vehicle.speed && <div>🚗 Speed: {vehicle.speed} km/h</div>}
                    <div>🕒 {formatTimeAgo(vehicle.timestamp)}</div>
                    <div>
                      Status: <span className={`font-semibold ${
                        vehicle.status === 'active' ? 'text-green-600' : 
                        vehicle.status === 'idle' ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {vehicle.status}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Delivery Order Location Markers */}
          {locationMarkers && locationMarkers.map((marker, index) => (
            <Marker
              key={`location-${marker.type}-${index}`}
              position={marker.position}
              icon={createLocationIcon(marker.type)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-semibold mb-2" style={{
                    color: marker.type === 'spbu' ? '#dc2626' : 
                           marker.type === 'unload' ? '#16a34a' : '#ca8a04'
                  }}>
                    {marker.label}
                  </h4>
                  
                  <div className="text-sm space-y-2">
                    <div>
                      <strong>Address:</strong>
                      <div className="text-gray-600">{marker.address}</div>
                    </div>
                    
                    <div>
                      <strong>Coordinates:</strong>
                      <div className="text-gray-600 font-mono text-xs">
                        Lat: {marker.position[0].toFixed(6)}<br/>
                        Lng: {marker.position[1].toFixed(6)}
                      </div>
                    </div>
                    
                    {deliveryOrderData && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Delivery Order: <span className="font-medium text-blue-600">
                            {deliveryOrderData.do_number}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Customer Location Markers */}
          {showCustomerLocations && customerLocations && customerLocations.map((customer) => (
            <Marker
              key={`customer-${customer.id}`}
              position={[customer.latitude, customer.longitude]}
              icon={createCustomerIcon()}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-semibold text-blue-600 mb-2">
                    Customer Location
                  </h4>
                  <div className="space-y-1">
                    <p><strong>Name:</strong> {customer.customer_name}</p>
                    <p><strong>Address:</strong> {customer.location}</p>
                    <p className="text-xs text-gray-500">
                      {customer.latitude.toFixed(6)}, {customer.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* SPBG (Gas Station) Location Markers */}
          {showSPBGLocations && gasStations && gasStations.length > 0 ? (
            gasStations.map((locationItem) => (
              <Marker
                key={`spbg-${locationItem.id}`}
                position={[locationItem.latitude, locationItem.longitude]}
                icon={createSPBGIcon()}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-semibold text-red-600 mb-2">
                      SPBG Location
                    </h4>
                    <div className="space-y-1">
                      <p><strong>Name:</strong> {locationItem.name}</p>
                      {isSPBGLocation(locationItem) ? (
                        <>
                          <p><strong>Type:</strong> {locationItem.type}</p>
                          <p><strong>Location:</strong> {locationItem.location}</p>
                        </>
                      ) : (
                        <>
                          <p><strong>Type:</strong> {locationItem.station_type}</p>
                          {locationItem.address && <p><strong>Address:</strong> {locationItem.address}</p>}
                          {locationItem.operating_hours && <p><strong>Hours:</strong> {locationItem.operating_hours}</p>}
                        </>
                      )}
                      <p className="text-xs text-gray-500">
                        {locationItem.latitude.toFixed(6)}, {locationItem.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))
          ) : null}

          {/* Delivery Route - Static route calculated once */}
          {showRoute && routeWaypoints.length >= 2 && (
            <StaticRouteDisplay
              key={routeWaypointsKey} // Recalculate only when delivery locations change
              waypoints={routeWaypoints}
              routeColor="#3b82f6"
              onRouteLoaded={handleRouteLoaded}
              showRouteInfo={true}
            />
          )}

          {/* Gas Station Toolbar - Disabled since we're using SPBG deposit group locations */}
          {false && !loading && (
            <GasStationToolbar
              gasStations={gasStations.filter(item => !isSPBGLocation(item)) as GasStation[]}
              onGasStationsUpdate={(stations: GasStation[]) => {
                // Merge with existing SPBG locations
                const spbgLocations = gasStations.filter(isSPBGLocation);
                setGasStations([...stations, ...spbgLocations]);
              }}
              onMarkerAdded={(gasStation) => {
                console.log('Gas station added:', gasStation);
              }}
              onMarkerDeleted={(gasStationId) => {
                console.log('Gas station deleted:', gasStationId);
              }}
              editMode={true}
              onEditModeChange={() => {}}
            />
          )}
        </MapContainer>
      </div>

      {/* Distance Compliance Card - Only show for delivery order tracking */}
      {deliveryOrderId && distanceData && (
        <DistanceComplianceCard 
          data={distanceData} 
          className="w-full"
        />
      )}

    </div>
  );
};

export default LiveTrackingMap; 