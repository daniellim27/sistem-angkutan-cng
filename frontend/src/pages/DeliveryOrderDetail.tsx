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

interface DeliveryOrderDetailProps {
  // Add any props if needed
}

const DeliveryOrderDetail: React.FC<DeliveryOrderDetailProps> = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SPBG locations for display
  const spbgLocations: { value: string; label: string }[] = [];

  useEffect(() => {
    if (id) {
      fetchDeliveryOrder();
    }
  }, [id]);

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
    </div>
  );
};

export default DeliveryOrderDetail;
