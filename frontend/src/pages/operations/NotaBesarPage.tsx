// src/pages/operations/NotaBesarPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../api/axiosConfig';

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

const NotaBesarPage: React.FC = () => {
  const navigate = useNavigate();
  const [notaBesars, setNotaBesars] = useState<NotaBesar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDO, setFilterDO] = useState<string>('');
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [filterAddress, setFilterAddress] = useState<string>('');

  useEffect(() => {
    fetchAllNotaBesars();
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
      
      // Fetch detailed data for each nota besar to get customer and address info
      console.log(`Fetching details for ${basicNotaBesars.length} nota besars...`);
      const detailedNotaBesars = await Promise.all(
        basicNotaBesars.map(async (notaBesar: any) => {
          try {
            const detailResponse = await authClient.get(`/nota-besars/${notaBesar.id}`);
            return detailResponse.data.data;
          } catch (error) {
            console.error(`Error fetching details for nota besar ${notaBesar.id}:`, error);
            return notaBesar; // Return basic data if detail fetch fails
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

  // Get unique customers from nota besars
  const getUniqueCustomers = () => {
    const customers = new Set<string>();
    notaBesars.forEach(notaBesar => {
      if (notaBesar.items) {
        notaBesar.items.forEach(item => {
          if (item.notaKecil.customer_name) {
            customers.add(item.notaKecil.customer_name);
          }
        });
      }
    });
    return Array.from(customers).sort();
  };

  // Get unique addresses from nota besars
  const getUniqueAddresses = () => {
    const addresses = new Set<string>();
    notaBesars.forEach(notaBesar => {
      if (notaBesar.items) {
        notaBesar.items.forEach(item => {
          if (item.notaKecil.customer_address) {
            addresses.add(item.notaKecil.customer_address);
          }
        });
      }
    });
    return Array.from(addresses).sort();
  };

  // Filter nota besars based on search criteria
  const filteredNotaBesars = notaBesars.filter(notaBesar => {
    const matchesDO = !filterDO || notaBesar.deliveryOrder.do_number.toLowerCase().includes(filterDO.toLowerCase());
    
    // Check if any nota kecil in this nota besar matches the customer filter
    const matchesCustomer = !filterCustomer || (notaBesar.items && notaBesar.items.some(item => 
      item.notaKecil.customer_name.toLowerCase().includes(filterCustomer.toLowerCase())
    ));
    
    // Check if any nota kecil in this nota besar matches the address filter
    const matchesAddress = !filterAddress || (notaBesar.items && notaBesar.items.some(item => 
      item.notaKecil.customer_address && item.notaKecil.customer_address.toLowerCase().includes(filterAddress.toLowerCase())
    ));
    
    return matchesDO && matchesCustomer && matchesAddress;
  });

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Nota Besar Management</h1>
          <p className="text-gray-600">View and manage all nota besars</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/operations/nota-kecil')}
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            ← Nota Kecil
          </button>
          <button
            onClick={() => navigate('/delivery-orders')}
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            ← Delivery Orders
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by DO Number</label>
            <input
              type="text"
              value={filterDO}
              onChange={(e) => setFilterDO(e.target.value)}
              placeholder="Search DO number..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Customer</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Address</label>
            <select
              value={filterAddress}
              onChange={(e) => setFilterAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Addresses</option>
              {getUniqueAddresses().map((address, index) => (
                <option key={index} value={address}>
                  {address}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Nota Besars</p>
              <p className="text-2xl font-bold text-gray-900">{notaBesars.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(notaBesars.reduce((sum, nota) => sum + parseFloat(nota.total_price), 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-purple-600">
                {notaBesars.reduce((sum, nota) => sum + parseFloat(nota.total_volume), 0).toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Nota Besars Table */}
      {filteredNotaBesars.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Volume (m³)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price per m³
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNotaBesars.map((notaBesar) => (
                  <tr 
                    key={notaBesar.id}
                    className="cursor-pointer transition-colors duration-200 hover:bg-blue-50"
                    onClick={() => handleNotaBesarClick(notaBesar)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{notaBesar.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {notaBesar.deliveryOrder.do_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(notaBesar.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(notaBesar.total_volume).toLocaleString('id-ID', { minimumFractionDigits: 3 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(parseFloat(notaBesar.total_price))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(parseFloat(notaBesar.gas_price_per_m3))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {notaBesar.creator?.username || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg">No nota besars found</p>
          <p className="text-gray-400 text-sm mt-2">
            {filterDO || filterCustomer || filterAddress ? 'Try adjusting your filters' : 'Create nota besars by selecting nota kecils and clicking "Create Nota Besar"'}
          </p>
          <button
            onClick={() => navigate('/operations/nota-kecil')}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Go to Nota Kecil
          </button>
        </div>
      )}
    </div>
  );
};

export default NotaBesarPage;

