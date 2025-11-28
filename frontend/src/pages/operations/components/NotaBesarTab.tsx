// src/pages/operations/components/NotaBesarTab.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../../api/axiosConfig';
import apiClient from '../../../api/axiosConfig';

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
  items?: Array<{
    id: number;
    price: string;
    notaKecil: NotaKecil;
  }>;
  notes?: string;
}

interface DeliveryOrderGroup {
  id: number;
  do_number: string;
  notaBesars: NotaBesar[];
  totalValue: number;
  totalVolume: number;
  notaBesarCount: number;
}

const NotaBesarTab: React.FC = () => {
  const navigate = useNavigate();
  const [notaBesars, setNotaBesars] = useState<NotaBesar[]>([]);
  const [deliveryOrderGroups, setDeliveryOrderGroups] = useState<DeliveryOrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Expand/collapse states
  const [expandedDOs, setExpandedDOs] = useState<Set<number>>(new Set());

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
        setDeliveryOrderGroups([]);
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
      
      // Group by DO
      const grouped = groupNotaBesarsByDO(detailedNotaBesars);
      setDeliveryOrderGroups(grouped);
      
      // Keep all DOs closed by default
      setExpandedDOs(new Set());
      
      console.log('Fetched and grouped nota besars:', grouped);
    } catch (error) {
      console.error('Error fetching nota besars:', error);
      setError('Failed to fetch nota besars');
    } finally {
      setLoading(false);
    }
  };

  const groupNotaBesarsByDO = (notaBesarsData: NotaBesar[]): DeliveryOrderGroup[] => {
    const doMap = new Map<number, DeliveryOrderGroup>();

    notaBesarsData.forEach((notaBesar) => {
      const doId = notaBesar.deliveryOrder.id;
      const doNumber = notaBesar.deliveryOrder.do_number;
      
      if (!doMap.has(doId)) {
        doMap.set(doId, {
          id: doId,
          do_number: doNumber,
          notaBesars: [],
          totalValue: 0,
          totalVolume: 0,
          notaBesarCount: 0,
        });
      }

      const doGroup = doMap.get(doId)!;
      doGroup.notaBesars.push(notaBesar);
      doGroup.totalValue += parseFloat(notaBesar.total_price);
      doGroup.totalVolume += parseFloat(notaBesar.total_volume);
      doGroup.notaBesarCount += 1;
    });

    // Sort by DO ID (newest first)
    const sortedGroups = Array.from(doMap.values()).sort((a, b) => b.id - a.id);
    
    // Sort nota besars within each DO by created_at (newest first)
    sortedGroups.forEach(doGroup => {
      doGroup.notaBesars.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return sortedGroups;
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/customers/locations');
      setCustomers(response.data.data || response.data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const toggleDO = (doId: number) => {
    setExpandedDOs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(doId)) {
        newSet.delete(doId);
      } else {
        newSet.add(doId);
      }
      return newSet;
    });
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

  // Get unique customers for a nota besar
  const getCustomersForNotaBesar = (notaBesar: NotaBesar): string[] => {
    if (!notaBesar.items) return [];
    
    const customerSet = new Set<string>();
    notaBesar.items.forEach(item => {
      if (item.notaKecil.customer_name) {
        customerSet.add(item.notaKecil.customer_name);
      }
    });
    
    return Array.from(customerSet);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 blur opacity-30 animate-pulse"></div>
          </div>
          <p className="mt-6 text-lg font-semibold text-gray-700">Loading Nota Besars...</p>
          <p className="mt-2 text-gray-500">Grouping by delivery orders</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchAllNotaBesars}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (deliveryOrderGroups.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg p-16 text-center border border-dashed border-gray-300">
        <div className="mx-auto h-24 w-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mb-6">
          <svg className="h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-3">No Nota Besars</h3>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Create nota besars by selecting nota kecils and grouping them by delivery order
        </p>
        <button
          onClick={() => navigate('/operations/nota-kecil')}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
        >
          🚀 Start with Nota Kecil
        </button>
      </div>
    );
  }

  // Calculate overall stats
  const totalNotaBesars = notaBesars.length;
  const totalValue = notaBesars.reduce((sum, nota) => sum + parseFloat(nota.total_price), 0);
  const totalVolume = notaBesars.reduce((sum, nota) => sum + parseFloat(nota.total_volume), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 border border-blue-200 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">Total Nota Besars</p>
              <p className="text-3xl font-extrabold text-blue-900 mt-2">{totalNotaBesars}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
              📊
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-200 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-green-700 uppercase tracking-wide">Total Value</p>
              <p className="text-3xl font-extrabold text-green-900 mt-2">{formatCurrency(totalValue)}</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
              💰
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-lg p-6 border border-purple-200 group hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">Total Volume</p>
              <p className="text-3xl font-extrabold text-purple-900 mt-2">
                {totalVolume.toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³
              </p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
              📏
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Order Groups */}
      <div className="space-y-6">
        {deliveryOrderGroups.map((doGroup) => {
          const isExpanded = expandedDOs.has(doGroup.id);
          
          return (
            <div key={doGroup.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/50">
              {/* DO Header */}
              <div className="bg-gradient-to-r from-emerald-600 via-green-700 to-teal-800 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => toggleDO(doGroup.id)}
                      className="group/chevron p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg 
                        className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      🚚
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold tracking-tight">{doGroup.do_number}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm opacity-90">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono">{doGroup.notaBesarCount}</span>
                          <span>Nota Besar{doGroup.notaBesarCount > 1 ? 's' : ''}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono">{doGroup.totalVolume.toLocaleString('id-ID', { minimumFractionDigits: 3 })}</span>
                          <span>m³</span>
                        </span>
                        <span className="font-mono">{formatCurrency(doGroup.totalValue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Collapse/Expand Transition */}
              <div 
                className={`
                  overflow-hidden transition-all duration-500 ease-in-out
                  ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
                `}
              >
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {doGroup.notaBesars.map((notaBesar) => {
                    const customers = getCustomersForNotaBesar(notaBesar);
                    
                    return (
                      <div 
                        key={notaBesar.id}
                        onClick={() => handleNotaBesarClick(notaBesar)}
                        className="group/card bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-300 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden"
                      >
                        {/* Card Gradient Border */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl opacity-0 group-hover/card:opacity-20 transition-opacity duration-300"></div>
                        
                        {/* Header */}
                        <div className="relative z-10 flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover/card:scale-110 transition-transform">
                              NB
                            </div>
                            <div>
                              <span className="font-bold text-xl text-gray-900">#{notaBesar.id}</span>
                              {getStatusBadge(notaBesar.status)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotaBesarClick(notaBesar);
                            }}
                            className="relative z-10 p-2 text-blue-600 hover:text-blue-700 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all group-hover/card:scale-110"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>

                        {/* Created Date */}
                        <div className="relative z-10 mb-4">
                          <p className="text-xs text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded-full inline-block">
                            {formatDate(notaBesar.created_at)}
                          </p>
                        </div>

                        {/* Customers */}
                        {customers.length > 0 && (
                          <div className="relative z-10 mb-6">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Customers</p>
                            <div className="flex flex-wrap gap-2">
                              {customers.map((customer, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200 shadow-sm"
                                >
                                  {customer}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Volume & Price Grid */}
                        <div className="relative z-10 grid grid-cols-2 gap-4 mb-6">
                          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Volume</p>
                            <p className="text-2xl font-bold text-blue-800 mt-1 font-mono">
                              {parseFloat(notaBesar.total_volume).toLocaleString('id-ID', { minimumFractionDigits: 3 })}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">m³</p>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total Price</p>
                            <p className="text-2xl font-bold text-green-800 mt-1">
                              {formatCurrency(parseFloat(notaBesar.total_price))}
                            </p>
                          </div>
                        </div>

                        {/* Price per m³ & Creator */}
                        <div className="relative z-10 grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Price/m³</p>
                            <p className="text-sm font-mono text-gray-900">
                              {formatCurrency(parseFloat(notaBesar.gas_price_per_m3))}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Created By</p>
                            <div className="flex items-center justify-end gap-2 mt-1">
                              <div className="w-6 h-6 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {notaBesar.creator?.username?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <span className="font-medium text-gray-900 text-sm">{notaBesar.creator?.username || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Hover Effect Sparkle */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-all duration-500">
                          <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur animate-ping"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotaBesarTab;