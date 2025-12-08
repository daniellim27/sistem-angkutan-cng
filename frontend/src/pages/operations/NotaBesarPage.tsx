// src/pages/operations/NotaBesarPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../api/axiosConfig';
import apiClient from '../../api/axiosConfig';

interface Customer {
  id: number;
  customer_name: string;
  location: string;
  display_name: string;
}

interface NotaKecil {
  id: number;
  customer_name: string;
  customer_address?: string;
  customer_location_index: number;
  
  // ✅ NEW SCHEMA FIELDS
  stan_awal: string;
  current_stan: string;
  pressure_inlet: string;
  pressure_outlet?: string;
  temperature: string;
  
  Vt: string;
  k: string;
  V: string;
  created_at: string;
}

interface NotaBesar {
  id: number;
  total_volume: string;
  total_price: string;
  gas_price_per_m3: string;
  created_at: string;
  status?: string;
  creator: {
    id: number;
    username: string;
  };
  deliveryOrder: {
    id: number;
    do_number: string;
  };
  customer?: {
    id: number;
    customer_name: string;
    location: string;
    nota_besar: number;
    nota_kecil: number;
  };
  items?: Array<{
    id: number;
    price: string;
    notaKecil: NotaKecil;
  }>;
  notes?: string;
}

const NotaBesarPage: React.FC = () => {
  const navigate = useNavigate();
  const [notaBesars, setNotaBesars] = useState<NotaBesar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDO, setFilterDO] = useState<string>('');
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchAllNotaBesars();
    fetchCustomers();
  }, []);

  const fetchAllNotaBesars = async () => {
    try {
      setLoading(true);
      const response = await authClient.get('/nota-besars');
      const basicNotaBesars = response.data.data || [];
      
      if (basicNotaBesars.length === 0) {
        setNotaBesars([]);
        return;
      }
      
      console.log(`Fetching details for ${basicNotaBesars.length} nota besars...`);
      const detailedNotaBesars = await Promise.all(
        basicNotaBesars.map(async (notaBesar: any) => {
          try {
            const detailResponse = await authClient.get(`/nota-besars/${notaBesar.id}`);
            return detailResponse.data.data;
          } catch (error) {
            console.error(`Error fetching details for nota besar ${notaBesar.id}:`, error);
            return notaBesar;
          }
        })
      );
      
      setNotaBesars(detailedNotaBesars);
      console.log('Fetched all nota besars with details:', detailedNotaBesars);
    } catch (error) {
      console.error('Error fetching nota besars:', error);
      setError('Failed to fetch nota besars');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/customers/locations');
      setCustomers(response.data.data || response.data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
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

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusConfig = {
      'draft': { bg: 'from-yellow-400 to-amber-500', text: 'text-yellow-900' },
      'confirmed': { bg: 'from-blue-500 to-cyan-600', text: 'text-white' },
      'billed': { bg: 'from-green-500 to-emerald-600', text: 'text-white' },
      'cancelled': { bg: 'from-red-500 to-rose-600', text: 'text-white' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { bg: 'from-gray-400 to-gray-500', text: 'text-white' };

    return (
      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${config.bg} ${config.text} shadow-sm`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleNotaBesarClick = (notaBesar: NotaBesar) => {
    navigate(`/operations/nota-besar/${notaBesar.id}`);
  };

  const getUniqueDeliveryOrders = () => {
    const deliveryOrders = new Map<number, {id: number, do_number: string}>();
    notaBesars.forEach(notaBesar => {
      if (!deliveryOrders.has(notaBesar.deliveryOrder.id)) {
        deliveryOrders.set(notaBesar.deliveryOrder.id, {
          id: notaBesar.deliveryOrder.id,
          do_number: notaBesar.deliveryOrder.do_number
        });
      }
    });
    return Array.from(deliveryOrders.values()).sort((a, b) => a.do_number.localeCompare(b.do_number));
  };

  const getUniqueCustomers = () => {
    const customerNamesOrLocations = new Set<string>();
    notaBesars.forEach(notaBesar => {
      if (notaBesar.items) {
        notaBesar.items.forEach(item => {
          if (item.notaKecil.customer_name) {
            customerNamesOrLocations.add(item.notaKecil.customer_name);
          }
        });
      }
    });

    const uniqueCustomerNames = Array.from(customerNamesOrLocations);
    
    const customersWithProperNames = uniqueCustomerNames.map(customerNameOrLocation => {
      let matchedCustomer = customers.find(c => c.customer_name === customerNameOrLocation);
      
      if (!matchedCustomer) {
        matchedCustomer = customers.find(c => c.location === customerNameOrLocation);
      }
      
      if (matchedCustomer) {
        return matchedCustomer.customer_name;
      } else {
        return customerNameOrLocation;
      }
    });
    
    return Array.from(new Set(customersWithProperNames)).sort();
  };

  const filteredNotaBesars = notaBesars.filter(notaBesar => {
    const matchesDO = !filterDO || notaBesar.deliveryOrder.id.toString() === filterDO;
    const matchesCustomer = !filterCustomer || (notaBesar.items && notaBesar.items.some(item => 
      item.notaKecil.customer_name === filterCustomer
    ));
    const matchesStatus = !filterStatus || notaBesar.status === filterStatus;
    
    return matchesDO && matchesCustomer && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent"></div>
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 blur opacity-30 animate-pulse"></div>
          </div>
          <p className="mt-6 text-xl font-semibold text-gray-700">Loading Nota Besars...</p>
          <p className="mt-2 text-gray-500">Fetching detailed records</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchAllNotaBesars}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/operations/nota-kecil')}
              className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg font-semibold"
            >
              Go to Nota Kecil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-2">Nota Besar Management</h1>
            <p className="text-xl opacity-90">Complete overview of all nota besars</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/operations/nota-kecil')}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all font-semibold border border-white/20"
            >
              ← Nota Kecil
            </button>
            <button
              onClick={() => navigate('/delivery-orders')}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all font-semibold border border-white/20"
            >
              ← Delivery Orders
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Order</label>
            <select
              value={filterDO}
              onChange={(e) => setFilterDO(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            >
              <option value="">All DOs</option>
              {getUniqueDeliveryOrders().map((deliveryOrder) => (
                <option key={deliveryOrder.id} value={deliveryOrder.id.toString()}>
                  {deliveryOrder.do_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Customer</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            >
              <option value="">All Customers</option>
              {getUniqueCustomers().map((customer, index) => (
                <option key={index} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="billed">Billed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterDO('');
                setFilterCustomer('');
                setFilterStatus('');
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg font-semibold"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredNotaBesars.length} of {notaBesars.length} nota besars
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-8 border border-blue-200 group hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">Total Nota Besars</p>
              <p className="text-4xl font-extrabold text-blue-900 mt-2">{notaBesars.length}</p>
            </div>
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
              📊
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-8 border border-green-200 group hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-green-700 uppercase tracking-wide">Total Value</p>
              <p className="text-4xl font-extrabold text-green-900 mt-2">
                {formatCurrency(notaBesars.reduce((sum, nota) => sum + parseFloat(nota.total_price), 0))}
              </p>
            </div>
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
              💰
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-lg p-8 border border-purple-200 group hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">Total Volume</p>
              <p className="text-4xl font-extrabold text-purple-900 mt-2">
                {notaBesars.reduce((sum, nota) => sum + parseFloat(nota.total_volume), 0).toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³
              </p>
            </div>
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
              📏
            </div>
          </div>
        </div>
      </div>

      {/* Nota Besars Table */}
      {filteredNotaBesars.length > 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/50">
          <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Nota Besar List
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Delivery Order
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Total Price
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Price/m³
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredNotaBesars.map((notaBesar) => (
                  <tr 
                    key={notaBesar.id}
                    className="cursor-pointer transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 group"
                    onClick={() => handleNotaBesarClick(notaBesar)}
                  >
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform">
                          NB
                        </span>
                        <span className="font-bold text-gray-900 text-lg">#{notaBesar.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      <div className="font-mono bg-blue-50 text-blue-800 px-4 py-2 rounded-xl font-semibold">
                        {notaBesar.deliveryOrder.do_number}
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      {getStatusBadge(notaBesar.status)}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-right">
                      <div className="font-mono text-2xl font-bold text-blue-600">
                        {parseFloat(notaBesar.total_volume).toLocaleString('id-ID', { minimumFractionDigits: 3 })}
                      </div>
                      <div className="text-sm text-gray-500">m³</div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(parseFloat(notaBesar.total_price))}
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-right">
                      <div className="font-mono text-sm text-gray-600">
                        {formatCurrency(parseFloat(notaBesar.gas_price_per_m3))}
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(notaBesar.created_at)}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {notaBesar.creator?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-gray-900">{notaBesar.creator?.username || 'Unknown'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg p-16 text-center border border-dashed border-gray-300">
          <div className="mx-auto h-24 w-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-3">No Nota Besars Found</h3>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {filterDO || filterCustomer || filterStatus 
              ? 'Try adjusting your filters to see nota besars' 
              : 'Create your first nota besar by selecting nota kecils and grouping them'
            }
          </p>
          <button
            onClick={() => navigate('/operations/nota-kecil')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            🚀 Start with Nota Kecil
          </button>
        </div>
      )}
    </div>
  );
};

export default NotaBesarPage;