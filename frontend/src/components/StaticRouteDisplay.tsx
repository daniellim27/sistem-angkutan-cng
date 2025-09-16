import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

interface RouteInfo {
  coordinates: [number, number][];
  distance: number;
  duration: number;
}

interface StaticRouteDisplayProps {
  waypoints: L.LatLng[];
  routeColor?: string;
  onRouteLoaded?: (route: RouteInfo) => void;
  showRouteInfo?: boolean;
}

// Simple in-memory cache for route calculations
const routeCache = new Map<string, RouteInfo>();

const StaticRouteDisplay: React.FC<StaticRouteDisplayProps> = ({
  waypoints,
  routeColor = '#3b82f6',
  onRouteLoaded,
  showRouteInfo = true
}) => {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Create a stable waypoints key for caching
  const waypointsKey = useMemo(() => {
    if (waypoints.length < 2) return null;
    return waypoints
      .map(wp => `${wp.lat.toFixed(6)},${wp.lng.toFixed(6)}`)
      .join('|');
  }, [waypoints]);

  // Stable callback for route loading
  const handleRouteLoaded = useCallback((route: RouteInfo) => {
    if (onRouteLoaded) {
      onRouteLoaded(route);
    }
  }, [onRouteLoaded]);

  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteCoordinates([]);
      setRouteInfo(null);
      hasLoadedRef.current = false;
      return;
    }

    // Check cache first
    if (waypointsKey && routeCache.has(waypointsKey)) {
      const cachedRoute = routeCache.get(waypointsKey)!;
      setRouteCoordinates(cachedRoute.coordinates);
      setRouteInfo(cachedRoute);
      // console.log('📋 Using cached route for waypoints:', waypointsKey); // Reduced logging
      
      if (!hasLoadedRef.current) {
        handleRouteLoaded(cachedRoute);
        hasLoadedRef.current = true;
      }
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);

      try {
        // Format waypoints for OSRM API
        const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

        // console.log('🗺️ Fetching route from OSRM:', osrmUrl); // Reduced logging

        const response = await fetch(osrmUrl);
        if (!response.ok) {
          throw new Error(`OSRM API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates: [number, number][] = route.geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] // Convert [lng, lat] to [lat, lng]
          );

          const routeInfo: RouteInfo = {
            coordinates,
            distance: route.distance,
            duration: route.duration
          };

          // Cache the route
          if (waypointsKey) {
            routeCache.set(waypointsKey, routeInfo);
            // console.log('💾 Cached route for waypoints:', waypointsKey); // Reduced logging
          }

          setRouteCoordinates(coordinates);
          setRouteInfo(routeInfo);

          // console.log('✅ Route fetched successfully:', {
          //   distance: `${(route.distance / 1000).toFixed(2)} km`,
          //   duration: `${Math.round(route.duration / 60)} minutes`,
          //   points: coordinates.length
          // }); // Reduced logging

          if (!hasLoadedRef.current) {
            handleRouteLoaded(routeInfo);
            hasLoadedRef.current = true;
          }
        } else {
          throw new Error(data.message || 'No route found');
        }
      } catch (err: any) {
        console.error('❌ Error fetching route:', err);
        setError(err.message || 'Failed to fetch route');
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [waypointsKey, handleRouteLoaded]); // Only depend on waypointsKey and stable callback

  if (loading) {
      // console.log('🔄 Loading route...'); // Reduced logging
  }

  if (error) {
    console.error('Route error:', error);
    return null;
  }

  if (routeCoordinates.length === 0) {
    return null;
  }

  return (
    <Polyline
      positions={routeCoordinates}
      pathOptions={{
        color: routeColor,
        weight: 6,
        opacity: 0.8,
        dashArray: undefined // Solid line
      }}
    >
      {showRouteInfo && routeInfo && (
        <Popup>
          <div className="p-2">
            <h4 className="font-semibold text-blue-600 mb-2">Delivery Route</h4>
            <div className="text-sm space-y-1">
              <div><strong>Distance:</strong> {(routeInfo.distance / 1000).toFixed(2)} km</div>
              <div><strong>Duration:</strong> {Math.round(routeInfo.duration / 60)} minutes</div>
              <div><strong>Waypoints:</strong> {waypoints.length}</div>
              <div className="text-xs text-gray-500 mt-2">
                Route calculated once using OSRM
              </div>
            </div>
          </div>
        </Popup>
      )}
    </Polyline>
  );
};

export default StaticRouteDisplay;
