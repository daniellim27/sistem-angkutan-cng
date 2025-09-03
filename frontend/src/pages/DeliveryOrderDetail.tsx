// src/pages/DeliveryOrderDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

interface DriverExpense {
  id: number;
  jenis: string;
  amount: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  receipt_url?: string;
  created_at: string;
  driver: {
    id: number;
    username: string;
  };
}

interface BudgetRequest {
  id: number;
  requested_amount: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  evidence_url?: string;
  created_at: string;
  approved_at?: string;
  driver: {
    id: number;
    username: string;
  };
  approver?: {
    id: number;
    username: string;
  };
}

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
  // Added financial and expense data
  expenses?: DriverExpense[];
  budgetRequests?: BudgetRequest[];
  financial_summary?: {
    trip_allowance: number;
    gaji: number;
    total_for_driver: number;
    expenses_total: number;
    remaining_allowance: number;
  };
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
  const [activeTab, setActiveTab] = useState<'details' | 'iot' | 'expenses'>('details');
  
  // IoT Data State
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [iotLoading, setIotLoading] = useState(false);
  const [iotError, setIotError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Expenses State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  
  // Direct API data fetching (copied from working pages)
  const [budgetRequestsData, setBudgetRequestsData] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any[]>([]);

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
      fetchExpensesForDO();
      fetchBudgetRequestsForDO();
    }
  }, [id]);

  // Fetch expenses for this delivery order using working API
  const fetchExpensesForDO = async () => {
    try {
      const response = await apiClient.get('/expenses');
      const allExpenses = response.data.expenses || response.data.driverExpenses || [];
      // Filter expenses for this delivery order
      const doExpenses = allExpenses.filter((expense: any) => 
        expense.delivery_order_id?.toString() === id || expense.deliveryOrder?.id?.toString() === id
      );
      setExpensesData(doExpenses);
      console.log('Fetched expenses for DO:', doExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpensesData([]);
    }
  };

  // Fetch budget requests for this delivery order using working API  
  const fetchBudgetRequestsForDO = async () => {
    try {
      const response = await apiClient.get('/budget-requests');
      const allBudgetRequests = response.data.budgetRequests || response.data.requests || [];
      // Filter budget requests for this delivery order
      const doBudgetRequests = allBudgetRequests.filter((request: any) => 
        request.deliveryOrder?.id?.toString() === id
      );
      setBudgetRequestsData(doBudgetRequests);
      console.log('Fetched budget requests for DO:', doBudgetRequests);
    } catch (error) {
      console.error('Error fetching budget requests:', error);
      setBudgetRequestsData([]);
    }
  };

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
      console.log('Fetching delivery order with ID:', id);
      const response = await apiClient.get(`/delivery-orders/${id}`);
      console.log('Full API response:', response);
      console.log('Response data structure:', response.data);
      
      const orderData = response.data.data || response.data;
      console.log('Parsed order data:', orderData);
      console.log('Expenses in data:', orderData?.expenses);
      console.log('Budget requests in data:', orderData?.budgetRequests);
      
      setDeliveryOrder(orderData);
    } catch (err: any) {
      setError('Failed to fetch delivery order details.');
      console.error('Fetch error:', err);
      console.error('Error response:', err.response?.data);
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

  // Expense types mapping from working expense management page
  const expenseTypes = {
    'bbm': 'BBM/Solar',
    'tol': 'Tol',
    'parkir': 'Parkir', 
    'makan': 'Makan',
    'pengeluaran_tambahan': 'Tambah Pengeluaran',
    'lainnya': 'Lain-lain'
  };

  // Handle budget request approval
  const handleApproveBudgetRequest = async (requestId: number) => {
    if (!window.confirm('Are you sure you want to approve this budget request?')) {
      return;
    }

    try {
      await apiClient.put(`/budget-requests/${requestId}/approve`);
      fetchBudgetRequestsForDO(); // Refresh data using working API
      alert('Budget request approved successfully');
    } catch (error) {
      console.error('Error approving budget request:', error);
      alert('Failed to approve budget request');
    }
  };

  // Handle budget request rejection
  const handleRejectBudgetRequest = async (requestId: number) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await apiClient.put(`/budget-requests/${requestId}/reject`, {
        rejection_reason: reason
      });
      fetchBudgetRequestsForDO(); // Refresh data using working API
      alert('Budget request rejected successfully');
    } catch (error) {
      console.error('Error rejecting budget request:', error);
      alert('Failed to reject budget request');
    }
  };

  // Handle expense approval
  const handleApproveExpense = async (expenseId: number) => {
    if (!window.confirm('Are you sure you want to approve this expense?')) {
      return;
    }

    try {
      await apiClient.put(`/web/expenses/${expenseId}/approve`);
      fetchExpensesForDO(); // Refresh data using working API
      alert('Expense approved successfully');
    } catch (error) {
      console.error('Error approving expense:', error);
      alert('Failed to approve expense');
    }
  };

  // Handle expense rejection
  const handleRejectExpense = async (expenseId: number) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await apiClient.put(`/web/expenses/${expenseId}/reject`, {
        rejection_reason: reason
      });
      fetchExpensesForDO(); // Refresh data using working API
      alert('Expense rejected successfully');
    } catch (error) {
      console.error('Error rejecting expense:', error);
      alert('Failed to reject expense');
    }
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
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expenses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💰 Pengeluaran Driver
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

      {/* Expenses Tab Content */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Driver Expenses & Budget Requests</h2>
          

          
          {/* Financial Summary */}
          {deliveryOrder.financial_summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-800 mb-4">💰 Financial Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Trip Allowance:</span>
                  <div className="font-semibold">{formatCurrency(deliveryOrder.financial_summary.trip_allowance)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Driver Salary:</span>
                  <div className="font-semibold">{formatCurrency(deliveryOrder.financial_summary.gaji)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Expenses:</span>
                  <div className="font-semibold text-red-600">{formatCurrency(deliveryOrder.financial_summary.expenses_total)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Remaining Allowance:</span>
                  <div className={`font-semibold ${deliveryOrder.financial_summary.remaining_allowance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(deliveryOrder.financial_summary.remaining_allowance)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Budget Requests Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">💸 Budget Requests (Ajukan Tambahan Uang Jalan)</h3>
            {budgetRequestsData && budgetRequestsData.length > 0 ? (
              <div className="space-y-4">
                {budgetRequestsData.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">
                            Driver: {request.driver?.driverProfile?.full_name || request.driver?.username || 'Unknown'}
                          </span>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">Amount: {formatCurrency(parseFloat(request.requested_amount))}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Driver:</span> {request.driver?.username}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted: {formatDate(request.created_at)}
                          {request.approved_at && ` • Processed: ${formatDate(request.approved_at)}`}
                          {request.approver && ` by ${request.approver.username}`}
                        </p>
                        {request.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            <span className="font-medium">Rejection reason:</span> {request.rejection_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {request.evidence_url && (
                          <a
                            href={`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/${request.evidence_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            📎 Evidence
                          </a>
                        )}
                        {request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveBudgetRequest(request.id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleRejectBudgetRequest(request.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No budget requests for this delivery order
              </div>
            )}
          </div>

          {/* Regular Expenses Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📋 Driver Expenses</h3>
            {expensesData && expensesData.length > 0 ? (
              <div className="space-y-4">
                {expensesData.map((expense) => (
                  <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">
                            Driver: {expense.driver?.driverProfile?.full_name || expense.driver?.username || 'Unknown'}
                          </span>
                          {getStatusBadge(expense.status)}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium">
                            {expenseTypes[expense.jenis as keyof typeof expenseTypes] || expense.jenis}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">Amount: {formatCurrency(parseFloat(expense.amount))}</div>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Driver:</span> {expense.driver?.username}
                        </p>
                        {expense.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Notes:</span> {expense.notes}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {formatDate(expense.created_at)}
                        </p>
                        {expense.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            <span className="font-medium">Rejection reason:</span> {expense.rejection_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {expense.receipt_url && (
                          <a
                            href={`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/${expense.receipt_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            📄 Receipt
                          </a>
                        )}
                        {expense.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproveExpense(expense.id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleRejectExpense(expense.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No expenses recorded for this delivery order
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrderDetail;
