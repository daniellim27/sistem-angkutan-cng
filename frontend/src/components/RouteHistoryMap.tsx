import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L, { Map } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { authClient } from '../api/axiosConfig';

// Fix for default markers in React Leaflet
const DefaultIcon = L.Icon.Default as any;
DefaultIcon.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Interface for route point
interface RoutePoint {
  id: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number | null;
  device_id: string;
  status: string;
}

// Interface for route data response
interface RouteData {
  route: RoutePoint[];
  stats: {
    totalPoints: number;
    startTime: string | null;
    endTime: string | null;
    totalDistance: number;
    vehicleInfo: {
      device_id: string;
      license_plate: string;
      vehicle_type: string;
    } | null;
  };
}

interface RouteHistoryMapProps {
  vehicleId: number | null;
  deviceId: string;
  startDate: string;
  endDate: string;
  className?: string;
}

// Component to fit map bounds to route
const FitBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map || points.length === 0) return;
    
    try {
      // Add a small delay to ensure map is fully initialized
      const timeoutId = setTimeout(() => {
        if (map && map.getContainer() && points.length > 0) {
          const bounds = L.latLngBounds(points);
          map.fitBounds(bounds, { padding: [10, 10] });
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.warn('Error fitting map bounds:', error);
    }
  }, [map, points]);
  
  return null;
};

// Component to handle map initialization
const MapInitializer: React.FC = () => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      // Ensure map container is properly sized after initialization
      const timeoutId = setTimeout(() => {
        try {
          if (map.getContainer()) {
            map.invalidateSize();
          }
        } catch (error) {
          console.warn('Error invalidating map size:', error);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [map]);
  
  return null;
};

// Create custom marker icons
const createStartIcon = () => {
  return new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const createEndIcon = () => {
  return new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};


const RouteHistoryMap: React.FC<RouteHistoryMapProps> = ({
  vehicleId,
  deviceId,
  startDate,
  endDate,
  className = "h-96"
}) => {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch route data
  useEffect(() => {
    const fetchRouteData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        const params = new URLSearchParams({
          startDate: startDate + 'T00:00:00.000Z',
          endDate: endDate + 'T23:59:59.999Z',
          limit: '2000' // Limit for performance
        });

        if (deviceId) {
          params.append('deviceId', deviceId);
        }

        const response = await authClient.get(
          `/tracking/vehicle/${vehicleId || 'null'}/route-history?${params}`,
          { signal: abortControllerRef.current.signal }
        );

        const result = response.data;

        if (result.success) {
          setRouteData(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch route data');
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          return; // Request was cancelled
        }
        console.error('Error fetching route data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if ((vehicleId || deviceId) && startDate && endDate) {
      fetchRouteData();
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [vehicleId, deviceId, startDate, endDate]);

  // Convert route points to polyline coordinates
  const routeCoordinates: [number, number][] = routeData?.route.map(point => [
    point.latitude,
    point.longitude
  ]) || [];

  // Get start and end points for markers
  const startPoint = routeData?.route[0];
  const endPoint = routeData?.route[routeData.route.length - 1];

  // Default center (Indonesia)
  const defaultCenter: [number, number] = [-6.2088, 106.8456];

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading route data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Route</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!routeData || routeData.route.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Route Data</h3>
          <p className="text-gray-600">
            No GPS points found for the selected vehicle and date range.
          </p>
        </div>
      </div>
    );
  }

  // Format time for display
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

  // Manual refresh function
  const handleRefresh = () => {
    setLoading(true);
    // Re-trigger the useEffect by updating a dependency
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Route History</h3>
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

      </div>

      {/* Map */}
      <div className={`${className} w-full rounded-lg overflow-hidden border`}>
        {((vehicleId || deviceId) && startDate && endDate) ? (
          <MapContainer
            key={`${vehicleId}-${deviceId}-${startDate}-${endDate}`}
            center={routeCoordinates.length > 0 ? routeCoordinates[0] : defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            whenReady={() => {
              // Map is ready, invalidateSize will be handled by a separate component
            }}
          >
          <MapInitializer />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="© OpenStreetMap contributors, © CARTO"
            subdomains="abcd"
            maxZoom={19}
          />

          {/* Fit bounds to route */}
          {routeCoordinates.length > 0 && (
            <FitBounds points={routeCoordinates} />
          )}

          {/* Route polyline */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              color="#3b82f6"
              weight={4}
              opacity={0.8}
            />
          )}

          {/* Start marker */}
          {startPoint && (
            <Marker 
              position={[startPoint.latitude, startPoint.longitude]}
              icon={createStartIcon()}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-semibold text-green-600 mb-2">🚩 Start Point</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>🕒 {new Date(startPoint.timestamp).toLocaleString()}</div>
                    {startPoint.speed && <div>🚗 Speed: {startPoint.speed} km/h</div>}
                    <div>📱 Device: {startPoint.device_id}</div>
                    <div>📍 Lat: {startPoint.latitude.toFixed(5)}, Lng: {startPoint.longitude.toFixed(5)}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* End marker */}
          {endPoint && startPoint && endPoint.id !== startPoint.id && (
            <Marker 
              position={[endPoint.latitude, endPoint.longitude]}
              icon={createEndIcon()}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-semibold text-red-600 mb-2">🏁 End Point</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>🕒 {new Date(endPoint.timestamp).toLocaleString()}</div>
                    {endPoint.speed && <div>🚗 Speed: {endPoint.speed} km/h</div>}
                    <div>📱 Device: {endPoint.device_id}</div>
                    <div>📍 Lat: {endPoint.latitude.toFixed(5)}, Lng: {endPoint.longitude.toFixed(5)}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

        </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center text-gray-500">
              <p>Select a vehicle and date range to view the route map</p>
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Info */}
      {routeData.stats.vehicleInfo && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Vehicle Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">License Plate:</span>
              <span className="ml-2 font-semibold">{routeData.stats.vehicleInfo.license_plate}</span>
            </div>
            <div>
              <span className="text-gray-600">Vehicle Type:</span>
              <span className="ml-2 font-semibold">{routeData.stats.vehicleInfo.vehicle_type}</span>
            </div>
            <div>
              <span className="text-gray-600">Device ID:</span>
              <span className="ml-2 font-semibold">{routeData.stats.vehicleInfo.device_id}</span>
            </div>
          </div>
        </div>
      )}

      {/* GPS Coordinates Table */}
      {routeData && routeData.route.length > 0 && (() => {
        // Filter out duplicate coordinates based on lat/lng
        const uniqueCoordinates = routeData.route.filter((point, index, array) => {
          return array.findIndex(p => 
            p.latitude.toFixed(6) === point.latitude.toFixed(6) && 
            p.longitude.toFixed(6) === point.longitude.toFixed(6)
          ) === index;
        });

        return (
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4">
              GPS Coordinates ({uniqueCoordinates.length} unique points from {routeData.route.length} total)
            </h4>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b">Timestamp</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b">Latitude</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b">Longitude</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueCoordinates.map((point, index) => (
                    <tr key={point.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-gray-800 border-b">
                        {new Date(point.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-gray-800 border-b font-mono">
                        {point.latitude.toFixed(6)}
                      </td>
                      <td className="px-4 py-2 text-gray-800 border-b font-mono">
                        {point.longitude.toFixed(6)}
                      </td>
                      <td className="px-4 py-2 border-b">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          point.status === 'active' ? 'bg-green-100 text-green-700' : 
                          point.status === 'idle' ? 'bg-orange-100 text-orange-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {point.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default RouteHistoryMap;
