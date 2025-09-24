import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import TrackingDeliveryCard from './TrackingDeliveryCard';

interface DeliveryOrder {
  id: number;
  do_number: string;
  do_name?: string;
  standalone_po_number?: string;
  customer_name: string;
  item_name: string;
  minimal_load_quantity: number;
  actual_load_quantity?: number;
  unit: string;
  unit_price?: number;
  status: string;
  status_text: string;
  driver_name: string;
  vehicle_info: string;
  created_at: string;
  financial_summary: {
    trip_allowance: number;
    gaji: number;
    total_for_driver: number;
    minimal_total_amount: number;
    actual_total_amount?: number;
    ongkosan: number;
    net_profit: number;
    unit: string;
    unit_display: string;
  };
  purchaseOrder?: {
    po_number: string;
    unit?: string;
  };
  surat_jalan_photo_url?: string | string[];
  ongkosan?: number;
  vehicle?: {
    id: number;
    license_plate: string;
    type: string;
  };
  driver?: {
    id: number;
    username: string;
    driverProfile?: {
      full_name: string;
      phone: string;
    };
  };
}

interface TrackingDeliveryListProps {
  className?: string;
}

const TrackingDeliveryList: React.FC<TrackingDeliveryListProps> = ({ className = "" }) => {
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch delivery orders
  const fetchDeliveryOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        limit: 50, // Get more orders for tracking
        page: 1,
      };

      if (statusFilter === 'active') {
        // Get only trackable delivery orders (in transit, not completed/cancelled)
        params.status = 'at_spbu,otw_to_unload_location,at_unload_location';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await apiClient.get('/delivery-orders', { params });
      
      // Handle full response format (same as DeliveryOrders page)
      const orders = response.data.success
        ? response.data.data
        : response.data || [];
      
      // Ensure unit field exists with fallback
      const processedOrders = orders.map((order: DeliveryOrder) => ({
        ...order,
        unit: "kubik", // All delivery orders use cubic meters only
      }));

      setDeliveryOrders(processedOrders);
    } catch (err: any) {
      console.error('Error fetching delivery orders:', err);
      setError(err.response?.data?.message || 'Failed to fetch delivery orders');
      setDeliveryOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOrders();
  }, [statusFilter, searchTerm]);

  const handleRefresh = () => {
    fetchDeliveryOrders();
  };

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center py-12`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center py-12`}>
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Delivery Orders</div>
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header and Controls */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Track Deliveries</h2>
            <p className="text-gray-600">Monitor and track your delivery orders in real-time</p>
          </div>
          
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Trackable Deliveries</option>
              <option value="at_spbu">At SPBU</option>
              <option value="otw_to_unload_location">On the way to Customer</option>
              <option value="at_unload_location">At Customer</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by DO number, customer, item..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Found {deliveryOrders.length} delivery order{deliveryOrders.length !== 1 ? 's' : ''}
      </div>

      {/* Delivery Orders Grid */}
      {deliveryOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Delivery Orders Found</h3>
          <p className="text-gray-500">
            {statusFilter === 'active' 
              ? 'No trackable deliveries at the moment. Deliveries appear here when they are in transit.' 
              : 'No delivery orders match your current filter criteria.'}
          </p>
          <button
            onClick={() => {
              setStatusFilter('active');
              setSearchTerm('');
            }}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Show trackable deliveries
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliveryOrders.map((deliveryOrder) => (
            <TrackingDeliveryCard
              key={deliveryOrder.id}
              deliveryOrder={deliveryOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TrackingDeliveryList;
