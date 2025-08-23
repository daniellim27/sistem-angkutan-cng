import React, { useState } from 'react';
import LiveTrackingMap from '../components/LiveTrackingMap';

// Interface for active vehicle info
interface ActiveVehicle {
  id: number;
  displayName: string;
  vehicle_id: number | null;
  device_id?: string;
}

// Interface for trail data
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
  points: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    speed: number;
    heading?: number;
    status: string;
  }>;
  pointCount: number;
  startTime: string;
  endTime: string;
  colorIndex: number;
}

// Color palette matching LiveTrackingMap
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

const getVehicleTrailColor = (index: number): string => {
  return TRAIL_COLORS[index % TRAIL_COLORS.length];
};

const LiveTracking: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'delivery'>('all');
  const [deliveryOrderId, setDeliveryOrderId] = useState<string>('');
  const [activeVehicles, setActiveVehicles] = useState<ActiveVehicle[]>([]);
  const [vehicleTrails, setVehicleTrails] = useState<VehicleTrail[]>([]);

  // Callback to receive active vehicles from the map component
  const handleActiveVehiclesUpdate = (vehicles: any[]) => {
    const vehicleList: ActiveVehicle[] = vehicles.map(vehicle => ({
      id: vehicle.id,
      displayName: vehicle.vehicle?.license_plate || `GPS Device: ${vehicle.device_id || 'Unknown'}`,
      vehicle_id: vehicle.vehicle_id,
      device_id: vehicle.device_id
    }));
    setActiveVehicles(vehicleList);
  };

  // Callback to receive trail data from the map component
  const handleTrailsUpdate = (trails: VehicleTrail[]) => {
    setVehicleTrails(trails);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Live GPS Tracking</h1>
          <p className="text-gray-600">Real-time vehicle tracking powered by Inovatracks</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setSelectedTab('all')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  selectedTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Vehicles
              </button>
              <button
                onClick={() => setSelectedTab('delivery')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  selectedTab === 'delivery'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Track Delivery
              </button>
            </nav>
          </div>

          {/* Tab Content - Filters */}
          <div className="p-4">
            {selectedTab === 'delivery' && (
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Delivery Order ID:</label>
                <input
                  type="number"
                  value={deliveryOrderId}
                  onChange={(e) => setDeliveryOrderId(e.target.value)}
                  placeholder="Enter delivery order ID"
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-500">
                  Enter a delivery order ID to track its specific route and vehicle
                </span>
              </div>
            )}

            {selectedTab === 'all' && (
              <div className="text-sm text-gray-600">
                Showing all active vehicles with GPS tracking enabled. The map updates automatically every 30 seconds.
              </div>
            )}
          </div>
        </div>

        {/* Live Tracking Map */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <LiveTrackingMap
            deliveryOrderId={selectedTab === 'delivery' && deliveryOrderId ? parseInt(deliveryOrderId) : undefined}
            autoRefresh={true}
            refreshInterval={30000} // 30 seconds
            className="h-[600px]"
            onActiveVehiclesUpdate={handleActiveVehiclesUpdate}
            onTrailsUpdate={handleTrailsUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default LiveTracking; 