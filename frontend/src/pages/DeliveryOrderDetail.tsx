// src/pages/DeliveryOrderDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

interface DeliveryOrder {
  id: number;
  do_number: string;
  customer_name: string;
  item_name: string;
  unit_price: number;
  minimal_load_quantity: number;
  actual_load_quantity?: number;
  final_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  payment_id?: number;
  status: string;
  created_at: string;
  updated_at: string;
  // Enhanced with gas filling fields
  gas_volume_m3?: number;
  spbg_location?: string;
  calculation_method?: 'jisdor' | 'fixed';
  jisdor_rate?: number;
  gas_filling_cost?: number;
}

interface SensorData {
  id: number;
  delivery_order_id: number;
  pressure_in: number;
  pressure_out: number;
  temperature: number;
  meter_pulse: number;
  created_at: string;
}

interface DeliveryOrderDetailProps {
  // Add any props if needed
}

const DeliveryOrderDetail: React.FC<DeliveryOrderDetailProps> = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'iot'>('details');
  
  // IoT Data State
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [iotLoading, setIotLoading] = useState(false);
  const [iotError, setIotError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Mockup IoT Data
  const mockSensorData: SensorData = {
    id: 1,
    delivery_order_id: Number(id),
    pressure_in: 12.5,
    pressure_out: 8.2,
    temperature: 45.3,
    meter_pulse: 1250,
    created_at: new Date().toISOString()
  };

  // SPBG locations for display
  const spbgLocations = [
    { value: 'jakarta', label: 'Jakarta' },
    { value: 'bandung', label: 'Bandung' },
    { value: 'surabaya', label: 'Surabaya' },
    { value: 'semarang', label: 'Semarang' },
    { value: 'yogyakarta', label: 'Yogyakarta' },
    { value: 'medan', label: 'Medan' },
    { value: 'palembang', label: 'Palembang' },
    { value: 'makassar', label: 'Makassar' }
  ];

  useEffect(() => {
    if (id) {
      fetchDeliveryOrder();
    }
  }, [id]);

  // IoT Data Polling Effect
  useEffect(() => {
    if (id && activeTab === 'iot') {
      // fetchSensorData(); // Removed real polling
      setSensorData(mockSensorData); // Set mock data
      setLastUpdate(new Date());
    }
  }, [id, activeTab]);

  const fetchDeliveryOrder = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/delivery-orders/${id}`);
      setDeliveryOrder(response.data.data || response.data);
    } catch (err) {
      setError('Failed to fetch delivery order details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'partial': 'bg-orange-100 text-orange-800',
      'paid': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Get SPBG location display name
  const getSPBGLocationLabel = (value: string) => {
    const location = spbgLocations.find(loc => loc.value === value);
    return location ? location.label : value;
  };

  if (loading) return <div className="text-center p-8">Loading delivery order details...</div>;

  if (error || !deliveryOrder) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">{error || 'Delivery order not found.'}</div>
        <button
          onClick={() => navigate('/delivery-orders')}
          className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Back to Delivery Orders
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Delivery Order Details</h1>
          <p className="text-gray-600">DO Number: {deliveryOrder.do_number}</p>
        </div>
        <button
          onClick={() => navigate('/delivery-orders')}
          className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          ← Back to Delivery Orders
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Delivery Details
          </button>
          <button
            onClick={() => setActiveTab('iot')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'iot'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔗 IOT View
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DO Number</label>
              <p className="text-lg font-semibold text-gray-900">{deliveryOrder.do_number}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="mt-1">{getStatusBadge(deliveryOrder.status)}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <p className="text-gray-900">{deliveryOrder.customer_name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <p className="text-gray-900">{deliveryOrder.item_name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
              <p className="text-gray-900">{formatDate(deliveryOrder.created_at)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
              <p className="text-gray-900">{formatDate(deliveryOrder.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* Quantity & Pricing Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quantity & Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimal Load Quantity</label>
              <p className="text-lg font-semibold text-gray-900">
                {deliveryOrder.minimal_load_quantity.toLocaleString('id-ID')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Load Quantity</label>
              <p className="text-lg font-semibold text-gray-900">
                {deliveryOrder.actual_load_quantity 
                  ? deliveryOrder.actual_load_quantity.toLocaleString('id-ID')
                  : 'Not specified'
                }
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(deliveryOrder.unit_price)}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(deliveryOrder.total_amount)}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Final Amount</label>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(deliveryOrder.final_amount)}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(deliveryOrder.paid_amount)}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <div className="mt-1">{getPaymentStatusBadge(deliveryOrder.payment_status)}</div>
            </div>
          </div>
        </div>

        {/* Gas Filling Information - Only show when gas filling data exists */}
        {deliveryOrder.gas_volume_m3 && (
          <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ⛽ Gas Filling Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gas Volume</label>
                <p className="text-lg font-semibold text-blue-600">
                  {deliveryOrder.gas_volume_m3} m³
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SPBG Location</label>
                <p className="text-lg font-semibold text-gray-900">
                  {deliveryOrder.spbg_location ? getSPBGLocationLabel(deliveryOrder.spbg_location) : 'Not specified'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Method</label>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {deliveryOrder.calculation_method || 'Not specified'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">JISDOR Rate</label>
                <p className="text-lg font-semibold text-gray-900">
                  {deliveryOrder.jisdor_rate 
                    ? `${formatCurrency(deliveryOrder.jisdor_rate)}`
                    : 'Not applicable'
                  }
                </p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Gas Filling Cost</label>
                <p className="text-2xl font-bold text-green-600">
                  {deliveryOrder.gas_filling_cost 
                    ? formatCurrency(deliveryOrder.gas_filling_cost)
                    : 'Not calculated'
                  }
                </p>
                {deliveryOrder.calculation_method && (
                  <p className="text-sm text-gray-500 mt-1">
                    {deliveryOrder.calculation_method === 'jisdor' 
                      ? `Calculated using JISDOR rate: (${deliveryOrder.gas_volume_m3}/27.27) × 12.7 × ${deliveryOrder.jisdor_rate}`
                      : `Calculated using fixed rate: ${deliveryOrder.gas_volume_m3} × 7,800 IDR/m³`
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Gas Filling Summary Card */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-3">Gas Filling Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Volume:</span>
                  <span className="ml-2 text-blue-900">{deliveryOrder.gas_volume_m3} m³</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Location:</span>
                  <span className="ml-2 text-blue-900">
                    {deliveryOrder.spbg_location ? getSPBGLocationLabel(deliveryOrder.spbg_location) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Method:</span>
                  <span className="ml-2 text-blue-900 capitalize">
                    {deliveryOrder.calculation_method || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Total Cost:</span>
                  <span className="ml-2 text-blue-900 font-semibold">
                    {deliveryOrder.gas_filling_cost 
                      ? formatCurrency(deliveryOrder.gas_filling_cost)
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => navigate(`/delivery-orders/${deliveryOrder.id}/edit`)}
              className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Edit Delivery Order
            </button>
            <button
              onClick={() => navigate('/delivery-orders')}
              className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Back to List
            </button>
          </div>
        </div>
      )}

      {/* IoT Tab Content */}
      {activeTab === 'iot' && (
        <div className="space-y-6">
          {/* IoT Status Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">IoT Sensor Dashboard</h2>
                <p className="text-blue-100 mt-1">DO: {deliveryOrder.do_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">Last Updated</p>
                <p className="text-lg font-semibold">
                  {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Not Available'}
                </p>
              </div>
            </div>
          </div>

          {/* Sensor Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pressure In */}
            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">🔹</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pressure In</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {mockSensorData.pressure_in} bar
                  </p>
                </div>
              </div>
            </div>

            {/* Pressure Out */}
            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-green-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-lg">🔸</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pressure Out</p>
                  <p className="text-2xl font-bold text-green-600">
                    {mockSensorData.pressure_out} bar
                  </p>
                </div>
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-orange-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-lg">🌡️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Temperature</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {mockSensorData.temperature}°C
                  </p>
                </div>
              </div>
            </div>

            {/* Meter Pulse */}
            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-purple-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-lg">⚡</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Meter Pulse</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {mockSensorData.meter_pulse}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mock Data Notice */}
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-lg">ℹ️</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-blue-800">Mockup Data Active</h3>
                <p className="text-sm text-blue-700 mt-1">
                  This is sample IoT sensor data for demonstration purposes. 
                  Real sensor data will be displayed here when IoT devices are connected.
                </p>
              </div>
            </div>
          </div>

          {/* IoT Information Panel */}
          <div className="bg-gray-50 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 IoT System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Data Collection</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real-time sensor data collection</li>
                  <li>• Automatic updates every 5 seconds</li>
                  <li>• Pressure, temperature, and meter readings</li>
                  <li>• Historical data storage</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Current Status</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Backend IoT API: ✅ Ready</li>
                  <li>• Database Storage: ✅ Ready</li>
                  <li>• Frontend Display: ✅ Active (Mock Data)</li>
                  <li>• Real IoT Connection: ⏳ Pending</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrderDetail;
