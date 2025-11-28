// src/pages/CustomerNotaKecilPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '../api/axiosConfig';
import { toast } from 'react-hot-toast';

interface Customer {
  id: number;
  customer_name: string;
  location: string;
  nota_besar: number;
  nota_kecil: number;
}

interface NotaKecilItem {
  id: number;
  volume_m3: string;
  price: string;
  notaKecil: {
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
  };
}

interface NotaBesarGroup {
  notaBesar: {
    id: number;
    total_volume: string;
    total_price: string;
    gas_price_per_m3: string;
    status: string;
    created_at: string;
    deliveryOrder: {
      id: number;
      do_number: string;
    };
  };
  items: NotaKecilItem[];
}

interface NotaKecilData {
  customer: Customer;
  notaKecils: NotaBesarGroup[];
  summary: {
    total_nota_kecils: number;
    total_volume: number;
    total_price: number;
    from_nota_besars: number;
  };
}

const CustomerNotaKecilPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<NotaKecilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotaKecils();
  }, [id]);

  const fetchNotaKecils = async () => {
    try {
      setLoading(true);
      const response = await authClient.get(`/customers/${id}/nota-kecils`);
      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch nota kecils');
      toast.error('Failed to load nota kecils');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading nota kecils...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-gradient-to-r from-red-50 to-rose-100 border border-red-200 rounded-xl p-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Data</h2>
            <p className="text-red-700 mb-6">{error || 'No data available'}</p>
            <button
              onClick={() => navigate('/customers')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold"
            >
              ← Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              onClick={() => navigate('/customers')}
              className="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-4 lg:mb-0 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Customers
            </button>
            <h1 className="text-4xl lg:text-5xl font-bold mb-2">Nota Kecil</h1>
            <p className="text-xl opacity-90">{data.customer.customer_name}</p>
            <p className="text-blue-100 mt-1">{data.customer.location}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-50 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Nota Kecils</div>
            <div className="text-3xl font-bold text-gray-900">{data.summary.total_nota_kecils}</div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            From {data.summary.from_nota_besars} nota besar(s)
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-green-700 uppercase tracking-wide">Total Volume</div>
            <div className="text-3xl font-bold text-green-700">
              {data.summary.total_volume.toFixed(3)} m³
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2 font-medium">Confirmed only</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 border border-blue-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-blue-700 uppercase tracking-wide">Total Price</div>
            <div className="text-3xl font-bold text-blue-700">
              {formatCurrency(data.summary.total_price)}
            </div>
          </div>
          <div className="text-xs text-blue-600 mt-2 font-medium">Confirmed only</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-purple-700 uppercase tracking-wide">Current Balance</div>
            <div className="text-3xl font-bold text-purple-700">
              {Number(data.customer.nota_kecil).toFixed(3)} m³
            </div>
          </div>
          <div className="text-xs text-purple-600 mt-2">
            {formatCurrency(data.customer.nota_besar)}
          </div>
        </div>
      </div>

      {/* Nota Kecil List Grouped by Nota Besar */}
      <div className="space-y-6">
        {data.notaKecils.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg p-12 text-center border border-dashed border-gray-300">
            <div className="mx-auto h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
              <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Nota Kecil Found</h3>
            <p className="text-gray-600 text-lg">No confirmed nota besars found for this customer</p>
          </div>
        ) : (
          data.notaKecils.map((group) => (
            <div key={group.notaBesar.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Nota Besar Header */}
              <div className="px-8 py-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                      <span className="bg-white/20 rounded-full px-4 py-2 text-sm font-semibold">NB #{group.notaBesar.id}</span>
                      {group.notaBesar.deliveryOrder.do_number}
                    </h3>
                    <div className="flex flex-wrap items-center gap-6 mt-3 text-sm opacity-90">
                      <span>📅 {formatDate(group.notaBesar.created_at)}</span>
                      <span>💰 {formatCurrency(group.notaBesar.gas_price_per_m3)}/m³</span>
                      <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                        {group.notaBesar.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right lg:text-left">
                    <div className="text-lg font-semibold opacity-90">Total Volume</div>
                    <div className="text-4xl font-bold mt-1">{Number(group.notaBesar.total_volume).toFixed(3)} m³</div>
                    <div className="text-lg opacity-90 mt-2">{formatCurrency(group.notaBesar.total_price)}</div>
                  </div>
                </div>
              </div>

              {/* Nota Kecil Items Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Stan Awal
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Current Stan
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        P. Inlet (Bar)
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Temp (°C)
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Vt (m³)
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        k Factor
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        V (m³)
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {group.items.map((item) => {
                      const notaKecil = item.notaKecil;
                      return (
                        <tr key={item.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg">
                                {notaKecil.customer_location_index}
                              </span>
                              <div>
                                <div className="font-medium text-gray-900">{notaKecil.customer_name}</div>
                                <div className="text-sm text-gray-500">{notaKecil.customer_address || 'No address'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-sm text-right text-gray-900 font-mono">
                            {Number(notaKecil.stan_awal).toFixed(3)}
                          </td>
                          <td className="px-4 py-5 text-sm text-right text-gray-900 font-mono">
                            {Number(notaKecil.current_stan).toFixed(3)}
                          </td>
                          <td className="px-4 py-5 text-sm text-right text-gray-900 font-mono">
                            {Number(notaKecil.pressure_inlet).toFixed(2)}
                          </td>
                          <td className="px-4 py-5 text-sm text-right text-gray-900 font-mono">
                            {Number(notaKecil.temperature).toFixed(1)}
                          </td>
                          <td className="px-4 py-5 text-sm text-right text-blue-600 font-semibold font-mono">
                            {Number(notaKecil.Vt).toFixed(3)}
                          </td>
                          <td className="px-4 py-5 text-sm text-right text-purple-600 font-mono">
                            {Number(notaKecil.k).toFixed(6)}
                          </td>
                          <td className="px-4 py-5 text-sm text-right font-bold text-green-700 font-mono">
                            {Number(notaKecil.V).toFixed(3)}
                          </td>
                          <td className="px-4 py-5 text-sm text-right font-bold text-gray-900">
                            {formatCurrency(item.price)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Subtotal Row */}
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-100">
                      <td colSpan={8} className="px-6 py-5 text-right">
                        <div className="text-sm font-semibold text-gray-700">
                          Subtotal ({group.items.length} items):
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-2xl font-bold text-blue-700">
                          {group.items.reduce((sum, item) => sum + Number(item.volume_m3), 0).toFixed(3)} m³
                        </div>
                        <div className="text-lg font-bold text-gray-900 mt-1">
                          {formatCurrency(
                            group.items.reduce((sum, item) => sum + Number(item.price), 0)
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Grand Total */}
      {data.notaKecils.length > 0 && (
        <div className="bg-gradient-to-r from-gradient-500 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-center mb-8">Grand Total</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-lg font-semibold opacity-90 mb-2">Total Nota Kecils</div>
                <div className="text-5xl font-extrabold">{data.summary.total_nota_kecils}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-lg font-semibold opacity-90 mb-2">Total Volume</div>
                <div className="text-5xl font-extrabold">{data.summary.total_volume.toFixed(3)} m³</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-lg font-semibold opacity-90 mb-2">Total Price</div>
                <div className="text-5xl font-extrabold">{formatCurrency(data.summary.total_price)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerNotaKecilPage;