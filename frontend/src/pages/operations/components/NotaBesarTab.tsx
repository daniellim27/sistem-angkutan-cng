// src/pages/operations/components/NotaBesarTab.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../../api/axiosConfig';
import apiClient from '../../../api/axiosConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronDown,
  faChevronRight,
  faTruck,
  faFileInvoiceDollar,
  faEye
} from '@fortawesome/free-solid-svg-icons';

interface Customer {
  id: number;
  customer_name: string;
  location: string;
  display_name: string;
}

interface NotaBesar {
  id: number;
  total_volume: string;
  total_price: string;
  gas_price_per_m3: string;
  created_at: string;
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
    notaKecil: {
      id: number;
      customer_name: string;
      customer_address?: string;
      customer_location_index: number;
      stan_awal: string;
      stan_akhir: string;
      tekanan_operasi: string;
      temperatur_operasi: string;
      Vt: string;
      k: string;
      V: string;
      created_at: string;
    };
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
      
      // Fetch detailed data for each nota besar
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
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading nota besars...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchAllNotaBesars}
          className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (deliveryOrderGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-lg">No nota besars found</p>
        <p className="text-gray-400 text-sm mt-2">Create nota besars by selecting nota kecils in the Nota Kecil tab</p>
      </div>
    );
  }

  // Calculate overall stats
  const totalNotaBesars = notaBesars.length;
  const totalValue = notaBesars.reduce((sum, nota) => sum + parseFloat(nota.total_price), 0);
  const totalVolume = notaBesars.reduce((sum, nota) => sum + parseFloat(nota.total_volume), 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Nota Besars</p>
              <p className="text-2xl font-bold text-gray-900">{totalNotaBesars}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-purple-600">
                {totalVolume.toFixed(2)} m³
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Order Groups */}
      {deliveryOrderGroups.map((doGroup) => {
        const isExpanded = expandedDOs.has(doGroup.id);
        
        return (
          <div key={doGroup.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* DO Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleDO(doGroup.id)}
                    className="hover:bg-green-400 p-2 rounded transition-colors"
                  >
                    <FontAwesomeIcon 
                      icon={isExpanded ? faChevronDown : faChevronRight} 
                      className="w-4 h-4"
                    />
                  </button>
                  <FontAwesomeIcon icon={faTruck} className="w-5 h-5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{doGroup.do_number}</h3>
                    <p className="text-sm text-green-100">
                      {doGroup.notaBesarCount} nota besar{doGroup.notaBesarCount > 1 ? 's' : ''} • 
                      Volume: {doGroup.totalVolume.toFixed(2)} m³ • 
                      Value: {formatCurrency(doGroup.totalValue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Nota Besars (Collapsible) - 2 Column Grid */}
            {isExpanded && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {doGroup.notaBesars.map((notaBesar) => {
                  const customers = getCustomersForNotaBesar(notaBesar);
                  
                  return (
                    <div 
                      key={notaBesar.id}
                      onClick={() => handleNotaBesarClick(notaBesar)}
                      className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-green-400 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="space-y-2">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FontAwesomeIcon icon={faFileInvoiceDollar} className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-gray-900">Nota Besar #{notaBesar.id}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotaBesarClick(notaBesar);
                            }}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="View Details"
                          >
                            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Created Date */}
                        <div className="text-xs text-gray-500">
                          {formatDate(notaBesar.created_at)}
                        </div>

                        {/* Customers */}
                        {customers.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Customers:</p>
                            <div className="flex flex-wrap gap-1">
                              {customers.map((customer, idx) => (
                                <span 
                                  key={idx}
                                  className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                                >
                                  {customer}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Volume */}
                        <div>
                          <p className="text-xs text-gray-500">Total Volume</p>
                          <p className="text-sm font-bold text-purple-600">
                            {parseFloat(notaBesar.total_volume).toFixed(2)} m³
                          </p>
                        </div>

                        {/* Price Info */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500">Price/m³</p>
                            <p className="text-sm font-medium">
                              {formatCurrency(parseFloat(notaBesar.gas_price_per_m3))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Price</p>
                            <p className="text-sm font-bold text-green-600">
                              {formatCurrency(parseFloat(notaBesar.total_price))}
                            </p>
                          </div>
                        </div>

                        {/* Created By */}
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            Created by: <span className="font-medium text-gray-700">{notaBesar.creator?.username || 'Unknown'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NotaBesarTab;
