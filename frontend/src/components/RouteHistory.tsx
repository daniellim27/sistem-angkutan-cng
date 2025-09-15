import React, { useState, useEffect, useRef } from 'react';
import RouteHistoryMap from './RouteHistoryMap';
import { authClient } from '../api/axiosConfig';

// Interface for vehicle with GPS data
interface VehicleWithGPS {
  vehicle_id: number | null;
  device_id: string;
  display_name: string;
  license_plate: string | null;
  vehicle_type: string;
  vehicle_status: string;
  last_update: string;
  total_points: number;
  has_vehicle_record: boolean;
}

// Interface for route history filters
interface RouteFilters {
  selectedVehicle: VehicleWithGPS | null;
  startDate: string;
  endDate: string;
  timeRange: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
}

const RouteHistory: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleWithGPS[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RouteFilters>({
    selectedVehicle: null,
    startDate: '',
    endDate: '',
    timeRange: 'today'
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to group vehicles by license plate and aggregate GPS points
  // Only include vehicles with proper license plates for route history
  const groupVehiclesByPlate = (vehicles: VehicleWithGPS[]): VehicleWithGPS[] => {
    // First, filter out vehicles without license plates
    const vehiclesWithPlates = vehicles.filter(vehicle => 
      vehicle.license_plate && 
      vehicle.license_plate.trim() !== '' &&
      !vehicle.license_plate.startsWith('Vehicle_') // Exclude generic device IDs
    );

    const grouped = new Map<string, VehicleWithGPS>();

    vehiclesWithPlates.forEach(vehicle => {
      const key = vehicle.license_plate!; // Use license plate as key (we know it exists now)
      
      if (grouped.has(key)) {
        // Aggregate existing vehicle data
        const existing = grouped.get(key)!;
        existing.total_points += vehicle.total_points;
        
        // Keep the most recent update time
        if (new Date(vehicle.last_update) > new Date(existing.last_update)) {
          existing.last_update = vehicle.last_update;
          existing.device_id = vehicle.device_id; // Use most recent device_id
          existing.vehicle_id = vehicle.vehicle_id || existing.vehicle_id; // Prefer non-null vehicle_id
        }
        
        // Update display name to show license plate and type
        existing.display_name = `${vehicle.license_plate} (${vehicle.vehicle_type || 'Unknown'})`;
      } else {
        // Add new vehicle with proper display name
        const newVehicle = { ...vehicle };
        newVehicle.display_name = `${vehicle.license_plate} (${vehicle.vehicle_type || 'Unknown'})`;
        grouped.set(key, newVehicle);
      }
    });

    return Array.from(grouped.values()).sort((a, b) => {
      // Sort by license plate alphabetically
      return a.license_plate!.localeCompare(b.license_plate!);
    });
  };

  // Set default dates based on time range
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    switch (filters.timeRange) {
      case 'today':
        setFilters(prev => ({ ...prev, startDate: today, endDate: today }));
        break;
      case 'yesterday':
        setFilters(prev => ({ ...prev, startDate: yesterday, endDate: yesterday }));
        break;
      case 'week':
        setFilters(prev => ({ ...prev, startDate: weekAgo, endDate: today }));
        break;
      case 'month':
        setFilters(prev => ({ ...prev, startDate: monthAgo, endDate: today }));
        break;
      default:
        // Custom - don't auto-set dates
        break;
    }
  }, [filters.timeRange]);

  // Fetch vehicles with GPS data
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        
        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('Authentication required. Please log in to view GPS tracking data.');
        }
        const response = await authClient.get('/tracking/vehicles-with-gps?timeWindow=168', {
          signal: abortControllerRef.current.signal
        });
        const result = response.data;
        
        if (result.success) {
          // Group vehicles by license plate and aggregate GPS points
          const groupedVehicles = groupVehiclesByPlate(result.data);
          setVehicles(groupedVehicles);
          
          // Auto-select first vehicle if available and none selected
          if (groupedVehicles.length > 0 && !filters.selectedVehicle) {
            setFilters(prev => ({ ...prev, selectedVehicle: groupedVehicles[0] }));
          }
        } else {
          throw new Error(result.message || 'Failed to fetch vehicles');
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          return; // Request was cancelled
        }
        console.error('Error fetching vehicles:', err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => 
      (v.vehicle_id?.toString() === vehicleId) || 
      (v.device_id === vehicleId) ||
      (v.license_plate === vehicleId)
    );
    setFilters(prev => ({ ...prev, selectedVehicle: vehicle || null }));
  };

  const handleTimeRangeChange = (timeRange: RouteFilters['timeRange']) => {
    setFilters(prev => ({ ...prev, timeRange }));
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [field]: value,
      timeRange: 'custom' 
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading vehicles with GPS data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Route History Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vehicle
            </label>
            <select
              value={filters.selectedVehicle ? 
                (filters.selectedVehicle.license_plate || filters.selectedVehicle.device_id) : ''}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a vehicle...</option>
              {vehicles.map((vehicle) => (
                <option 
                  key={vehicle.license_plate || vehicle.device_id} 
                  value={vehicle.license_plate || vehicle.device_id}
                >
                  {vehicle.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Quick Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <select
              value={filters.timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value as RouteFilters['timeRange'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Start Date - Only show when custom range is selected */}
          {filters.timeRange === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* End Date - Only show when custom range is selected */}
          {filters.timeRange === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Selected Vehicle Info */}
        {filters.selectedVehicle && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Selected Vehicle</h4>
            <div className="text-sm text-blue-800">
              <p><strong>Vehicle:</strong> {filters.selectedVehicle.display_name}</p>
              <p><strong>Type:</strong> {filters.selectedVehicle.vehicle_type}</p>
              <p><strong>Status:</strong> {filters.selectedVehicle.vehicle_status}</p>
              <p><strong>Last Update:</strong> {new Date(filters.selectedVehicle.last_update).toLocaleString()}</p>
              <p><strong>GPS Points Available:</strong> {filters.selectedVehicle.total_points}</p>
            </div>
          </div>
        )}
      </div>

      {/* Route Map */}
      {filters.selectedVehicle && filters.startDate && filters.endDate && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Preview</h3>
          <RouteHistoryMap
            vehicleId={filters.selectedVehicle.vehicle_id}
            deviceId={filters.selectedVehicle.device_id}
            startDate={filters.startDate}
            endDate={filters.endDate}
            className="h-[600px]"
          />
        </div>
      )}

      {/* No Vehicle Selected */}
      {!filters.selectedVehicle && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Vehicle</h3>
            <p className="text-gray-600">
              Choose a vehicle from the dropdown above to view its historical GPS routes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteHistory;
