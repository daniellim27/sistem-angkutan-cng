# CNG Frontend Transformation Plan

## Executive Summary

This document outlines the **frontend-specific transformation plan** for converting the existing **Angkutan Expedition App** into a **CNG (Compressed Natural Gas) Expedition App**. The transformation focuses on React components, pages, real-time tracking, SPBG management, and IoT data visualization while maintaining existing functionality.

## Current Frontend Analysis

### Existing Architecture
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + Context
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Charts**: Chart.js + React-Chartjs-2
- **Maps**: Leaflet (basic integration)

### Current Frontend Features
1. **User Management & Authentication**
   - Login/logout functionality
   - Role-based access control
   - User profile management

2. **Expedition Management**
   - Purchase Orders (PO) - CRUD operations
   - Delivery Orders (DO) - CRUD operations
   - Big Delivery Orders (BDO) - CRUD operations
   - Vehicle and Driver assignment

3. **Financial Management**
   - Deposit Groups management
   - Payment tracking
   - Driver expenses
   - Cash management
   - Invoice generation

4. **Asset Management**
   - Vehicle management
   - Tire management
   - Stock management
   - Service history

5. **Driver Operations**
   - Trip management
   - Expense submission
   - Status updates
   - Basic location tracking

## Target CNG Frontend Requirements

### Core CNG Features to Implement
1. **Live Maps & Real-time Tracking**
   - Driver location tracking every 1 minute
   - Route history visualization
   - Dynamic destination addition during trips

2. **SPBG (Gas Station) Management**
   - Deposit system for gas stations
   - Gas filling cost calculation (JISDOR rate vs Fixed cost)
   - Transaction history and balance tracking


3. **Enhanced Driver Management**
   - Expense approval workflow
   - Receipt photo uploads
   - Financial summary per trip

## Frontend Transformation Roadmap

### Phase 1: Dependencies & Setup (Week 1)

#### 1.1 New Dependencies to Install
```bash
# Maps and real-time features
npm install @react-google-maps/api
npm install react-leaflet leaflet
npm install socket.io-client

# Charts and data visualization
npm install recharts
npm install d3
npm install react-countup

# Real-time updates
npm install react-query
npm install use-socket.io

# UI enhancements
npm install @headlessui/react
npm install @heroicons/react
npm install react-hot-toast
npm install react-loading-skeleton
```

#### 1.2 Environment Configuration
**Update `.env`:**
```env
# Google Maps API
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# WebSocket configuration
REACT_APP_WEBSOCKET_URL=ws://localhost:3000

# Real-time update intervals
REACT_APP_LOCATION_UPDATE_INTERVAL=10000
REACT_APP_SENSOR_UPDATE_INTERVAL=5000
```

### Phase 2: New Pages Development (Week 2-3)

#### 2.1 SPBG Management Pages
**Files to Create:**
- `frontend/src/pages/Finance/DepositSPBG.tsx` - SPBG deposit management
- `frontend/src/pages/Finance/SPBGTransactions.tsx` - Transaction history
- `frontend/src/pages/Finance/GasFillingForm.tsx` - Gas filling form

**Example Implementation:**

```typescript
// frontend/src/pages/Finance/DepositSPBG.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import api from '../../api/axiosConfig';
import SPBGDepositForm from '../../components/Finance/SPBGDepositForm';
import SPBGBalanceCard from '../../components/Finance/SPBGBalanceCard';

interface SPBGDeposit {
  id: number;
  name: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

const DepositSPBG: React.FC = () => {
  const [selectedSPBG, setSelectedSPBG] = useState<SPBGDeposit | null>(null);
  const queryClient = useQueryClient();

  // Fetch SPBG deposits
  const { data: spbgDeposits, isLoading } = useQuery(
    'spbg-deposits',
    async () => {
      const response = await api.get('/web/spbg/deposits');
      return response.data;
    }
  );

  // Top up deposit mutation
  const topUpMutation = useMutation(
    async (data: { spbg_id: number; amount: number; notes?: string }) => {
      const response = await api.post('/web/spbg/deposit/topup', data);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Deposit topped up successfully');
        queryClient.invalidateQueries('spbg-deposits');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to top up deposit');
      }
    }
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">SPBG Deposit Management</h1>
        <p className="text-gray-600 mt-2">Manage gas station deposits and transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SPBG List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Gas Stations</h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {spbgDeposits?.map((spbg: SPBGDeposit) => (
                  <div
                    key={spbg.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSPBG?.id === spbg.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSPBG(spbg)}
                  >
                    <h3 className="font-medium text-gray-900">{spbg.name}</h3>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {spbg.balance.toLocaleString('id-ID')}
                    </p>
                    <p className="text-sm text-gray-500">
                      Last updated: {new Date(spbg.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SPBG Details & Actions */}
        <div className="lg:col-span-2">
          {selectedSPBG ? (
            <div className="space-y-6">
              <SPBGBalanceCard spbg={selectedSPBG} />
              <SPBGDepositForm
                spbgId={selectedSPBG.id}
                currentBalance={selectedSPBG.balance}
                onTopUp={topUpMutation.mutate}
                isLoading={topUpMutation.isLoading}
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Gas Station</h3>
              <p className="text-gray-500">Choose a gas station from the list to manage its deposits</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepositSPBG;
```

#### 2.2 Real-time Tracking Pages
**Files to Create:**
- `frontend/src/pages/Tracking/LiveTracking.tsx` - Real-time tracking dashboard
- `frontend/src/pages/Tracking/RouteHistory.tsx` - Route visualization
- `frontend/src/pages/Tracking/TrackingDashboard.tsx` - Overview of all active trips

**Example Implementation:**

```typescript
// frontend/src/pages/Tracking/LiveTracking.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { toast } from 'react-hot-toast';
import api from '../../api/axiosConfig';
import LiveMap from '../../components/Tracking/LiveMap';
import RouteHistory from '../../components/Tracking/RouteHistory';
import SensorDataDisplay from '../../components/IoT/SensorDataDisplay';
import TripStatusCard from '../../components/Tracking/TripStatusCard';

const LiveTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'map' | 'route' | 'sensors'>('map');

  // Fetch delivery order details
  const { data: deliveryOrder, isLoading } = useQuery(
    ['delivery-order', id],
    async () => {
      const response = await api.get(`/web/delivery-orders/${id}`);
      return response.data;
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch real-time location data
  const { data: locations } = useQuery(
    ['delivery-order-locations', id],
    async () => {
      const response = await api.get(`/web/delivery-orders/${id}/locations`);
      return response.data;
    },
    {
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  );

  // Fetch sensor data
  const { data: sensorData } = useQuery(
    ['delivery-order-sensors', id],
    async () => {
      const response = await api.get(`/web/delivery-orders/${id}/sensordata`);
      return response.data;
    },
    {
      refetchInterval: 5000, // Refresh every 5 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!deliveryOrder) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Delivery Order Not Found</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Live Tracking - {deliveryOrder.do_number}
            </h1>
            <p className="text-gray-600 mt-2">
              Customer: {deliveryOrder.customer_name} | 
              Status: <span className="font-medium">{deliveryOrder.status}</span>
            </p>
          </div>
          <TripStatusCard deliveryOrder={deliveryOrder} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'map', name: 'Live Map', icon: '🗺️' },
            { id: 'route', name: 'Route History', icon: '📍' },
            { id: 'sensors', name: 'Sensor Data', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'map' && (
          <LiveMap
            deliveryOrderId={id!}
            routeHistory={locations || []}
            currentLocation={locations?.[locations.length - 1]}
          />
        )}
        
        {activeTab === 'route' && (
          <RouteHistory
            deliveryOrderId={id!}
            locations={locations || []}
          />
        )}
        
        {activeTab === 'sensors' && (
          <SensorDataDisplay
            deliveryOrderId={id!}
            sensorData={sensorData}
          />
        )}
      </div>
    </div>
  );
};

export default LiveTracking;
```

#### 2.3 Enhanced Driver Expense Management
**Files to Create:**
- `frontend/src/pages/Finance/DriverExpense.tsx` - Driver expense management
- `frontend/src/pages/Finance/ExpenseApproval.tsx` - Expense approval workflow

### Phase 3: New Components Development (Week 3-4)

#### 3.1 Tracking Components
**Files to Create:**
- `frontend/src/components/Tracking/LiveMap.tsx` - Google Maps integration
- `frontend/src/components/Tracking/RouteHistory.tsx` - Route visualization
- `frontend/src/components/Tracking/TripStatusCard.tsx` - Trip status display
- `frontend/src/components/Tracking/LocationMarker.tsx` - Custom map markers

**Example Implementation:**

```typescript
// frontend/src/components/Tracking/LiveMap.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';

interface Location {
  id: number;
  latitude: number;
  longitude: number;
  created_at: string;
}

interface LiveMapProps {
  deliveryOrderId: string;
  routeHistory: Location[];
  currentLocation?: Location;
}

const LiveMap: React.FC<LiveMapProps> = ({ deliveryOrderId, routeHistory, currentLocation }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isAddingDestination, setIsAddingDestination] = useState(false);
  const [newDestination, setNewDestination] = useState('');

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY!,
    libraries: ['places']
  });

  const mapContainerStyle = {
    width: '100%',
    height: '600px'
  };

  const defaultCenter = {
    lat: -6.2088, // Jakarta coordinates
    lng: 106.8456
  };

  const center = routeHistory.length > 0 
    ? { lat: routeHistory[0].latitude, lng: routeHistory[0].longitude }
    : defaultCenter;

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onMapClick = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const handleAddDestination = async () => {
    if (!newDestination.trim()) {
      toast.error('Please enter a destination address');
      return;
    }

    try {
      await api.post(`/web/delivery-orders/${deliveryOrderId}/destinations`, {
        address: newDestination
      });
      
      toast.success('Destination added successfully');
      setNewDestination('');
      setIsAddingDestination(false);
      
      // Refresh the page or update the data
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add destination');
    }
  };

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-2">Map Loading Error</h3>
        <p className="text-red-700">Failed to load Google Maps. Please check your API key and try again.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Map Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Live Tracking Map</h3>
          <button
            onClick={() => setIsAddingDestination(!isAddingDestination)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Destination
          </button>
        </div>

        {/* Add Destination Form */}
        {isAddingDestination && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value)}
                placeholder="Enter destination address..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddDestination}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Add
              </button>
              <button
                onClick={() => setIsAddingDestination(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={onMapLoad}
        onClick={onMapClick}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        }}
      >
        {/* Route History Polyline */}
        {routeHistory.length > 1 && (
          <Polyline
            path={routeHistory.map(loc => ({ lat: loc.latitude, lng: loc.longitude }))}
            options={{
              strokeColor: '#3B82F6',
              strokeWeight: 4,
              strokeOpacity: 0.8,
              icons: [{
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: '#3B82F6'
                },
                offset: '50%',
                repeat: '100px'
              }]
            }}
          />
        )}

        {/* Route History Markers */}
        {routeHistory.map((location, index) => (
          <Marker
            key={location.id}
            position={{ lat: location.latitude, lng: location.longitude }}
            icon={{
              url: index === routeHistory.length - 1 ? '/current-location-marker.png' : '/route-marker.png',
              scaledSize: new google.maps.Size(20, 20)
            }}
            onClick={() => setSelectedLocation(location)}
          />
        ))}

        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
            icon={{
              url: '/driver-marker.png',
              scaledSize: new google.maps.Size(32, 32)
            }}
            title="Current Driver Location"
          />
        )}

        {/* Info Window for Selected Location */}
        {selectedLocation && (
          <InfoWindow
            position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
            onCloseClick={() => setSelectedLocation(null)}
          >
            <div className="p-2">
              <h4 className="font-medium text-gray-900">Location Details</h4>
              <p className="text-sm text-gray-600">
                Time: {new Date(selectedLocation.created_at).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default LiveMap;
```

#### 3.2 SPBG Management Components
**Files to Create:**
- `frontend/src/components/Finance/SPBGDepositForm.tsx` - Deposit form
- `frontend/src/components/Finance/SPBGBalanceCard.tsx` - Balance display
- `frontend/src/components/Finance/GasFillingForm.tsx` - Gas filling form
- `frontend/src/components/Finance/TransactionHistory.tsx` - Transaction list

#### 3.3 IoT Data Components
**Files to Create:**
- `frontend/src/components/IoT/SensorDataDisplay.tsx` - Real-time sensor display
- `frontend/src/components/IoT/SensorChart.tsx` - Sensor data charts
- `frontend/src/components/IoT/SensorGauge.tsx` - Sensor value gauges

### Phase 4: Existing Pages Modification (Week 4-5)

#### 4.1 Delivery Order Detail Page
**File to Modify:** `frontend/src/pages/DeliveryOrderDetail.tsx`

**Additions:**
- Live tracking map section
- Real-time sensor data display
- Route history visualization
- Add destination functionality

#### 4.2 Dashboard Page
**File to Modify:** `frontend/src/pages/Dashboard.tsx`

**Additions:**
- CNG-specific metrics
- Active trips tracking
- SPBG balance overview
- IoT data summary

#### 4.3 Delivery Orders List Page
**File to Modify:** `frontend/src/pages/DeliveryOrders.tsx`

**Additions:**
- Tracking status indicators
- Real-time location preview
- Quick access to live tracking

### Phase 5: Real-time Integration (Week 5-6)

#### 5.1 WebSocket Integration
**File to Create:** `frontend/src/hooks/useWebSocket.ts`

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketProps {
  deliveryOrderId?: string;
  onLocationUpdate?: (data: any) => void;
  onSensorUpdate?: (data: any) => void;
  onNotification?: (data: any) => void;
}

export const useWebSocket = ({
  deliveryOrderId,
  onLocationUpdate,
  onSensorUpdate,
  onNotification
}: UseWebSocketProps) => {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(process.env.REACT_APP_WEBSOCKET_URL!, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
      
      if (deliveryOrderId) {
        socketRef.current?.emit('join_delivery_order', deliveryOrderId);
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Event listeners
    if (onLocationUpdate) {
      socketRef.current.on('location_update', onLocationUpdate);
    }

    if (onSensorUpdate) {
      socketRef.current.on('sensor_data_update', onSensorUpdate);
    }

    if (onNotification) {
      socketRef.current.on('notification', onNotification);
    }

    socketRef.current.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }, [deliveryOrderId, onLocationUpdate, onSensorUpdate, onNotification]);

  const disconnect = useCallback(() => {
    if (deliveryOrderId && socketRef.current) {
      socketRef.current.emit('leave_delivery_order', deliveryOrderId);
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [deliveryOrderId]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    connect,
    disconnect
  };
};
```

#### 5.2 Real-time Data Hooks
**Files to Create:**
- `frontend/src/hooks/useRealTimeLocation.ts` - Location tracking hook
- `frontend/src/hooks/useRealTimeSensors.ts` - Sensor data hook
- `frontend/src/hooks/useSPBGData.ts` - SPBG data hook

### Phase 6: Testing & Optimization (Week 6)

#### 6.1 Component Testing
- Unit tests for new components
- Integration tests for real-time features
- Performance testing for maps and charts

#### 6.2 User Experience Testing
- Real-time update responsiveness
- Map interaction smoothness
- Data visualization clarity

#### 6.3 Performance Optimization
- Component memoization
- Data fetching optimization
- Map rendering optimization

## Component Architecture

### 1. Component Hierarchy
```
App
├── MainLayout
│   ├── Navigation
│   └── Content
│       ├── Dashboard
│       ├── Tracking
│       │   ├── LiveTracking
│       │   ├── RouteHistory
│       │   └── TrackingDashboard
│       ├── Finance
│       │   ├── DepositSPBG
│       │   ├── SPBGTransactions
│       │   └── DriverExpense
│       └── IoT
│           └── SensorDataDisplay
```

### 2. State Management
- React Query for server state
- React Context for global state
- Local state for component-specific data
- WebSocket for real-time updates

### 3. Data Flow
1. **Initial Load**: Fetch data via React Query
2. **Real-time Updates**: WebSocket events update local state
3. **User Actions**: Mutations update server state
4. **Optimistic Updates**: Immediate UI feedback

## Styling & UI/UX

### 1. Design System
- Consistent color scheme
- Responsive grid layouts
- Interactive elements
- Loading states and skeletons

### 2. Responsive Design
- Mobile-first approach
- Tablet and desktop optimization
- Touch-friendly interactions

### 3. Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast options

## Performance Considerations

### 1. Map Performance
- Marker clustering for large datasets
- Lazy loading of map tiles
- Efficient polyline rendering
- Debounced location updates

### 2. Data Performance
- Pagination for large datasets
- Virtual scrolling for long lists
- Efficient chart rendering
- Optimized re-renders

### 3. Real-time Performance
- WebSocket connection management
- Efficient event handling
- Memory leak prevention
- Connection recovery

## Security & Validation

### 1. Input Validation
- Form validation
- Data sanitization
- XSS prevention
- CSRF protection

### 2. Authentication
- JWT token management
- Role-based access control
- Secure API calls
- Session management

## Conclusion

This frontend transformation plan provides a comprehensive roadmap for implementing CNG-specific features in the React application. The phased approach ensures:

1. **Progressive enhancement** of existing functionality
2. **Real-time user experience** with live tracking and IoT data
3. **Modern UI/UX** with responsive design and accessibility
4. **Performance optimization** for complex data visualization
5. **Maintainable codebase** with proper component architecture

By following this plan, the frontend will support:
- Real-time driver tracking with interactive maps
- SPBG management with intuitive forms and dashboards
- IoT data visualization with charts and gauges
- Enhanced expense management workflows
- Responsive design for all device types

The next step is to proceed with the mobile app transformation plan to complete the full CNG expedition system.
