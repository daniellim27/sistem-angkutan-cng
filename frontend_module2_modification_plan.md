# Frontend Module 2: Modification Plan for CNG Transformation

## Overview
This document outlines the **modification plan** for the existing **Angkutan Expedition App** frontend to transform it into a **CNG (Compressed Natural Gas) Expedition App**. Instead of creating new pages from scratch, we'll modify existing components and pages to add CNG-specific functionality.

## Current Frontend Analysis

### Existing Architecture
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + Context
- **Routing**: React Router DOM
- **HTTP Client**: Axios with interceptors
- **Charts**: Chart.js + React-Chartjs-2
- **Maps**: Leaflet (basic integration)
- **Notifications**: React Hot Toast
- **Date Handling**: Day.js + React Datepicker
- **File Handling**: XLSX, JSPDF

### Current Navigation Structure (MainLayout.tsx)
```
📊 Dashboard
📊 Dashboard Ritase
💰 Payments
📩 Deposit Payments
📋 Purchase Orders
🚚 Delivery Orders
🚛 Big DOs
🚛 Manajemen Kendaraan
🛞 Manajemen Ban
👨‍💼 Manajemen Supir
🔧 Riwayat Servis
📦 Manajemen Stok
🛞 Inventaris Ban
🔄 Ban Bekas
💰 Buku Kas
🤬 Buku Tempo
```

## CNG Transformation Modifications

### 1. Renaming & Terminology Updates

#### 1.1 Update Application Title and Branding
**File**: `frontend/src/components/MainLayout.tsx`

**Change application title:**
```typescript
// Change from "Angkutan Sys" to "CNG Angkutan Sys"
<h1
  className={`text-2xl font-bold ${
    sidebarMinimized ? "hidden" : "block"
  }`}
>
  CNG Angkutan Sys
</h1>
```

**Update page titles for CNG context:**
```typescript
const getPageTitle = () => {
  const path = location.pathname;
  if (path === "/") return "CNG Dashboard";
  if (path.startsWith("/trips")) return "CNG Purchase Orders";
  if (path.startsWith("/delivery-orders")) return "CNG Delivery Orders";
  if (path.startsWith("/big-dos")) return "CNG Big Delivery Orders";
  if (path.startsWith("/vehicles")) return "CNG Fleet Management";
  if (path.startsWith("/drivers")) return "CNG Driver Management";
  if (path.startsWith("/stock")) return "CNG Inventory Management";
  if (path.startsWith("/cash")) return "CNG Financial Management";
  // ... rest of existing logic
};
```

#### 1.2 Rename Navigation Sections
**Update section headers to reflect CNG operations:**
```typescript
{/* Change from "Operasional" to "CNG Operations" */}
{!sidebarMinimized && (
  <li className="mb-2">
    <div className="text-xs uppercase text-gray-400 font-semibold mb-2 px-2">
      Operasi CNG
    </div>
  </li>
)}

{/* Change from "Manajemen Armada" to "CNG Fleet Management" */}
{!sidebarMinimized && (
  <li className="mb-2 mt-6">
    <div className="text-xs uppercase text-gray-400 font-semibold mb-2 px-2">
      Manajemen Armada CNG
    </div>
  </li>
)}

{/* Change from "Inventaris" to "CNG Inventory" */}
{!sidebarMinimized && (
  <li className="mb-2 mt-6">
    <div className="text-xs uppercase text-gray-400 font-semibold mb-2 px-2">
      Inventaris CNG
    </div>
  </li>
)}

{/* Change from "Akuntansi" to "CNG Financial" */}
{!sidebarMinimized && (
  <li className="mb-2 mt-6">
    <div className="text-xs uppercase text-gray-400 font-semibold mb-2 px-2">
      Keuangan CNG
    </div>
  </li>
)}
```

#### 1.3 Update Navigation Item Labels
**Rename specific navigation items:**
```typescript
{/* Change "Purchase Orders" to "CNG Purchase Orders" */}
<span className={`${sidebarMinimized ? "hidden" : "block"}`}>
  CNG Purchase Orders
</span>

{/* Change "Delivery Orders" to "CNG Delivery Orders" */}
<span className={`${sidebarMinimized ? "hidden" : "block"}`}>
  CNG Delivery Orders
</span>

{/* Change "Big DOs" to "CNG Big DOs" */}
<span className={`${sidebarMinimized ? "hidden" : "block"}`}>
  CNG Big DOs
</span>

{/* Change "Manajemen Kendaraan" to "CNG Fleet Management" */}
<span className={`${sidebarMinimized ? "hidden" : "block"}`}>
  CNG Fleet Management
</span>

{/* Change "Manajemen Supir" to "CNG Driver Management" */}
<span className={`${sidebarMinimized ? "hidden" : "block"}`}>
  CNG Driver Management
</span>

{/* Change "Manajemen Stok" to "CNG Inventory" */}
<span className={`${sidebarMinimized ? "hidden" : "block"}`}>
  CNG Inventory
</span>

{/* Change "Buku Kas" to "CNG Cash Book" */}
<span className={`${sidebarMinimized ? "hidden" : "block"}`}>
  CNG Cash Book
</span>
```

#### 1.4 Update Page Headers and Labels
**File**: `frontend/src/pages/DeliveryOrders.tsx`

**Change page header:**
```typescript
// Change from "Delivery Orders" to "CNG Delivery Orders"
<div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold text-gray-900">
    CNG Delivery Orders
  </h1>
  {/* ... rest of header */}
</div>
```

**Update table headers:**
```typescript
// Change "Status" to "CNG Status"
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  CNG Status
</th>

// Change "Actions" to "CNG Actions"
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  CNG Actions
</th>
```

**File**: `frontend/src/pages/Vehicles.tsx`

**Update page title:**
```typescript
// Change from "Manajemen Kendaraan" to "CNG Fleet Management"
<div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold text-gray-900">
    CNG Fleet Management
  </h1>
  {/* ... rest of header */}
</div>
```

**Update vehicle card labels:**
```typescript
// Change "Capacity" to "CNG Capacity"
<span className="text-sm text-gray-600">
  CNG Capacity: {vehicle.cng_capacity || vehicle.capacity}
</span>

// Change "Type" to "CNG Vehicle Type"
<span className="text-sm text-gray-600">
  CNG Vehicle Type: {vehicle.type}
</span>
```

**File**: `frontend/src/pages/Drivers.tsx`

**Update page title:**
```typescript
// Change from "Manajemen Supir" to "CNG Driver Management"
<div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold text-gray-900">
    CNG Driver Management
  </h1>
  {/* ... rest of header */}
</div>
```

**Update table headers:**
```typescript
// Change "Status" to "CNG Status"
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  CNG Status
</th>

// Change "Vehicle Assignment" to "CNG Vehicle Assignment"
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  CNG Vehicle Assignment
</th>
```

#### 1.5 Update Form Labels and Placeholders
**File**: `frontend/src/pages/DeliveryOrderCreatePage.tsx`

**Update form section headers:**
```typescript
// Change "Delivery Information" to "CNG Delivery Information"
<div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">
    CNG Delivery Information
  </h3>
  {/* ... form fields */}
</div>

// Change "Financial Information" to "CNG Financial Information"
<div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">
    CNG Financial Information
  </h3>
  {/* ... form fields */}
</div>
```

**Update field labels:**
```typescript
// Change "Load Quantity" to "CNG Load Quantity"
<label className="block text-sm font-medium text-gray-700 mb-2">
  CNG Load Quantity ({getUnitDisplay(unit)})
</label>

// Change "Unit Price" to "CNG Unit Price"
<label className="block text-sm font-medium text-gray-700 mb-2">
  CNG Unit Price (Rp/{getUnitDisplay(unit)})
</label>

// Change "Trip Allowance" to "CNG Trip Allowance"
<label className="block text-sm font-medium text-gray-700 mb-2">
  CNG Trip Allowance
</label>
```

#### 1.6 Update Status and Filter Labels
**File**: `frontend/src/pages/DeliveryOrders.tsx`

**Update status filter labels:**
```typescript
// Change status labels to CNG context
const statusOptions = [
  { value: "all", label: "All CNG Statuses" },
  { value: "assigned", label: "CNG Assigned" },
  { value: "in_progress", label: "CNG In Progress" },
  { value: "completed", label: "CNG Completed" },
  { value: "cancelled", label: "CNG Cancelled" }
];
```

**Update search placeholder:**
```typescript
// Change search placeholder
<input
  type="text"
  placeholder="Search CNG delivery orders..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

#### 1.7 Update Button and Action Labels
**Update action button text:**
```typescript
// Change "Create New" to "Create New CNG Order"
<Link
  to="/delivery-orders/create"
  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
>
  Create New CNG Order
</Link>

// Change "Edit" to "Edit CNG Order"
<button
  onClick={() => handleEdit(order.id)}
  className="text-blue-600 hover:text-blue-900 text-sm font-medium mr-3"
  title="Edit CNG Order"
>
  ✏️ Edit CNG Order
</button>

// Change "Delete" to "Delete CNG Order"
<button
  onClick={() => handleDelete(order.id)}
  className="text-red-600 hover:text-red-900 text-sm font-medium"
  title="Delete CNG Order"
>
  🗑️ Delete CNG Order
</button>
```

#### 1.8 Update Modal and Dialog Titles
**File**: `frontend/src/components/AssignDriverModal.tsx`

**Update modal title:**
```typescript
// Change from "Assign Driver" to "Assign CNG Driver"
<div className="flex justify-between items-center mb-4">
  <h2 className="text-xl font-bold text-gray-900">
    Assign CNG Driver
  </h2>
  {/* ... close button */}
</div>
```

**Update form labels:**
```typescript
// Change "Select Driver" to "Select CNG Driver"
<label className="block text-sm font-medium text-gray-700 mb-2">
  Select CNG Driver
</label>

// Change "Select Vehicle" to "Select CNG Vehicle"
<label className="block text-sm font-medium text-gray-700 mb-2">
  Select CNG Vehicle
</label>
```

#### 1.9 Update Error and Success Messages
**Update toast messages:**
```typescript
// Change success messages
toast.success('CNG delivery order created successfully!');
toast.success('CNG driver assigned successfully!');
toast.success('CNG vehicle updated successfully!');

// Change error messages
toast.error('Failed to create CNG delivery order');
toast.error('Failed to assign CNG driver');
toast.error('Failed to update CNG vehicle');

// Change confirmation messages
if (window.confirm('Are you sure you want to delete this CNG delivery order?')) {
  // ... delete logic
}
```

#### 1.10 Update Dashboard Labels
**File**: `frontend/src/pages/Dashboard.tsx`

**Update dashboard section headers:**
```typescript
// Change "Recent Activities" to "Recent CNG Activities"
<h3 className="text-lg font-semibold text-gray-900 mb-4">
  Recent CNG Activities
</h3>

// Change "Quick Actions" to "CNG Quick Actions"
<h3 className="text-lg font-semibold text-gray-900 mb-4">
  CNG Quick Actions
</h3>

// Change "Statistics" to "CNG Statistics"
<h3 className="text-lg font-semibold text-gray-900 mb-4">
  CNG Statistics
</h3>
```

### 2. Navigation & Layout Modifications

#### 2.1 Add CNG-Specific Navigation Items
**File**: `frontend/src/components/MainLayout.tsx`

**Add new navigation section after "Akuntansi":**
```typescript
{/* CNG Operations Section */}
{!sidebarMinimized && (
  <li className="mb-2 mt-6">
    <div className="text-xs uppercase text-gray-400 font-semibold mb-2 px-2">
      Operasi CNG
    </div>
  </li>
)}
<li className="mb-4">
  <Link
    to="/spbg-management"
    className={`flex items-center p-2 rounded hover:bg-gray-700 ${
      isActiveLink("/spbg-management")
        ? "bg-gray-700 border-l-4 border-blue-500"
        : ""
    }`}
    title="Manajemen SPBG"
  >
    <span className="text-xl mr-3">⛽</span>
    <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
      Manajemen SPBG
    </span>
  </Link>
</li>
<li className="mb-4">
  <Link
    to="/live-tracking"
    className={`flex items-center p-2 rounded hover:bg-gray-700 ${
      isActiveLink("/live-tracking")
        ? "bg-gray-700 border-l-4 border-blue-500"
        : ""
    }`}
    title="Live Tracking"
  >
    <span className="text-xl mr-3">📍</span>
    <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
      Live Tracking
    </span>
  </Link>
</li>
<li className="mb-4">
  <Link
    to="/iot-dashboard"
    className={`flex items-center p-2 rounded hover:bg-gray-700 ${
      isActiveLink("/iot-dashboard")
        ? "bg-gray-700 border-l-4 border-blue-500"
        : ""
    }`}
    title="IoT Dashboard"
  >
    <span className="text-xl mr-3">📡</span>
    <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
      IoT Dashboard
    </span>
  </Link>
</li>
```

#### 2.2 Update Page Title Logic
**Modify `getPageTitle()` function:**
```typescript
const getPageTitle = () => {
  const path = location.pathname;
  if (path === "/") return "Dashboard";
  if (path.startsWith("/spbg-management")) return "Manajemen SPBG";
  if (path.startsWith("/live-tracking")) return "Live Tracking CNG";
  if (path.startsWith("/iot-dashboard")) return "IoT Dashboard";
  // ... existing logic
};
```

### 3. Existing Page Modifications

#### 3.1 DeliveryOrders.tsx - Add CNG Tracking Features
**File**: `frontend/src/pages/DeliveryOrders.tsx`

**Add CNG-specific fields to DeliveryOrder interface:**
```typescript
interface DeliveryOrder {
  // ... existing fields
  cng_data?: {
    gas_filled_volume?: number; // m³
    gas_filled_cost?: number;
    spbg_location?: string;
    filling_method?: 'jisdor' | 'fixed';
    iot_sensor_data?: {
      pressure?: number;
      temperature?: number;
      meter_pulse?: number;
      last_update?: string;
    };
  };
  tracking_status?: 'idle' | 'loading' | 'in_transit' | 'unloading' | 'completed';
  current_location?: {
    lat: number;
    lng: number;
    timestamp: string;
    speed?: number;
  };
}
```

**Add CNG status column to the table:**
```typescript
// Add after existing columns
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  CNG Status
</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  Live Location
</th>

// Add corresponding table cells
<td className="px-6 py-4 whitespace-nowrap">
  <CNGStatusBadge 
    gasVolume={order.cng_data?.gas_filled_volume}
    trackingStatus={order.tracking_status}
  />
</td>
<td className="px-6 py-4 whitespace-nowrap">
  {order.current_location ? (
    <button
      onClick={() => handleViewLiveLocation(order.id)}
      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
    >
      📍 View Live
    </button>
  ) : (
    <span className="text-gray-400 text-sm">No data</span>
  )}
</td>
```

**Add CNG tracking actions:**
```typescript
// Add to action buttons
<button
  onClick={() => handleViewCNGDetails(order.id)}
  className="text-green-600 hover:text-green-900 text-sm font-medium mr-3"
  title="View CNG Details"
>
  ⛽ CNG Details
</button>
```

#### 3.2 Vehicles.tsx - Add CNG Vehicle Information
**File**: `frontend/src/pages/Vehicles.tsx`

**Extend Vehicle interface:**
```typescript
interface Vehicle {
  // ... existing fields
  cng_capacity?: number; // m³
  cng_tank_type?: string;
  cng_safety_features?: string[];
  last_cng_fill?: string;
  cng_efficiency?: number; // km/m³
  iot_device_id?: string;
}
```

**Add CNG information to vehicle cards:**
```typescript
// Add CNG info section to vehicle display
{vehicle.cng_capacity && (
  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
    <div className="flex items-center text-sm text-blue-700">
      <span className="mr-2">⛽</span>
      <span>CNG Capacity: {vehicle.cng_capacity} m³</span>
    </div>
    {vehicle.last_cng_fill && (
      <div className="text-xs text-blue-600 mt-1">
        Last Fill: {new Date(vehicle.last_cng_fill).toLocaleDateString()}
      </div>
    )}
  </div>
)}
```

#### 3.3 Drivers.tsx - Add CNG Driver Status
**File**: `frontend/src/pages/Drivers.tsx`

**Extend Driver interface:**
```typescript
interface DriverProfile {
  // ... existing fields
  cng_certification?: string;
  cng_training_date?: string;
  current_trip_id?: number;
  last_location_update?: string;
  device_status?: 'online' | 'offline' | 'error';
}
```

**Add CNG status display:**
```typescript
// Add CNG status column
<td className="px-6 py-4 whitespace-nowrap">
  <div className="flex flex-col">
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      driver.driverProfile.device_status === 'online' 
        ? 'bg-green-100 text-green-800' 
        : driver.driverProfile.device_status === 'error'
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-800'
    }`}>
      {driver.driverProfile.device_status === 'online' ? '🟢' : 
       driver.driverProfile.device_status === 'error' ? '🔴' : '⚪'} 
      {driver.driverProfile.device_status || 'offline'}
    </span>
    {driver.driverProfile.cng_certification && (
      <span className="text-xs text-blue-600 mt-1">
        ⛽ {driver.driverProfile.cng_certification}
      </span>
    )}
  </div>
</td>
```

#### 3.4 CashManagement.tsx - Add CNG Financial Categories
**File**: `frontend/src/pages/CashManagement.tsx`

**Add CNG-specific transaction categories:**
```typescript
// Add to existing categories or create new ones
const cngCategories = [
  { id: 'cng_fuel', name: 'CNG Fuel Purchase', type: 'expense' },
  { id: 'cng_deposit', name: 'SPBG Deposit', type: 'expense' },
  { id: 'cng_refund', name: 'SPBG Refund', type: 'income' },
  { id: 'cng_maintenance', name: 'CNG Equipment Maintenance', type: 'expense' },
  { id: 'cng_insurance', name: 'CNG Insurance', type: 'expense' }
];
```

**Add CNG transaction type filter:**
```typescript
// Add to filters state
const [filters, setFilters] = useState({
  // ... existing filters
  cng_only: false, // New filter for CNG transactions
});

// Add filter UI
<div className="flex items-center space-x-4">
  {/* ... existing filters */}
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={filters.cng_only}
      onChange={(e) => setFilters(prev => ({ ...prev, cng_only: e.target.checked }))}
      className="mr-2"
    />
    CNG Transactions Only
  </label>
</div>
```

### 4. New Component Modifications

#### 4.1 Create CNGStatusBadge Component
**File**: `frontend/src/components/ui/CNGStatusBadge.tsx`

```typescript
import React from "react";

interface CNGStatusBadgeProps {
  gasVolume?: number;
  trackingStatus?: string;
  pressure?: number;
  temperature?: number;
}

const CNGStatusBadge: React.FC<CNGStatusBadgeProps> = ({
  gasVolume,
  trackingStatus,
  pressure,
  temperature
}) => {
  const getStatusConfig = () => {
    if (!trackingStatus) return { bg: "bg-gray-100", text: "text-gray-700", icon: "❓" };
    
    const configs = {
      idle: { bg: "bg-gray-100", text: "text-gray-700", icon: "⏸️" },
      loading: { bg: "bg-blue-100", text: "text-blue-700", icon: "⛽" },
      in_transit: { bg: "bg-green-100", text: "text-green-700", icon: "🚛" },
      unloading: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "📦" },
      completed: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "✅" }
    };
    
    return configs[trackingStatus as keyof typeof configs] || configs.idle;
  };

  const config = getStatusConfig();

  return (
    <div className="flex flex-col space-y-1">
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <span>{config.icon}</span>
        <span>{trackingStatus?.replace('_', ' ') || 'Unknown'}</span>
      </span>
      {gasVolume && (
        <span className="text-xs text-gray-600">
          Gas: {gasVolume} m³
        </span>
      )}
      {pressure && temperature && (
        <span className="text-xs text-gray-500">
          {pressure} bar, {temperature}°C
        </span>
      )}
    </div>
  );
};

export default CNGStatusBadge;
```

#### 4.2 Create LiveLocationModal Component
**File**: `frontend/src/components/LiveLocationModal.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import apiClient from '../api/axiosConfig';

interface LiveLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryOrderId: number;
}

const LiveLocationModal: React.FC<LiveLocationModalProps> = ({
  isOpen,
  onClose,
  deliveryOrderId
}) => {
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    timestamp: string;
    speed?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && deliveryOrderId) {
      fetchLiveLocation();
      const interval = setInterval(fetchLiveLocation, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, deliveryOrderId]);

  const fetchLiveLocation = async () => {
    try {
      const response = await apiClient.get(`/delivery-orders/${deliveryOrderId}/live-location`);
      setLocation(response.data);
    } catch (error) {
      console.error('Failed to fetch live location:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 h-5/6 max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Live Location - DO #{deliveryOrderId}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : location ? (
          <div className="h-full">
            <MapContainer
              center={[location.lat, location.lng]}
              zoom={13}
              className="h-full w-full rounded-lg"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[location.lat, location.lng]}>
                <Popup>
                  <div>
                    <strong>Current Location</strong><br />
                    Lat: {location.lat.toFixed(6)}<br />
                    Lng: {location.lng.toFixed(6)}<br />
                    Time: {new Date(location.timestamp).toLocaleString()}<br />
                    {location.speed && `Speed: ${location.speed} km/h`}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        ) : (
          <div className="text-center text-gray-500 h-64 flex items-center justify-center">
            No location data available
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveLocationModal;
```

### 5. API Integration Modifications

#### 5.1 Update axiosConfig.ts for CNG Endpoints
**File**: `frontend/src/api/axiosConfig.ts`

**Add CNG-specific API endpoints:**
```typescript
// Add to existing interceptors or create new ones for CNG endpoints
const cngEndpoints = [
  '/spbg/',
  '/iot/',
  '/tracking/',
  '/cng-delivery-orders/'
];

// Update response interceptor to handle CNG endpoints
apiClient.interceptors.response.use(
  (response) => {
    // Skip interceptor for endpoints that need full response with pagination/stats
    if (
      response.config.url?.includes("/cash/") ||
      response.config.url?.includes("/big-delivery-orders") ||
      response.config.url?.includes("/trips") ||
      response.config.url?.includes("/purchase-orders") ||
      response.config.url?.includes("/payments") ||
      response.config.url?.includes("/delivery-orders") ||
      // Add CNG endpoints
      cngEndpoints.some(endpoint => response.config.url?.includes(endpoint))
    ) {
      return response; // Return full response for these endpoints
    }
    // ... rest of existing logic
  },
  // ... error handling
);
```

#### 5.2 Create CNG API Service
**File**: `frontend/src/api/cngApi.ts`

```typescript
import apiClient from './axiosConfig';

export const cngApi = {
  // SPBG Management
  getSPBGDeposits: () => apiClient.get('/spbg/deposits'),
  topUpDeposit: (data: { spbg_id: number; amount: number }) => 
    apiClient.post('/spbg/deposit/topup', data),
  getSPBGTransactions: (spbgId: number) => 
    apiClient.get(`/spbg/deposit/${spbgId}/transactions`),
  
  // Gas Filling
  recordGasFilling: (data: {
    delivery_order_id: number;
    spbg_id: number;
    volume: number;
    method: 'jisdor' | 'fixed';
    cost: number;
  }) => apiClient.post('/spbg/fill', data),
  
  // Live Tracking
  getLiveLocation: (deliveryOrderId: number) => 
    apiClient.get(`/delivery-orders/${deliveryOrderId}/live-location`),
  getLocationHistory: (deliveryOrderId: number) => 
    apiClient.get(`/delivery-orders/${deliveryOrderId}/locations`),
  
  // IoT Data
  getSensorData: (deliveryOrderId: number) => 
    apiClient.get(`/delivery-orders/${deliveryOrderId}/sensordata`),
  getLatestSensorReadings: () => apiClient.get('/iot/latest-readings'),
  
  // CNG Delivery Orders
  getCNGDeliveryOrders: (filters?: any) => 
    apiClient.get('/cng-delivery-orders', { params: filters }),
  updateCNGStatus: (deliveryOrderId: number, status: string) => 
    apiClient.patch(`/cng-delivery-orders/${deliveryOrderId}/status`, { status }),
};
```

### 6. Route Modifications

#### 6.1 Add CNG Routes to App.tsx
**File**: `frontend/src/App.tsx`

**Add new CNG routes:**
```typescript
// Add imports for new CNG pages
import SPBGManagement from "./pages/SPBGManagement";
import LiveTracking from "./pages/LiveTracking";
import IoTDashboard from "./pages/IoTDashboard";

// Add routes inside the MainLayout
<Route path="spbg-management" element={<SPBGManagement />} />
<Route path="live-tracking" element={<LiveTracking />} />
<Route path="iot-dashboard" element={<IoTDashboard />} />
```

### 7. State Management Modifications

#### 7.1 Update AuthContext for CNG User Roles
**File**: `frontend/src/components/AuthContext.tsx`

**Extend user interface:**
```typescript
interface User {
  // ... existing fields
  cng_permissions?: {
    can_manage_spbg: boolean;
    can_view_tracking: boolean;
    can_manage_iot: boolean;
    can_approve_expenses: boolean;
  };
  cng_role?: 'admin' | 'coordinator' | 'driver' | 'finance';
}
```

### 8. Utility Function Modifications

#### 8.1 Add CNG Calculation Utilities
**File**: `frontend/src/utils/cngCalculations.ts`

```typescript
// CNG-specific calculation utilities
export const cngUtils = {
  // Convert m³ to kg (approximate)
  m3ToKg: (volume: number): number => volume * 0.668,
  
  // Calculate gas cost based on method
  calculateGasCost: (volume: number, method: 'jisdor' | 'fixed', jisdorRate?: number, fixedRate?: number): number => {
    if (method === 'jisdor' && jisdorRate) {
      return volume * jisdorRate;
    }
    if (method === 'fixed' && fixedRate) {
      return volume * fixedRate;
    }
    return 0;
  },
  
  // Calculate efficiency (km/m³)
  calculateEfficiency: (distance: number, gasUsed: number): number => {
    return gasUsed > 0 ? distance / gasUsed : 0;
  },
  
  // Format gas volume
  formatGasVolume: (volume: number): string => {
    return `${volume.toFixed(2)} m³`;
  },
  
  // Format pressure
  formatPressure: (pressure: number): string => {
    return `${pressure.toFixed(1)} bar`;
  }
};
```

## Implementation Priority

### Phase 1: Renaming & Branding (Days 1-2)
1. **Application Title Update** - Change "Angkutan Sys" to "CNG Angkutan Sys"
2. **Navigation Section Renaming** - Update all section headers to CNG context
3. **Page Title Updates** - Modify getPageTitle() function for CNG terminology
4. **Navigation Item Labels** - Update all menu item text to include CNG

### Phase 2: Core Modifications (Days 3-5)
1. **Navigation Updates** - Add CNG menu items to MainLayout
2. **Interface Extensions** - Update existing interfaces with CNG fields
3. **Basic Components** - Create CNGStatusBadge and LiveLocationModal
4. **API Setup** - Create cngApi service

### Phase 3: Page Enhancements (Days 6-9)
1. **DeliveryOrders.tsx** - Add CNG tracking columns and actions
2. **Vehicles.tsx** - Add CNG vehicle information
3. **Drivers.tsx** - Add CNG driver status
4. **CashManagement.tsx** - Add CNG transaction categories

### Phase 4: Integration & Testing (Days 10-12)
1. **Route Integration** - Add CNG routes to App.tsx
2. **State Management** - Update AuthContext for CNG permissions
3. **Utility Functions** - Add CNG calculation utilities
4. **Testing** - Test all modifications work together

## Dependencies to Install

```bash
# For enhanced mapping (if not using existing Leaflet)
npm install @react-google-maps/api

# For real-time updates
npm install react-query

# For enhanced forms
npm install react-hook-form @hookform/resolvers yup

# For charts and analytics
npm install recharts
```

## Success Criteria

### Functional Requirements
- [ ] All existing functionality preserved
- [ ] Application branding updated to CNG context
- [ ] All navigation labels and titles reflect CNG operations
- [ ] CNG navigation items added and functional
- [ ] CNG data displayed in existing tables
- [ ] Live tracking modal works with existing delivery orders
- [ ] CNG status badges display correctly
- [ ] API integration stable for CNG endpoints

### User Experience Requirements
- [ ] Seamless integration with existing UI
- [ ] Consistent design language maintained
- [ ] No disruption to existing workflows
- [ ] Clear CNG-specific information display

## Risk Mitigation

### Technical Risks
- **Interface Conflicts**: Carefully extend existing interfaces without breaking changes
- **API Integration**: Implement proper error handling for new CNG endpoints
- **Performance**: Ensure new CNG features don't slow down existing functionality

### User Experience Risks
- **Navigation Confusion**: Clear labeling and grouping of CNG features
- **Data Overload**: Gradual introduction of CNG information
- **Workflow Disruption**: Maintain existing user patterns while adding CNG features

## Conclusion

This modification plan transforms the existing expedition app into a CNG expedition app by:

1. **Rebranding the application** with CNG-specific terminology and labels
2. **Extending existing functionality** rather than replacing it
3. **Adding CNG-specific data** to current pages and components
4. **Creating new CNG components** that integrate seamlessly
5. **Maintaining user experience** while adding new capabilities

The approach ensures a smooth transition with minimal disruption to existing users while providing all the CNG-specific features needed for gas expedition operations.
