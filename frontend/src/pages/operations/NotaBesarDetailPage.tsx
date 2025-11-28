// src/pages/operations/NotaBesarDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '../../api/axiosConfig';

interface NotaKecil {
  id: number;
  customer_name: string;
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
    const statusConfig = {
      'draft': { bg: 'bg-gradient-to-r from-yellow-400 to-amber-500', text: 'text-yellow-900' },
      'confirmed': { bg: 'bg-gradient-to-r from-blue-500 to-cyan-600', text: 'text-white' },
      'billed': { bg: 'bg-gradient-to-r from-green-500 to-emerald-600', text: 'text-white' },
      'cancelled': { bg: 'bg-gradient-to-r from-red-500 to-rose-600', text: 'text-white' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { bg: 'bg-gray-400', text: 'text-white' };

    return (
      <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-full ${config.bg} ${config.text} shadow-lg`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 blur opacity-20 animate-pulse"></div>
          </div>
          <p className="mt-4 text-lg text-gray-600 font-medium">Loading nota besar details...</p>
        </div>
      </div>
    );
  }

  if (error || !notaBesar) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error || 'Nota besar not found'}</p>
          <button
            onClick={() => navigate('/operations/nota-management')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold"
          >
            ← Back to Nota Management
          </button>
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
            <button
              onClick={() => navigate('/operations/nota-management')}
              className="inline-flex items-center gap-2 mb-4 lg:mb-0 text-blue-100 hover:text-white transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Nota Management
            </button>
            <h1 className="text-4xl lg:text-5xl font-bold mb-2 flex items-center gap-4">
              <span className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 text-2xl font-extrabold">
                NB #{notaBesar.id}
              </span>
              {notaBesar.deliveryOrder.do_number}
            </h1>
            <p className="text-blue-100 opacity-90">Delivery Order Details</p>
          </div>
          <div className="flex items-center gap-6">
            {getStatusBadge(notaBesar.status)}
            <div className="text-right">
              <div className="text-lg font-semibold opacity-90">Created</div>
              <div className="text-2xl font-bold">{formatDate(notaBesar.created_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-50 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Created By</p>
              <p className="text-2xl font-bold text-gray-900">{notaBesar.creator?.username || 'Unknown'}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold">
              👤
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 uppercase tracking-wide">Gas Price/m³</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(parseFloat(notaBesar.gas_price_per_m3))}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-semibold">
              💰
            </div>
          </div>
        </div>

        {notaBesar.notes && (
          <div className="lg:col-span-2 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 uppercase tracking-wide">Notes</p>
                <p className="text-gray-900 mt-2">{notaBesar.notes}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-semibold">
                📝
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-8 border border-blue-200 text-center group hover:shadow-2xl transition-all">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-4 group-hover:scale-110 transition-transform">
            📏
          </div>
          <p className="text-sm font-medium text-blue-700 uppercase tracking-wide mb-2">Total Volume</p>
          <p className="text-4xl font-extrabold text-blue-900">
            {parseFloat(notaBesar.total_volume).toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-8 border border-green-200 text-center group hover:shadow-2xl transition-all">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-4 group-hover:scale-110 transition-transform">
            💵
          </div>
          <p className="text-sm font-medium text-green-700 uppercase tracking-wide mb-2">Total Price</p>
          <p className="text-4xl font-extrabold text-green-900">{formatCurrency(parseFloat(notaBesar.total_price))}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-lg p-8 border border-purple-200 text-center group hover:shadow-2xl transition-all">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-4 group-hover:scale-110 transition-transform">
            📋
          </div>
          <p className="text-sm font-medium text-purple-700 uppercase tracking-wide mb-2">Items Count</p>
          <p className="text-4xl font-extrabold text-purple-900">{notaBesar.items?.length || 0}</p>
        </div>
      </div>

      {/* Nota Kecils Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              📊
            </span>
            Nota Kecil Items ({notaBesar.items?.length || 0})
          </h3>
        </div>
        
        {notaBesar.items && notaBesar.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Stan Awal
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Current Stan
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ΔVt
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    P.Inlet
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Temp
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    k Factor
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    V (m³)
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {notaBesar.items.map((item, index) => {
                  const notaKecil = item.notaKecil;
                  const createdDate = new Date(notaKecil.created_at);
                  const time = createdDate.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  });
                  
                  const stanAwal = parseFloat(notaKecil.stan_awal || '0');
                  const currentStan = parseFloat(notaKecil.current_stan || '0');
                  const deltaVt = currentStan - stanAwal;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                            {notaKecil.customer_location_index}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{notaKecil.customer_name}</div>
                            <div className="text-sm text-gray-500">Location #{notaKecil.customer_location_index}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                          {time}
                        </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm text-right">
                        <div className="font-mono text-gray-900">{stanAwal.toLocaleString('id-ID', { minimumFractionDigits: 3 })}</div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm text-right">
                        <div className="font-mono text-gray-900">{currentStan.toLocaleString('id-ID', { minimumFractionDigits: 3 })}</div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm text-right font-semibold">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                          {deltaVt.toLocaleString('id-ID', { minimumFractionDigits: 3 })}
                        </span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm text-right">
                        <div className="font-mono text-gray-900">{parseFloat(notaKecil.pressure_inlet || '0').toFixed(2)} bar</div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm text-right">
                        <div className="font-mono text-gray-900">{parseFloat(notaKecil.temperature || '0').toFixed(1)}°C</div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm text-right">
                        <div className="font-mono text-purple-600">{parseFloat(notaKecil.k || '0').toFixed(6)}</div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm text-right font-bold">
                        <span className="text-green-600">{parseFloat(notaKecil.V || '0').toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³</span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap text-sm text-right font-bold">
                        <span className="text-green-700 bg-green-50 px-3 py-2 rounded-xl font-mono">
                          {formatCurrency(parseFloat(item.price))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gradient-to-r from-blue-600 to-indigo-700">
                <tr>
                  <td className="px-6 py-6 text-lg font-extrabold text-white" colSpan={9}>
                    GRAND TOTAL
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="text-3xl font-extrabold text-white">
                      {parseFloat(notaBesar.total_volume).toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³
                    </div>
                    <div className="text-2xl font-bold text-white/90 mt-1">
                      {formatCurrency(parseFloat(notaBesar.total_price))}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="mx-auto h-24 w-24 bg-gray-200 rounded-2xl flex items-center justify-center mb-6">
              <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Nota Kecil Items</h3>
            <p className="text-gray-600 text-lg">No nota kecils included in this nota besar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotaBesarDetailPage;