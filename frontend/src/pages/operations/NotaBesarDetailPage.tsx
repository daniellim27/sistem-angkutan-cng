// src/pages/operations/NotaBesarDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '../../api/axiosConfig';

interface NotaKecil {
  id: number;
  customer_name: string;
  customer_location_index: number;
  stan_awal: string;
  stan_akhir: string;
  tekanan_operasi: string;
  temperatur_operasi: string;
  Vt: string;
  k: string;
  V: string;
  created_at: string;
}

interface NotaBesarItem {
  id: number;
  price: string;
  notaKecil: NotaKecil;
}

interface NotaBesar {
  id: number;
  total_volume: string;
  total_price: string;
  gas_price_per_m3: string;
  status: 'draft' | 'confirmed' | 'billed' | 'cancelled';
  created_at: string;
  creator: {
    id: number;
    username: string;
  };
  deliveryOrder: {
    id: number;
    do_number: string;
  };
  items: NotaBesarItem[];
  notes?: string;
}

const NotaBesarDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notaBesar, setNotaBesar] = useState<NotaBesar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchNotaBesarDetail();
    }
  }, [id]);

  const fetchNotaBesarDetail = async () => {
    try {
      setLoading(true);
      const response = await authClient.get(`/nota-besars/${id}`);
      setNotaBesar(response.data.data);
      console.log('Fetched nota besar detail:', response.data);
    } catch (error) {
      console.error('Error fetching nota besar detail:', error);
      setError('Failed to fetch nota besar details');
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'draft': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'billed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading nota besar details...</p>
      </div>
    );
  }

  if (error || !notaBesar) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error || 'Nota besar not found'}</div>
        <button
          onClick={() => navigate('/operations/nota-besar')}
          className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Back to Nota Besar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Nota Besar #{notaBesar.id}</h1>
          <p className="text-gray-600">DO Number: {notaBesar.deliveryOrder.do_number}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/operations/nota-besar')}
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            ← Back to Nota Besar
          </button>
          <button
            onClick={() => navigate('/operations/nota-kecil')}
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            ← Nota Kecil
          </button>
        </div>
      </div>

      {/* Status and Metadata */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Nota Besar Information</h2>
          <div className="flex items-center space-x-4">
            {getStatusBadge(notaBesar.status)}
            <span className="text-sm text-gray-500">
              Created: {formatDate(notaBesar.created_at)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Created by:</span>
            <span className="ml-2 text-gray-900">{notaBesar.creator?.username || 'Unknown'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Delivery Order:</span>
            <span className="ml-2 text-gray-900">{notaBesar.deliveryOrder.do_number}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Gas Price per m³:</span>
            <span className="ml-2 text-gray-900">{formatCurrency(parseFloat(notaBesar.gas_price_per_m3))}</span>
          </div>
          {notaBesar.notes && (
            <div className="md:col-span-3">
              <span className="font-medium text-gray-600">Notes:</span>
              <span className="ml-2 text-gray-900">{notaBesar.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Volume</p>
              <p className="text-2xl font-bold text-blue-900">
                {parseFloat(notaBesar.total_volume).toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Total Price</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(parseFloat(notaBesar.total_price))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Price per m³</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(parseFloat(notaBesar.gas_price_per_m3))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nota Kecils List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Included Nota Kecils ({notaBesar.items?.length || 0})
          </h3>
        </div>
        
        {notaBesar.items && notaBesar.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stan Awal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stan Akhir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Selisih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pressure (Bar)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temp (°C)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vt (m³)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    k
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    V (m³)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notaBesar.items.map((item, index) => {
                  const notaKecil = item.notaKecil;
                  const createdDate = new Date(notaKecil.created_at);
                  const time = createdDate.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  });
                  
                  const stanAwal = parseFloat(notaKecil.stan_awal || '0');
                  const stanAkhir = parseFloat(notaKecil.stan_akhir || '0');
                  const selisih = stanAkhir - stanAwal;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {notaKecil.customer_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Loc #{notaKecil.customer_location_index}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stanAwal.toLocaleString('id-ID', { minimumFractionDigits: 3 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stanAkhir.toLocaleString('id-ID', { minimumFractionDigits: 3 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {selisih.toLocaleString('id-ID', { minimumFractionDigits: 3 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(notaKecil.tekanan_operasi || '0').toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(notaKecil.temperatur_operasi || '0').toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(notaKecil.Vt || '0').toLocaleString('id-ID', { minimumFractionDigits: 3 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {parseFloat(notaKecil.k || '0').toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {parseFloat(notaKecil.V || '0').toLocaleString('id-ID', { minimumFractionDigits: 3 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {formatCurrency(parseFloat(item.price))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" colSpan={9}>
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                    {parseFloat(notaBesar.total_volume).toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrency(parseFloat(notaBesar.total_price))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">No nota kecils included in this nota besar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotaBesarDetailPage;

