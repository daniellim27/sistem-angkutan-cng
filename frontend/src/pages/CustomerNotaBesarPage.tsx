// src/pages/CustomerNotaBesarPage.tsx
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

interface NotaBesar {
  id: number;
  total_volume: string;
  total_price: string;
  gas_price_per_m3: string;
  status: string;
  notes?: string;
  created_at: string;
  deliveryOrder: {
    id: number;
    do_number: string;
  };
  creator: {
    id: number;
    username: string;
  };
  items: Array<{
    id: number;
    volume_m3: string;
    price: string;
    notaKecil: {
      id: number;
      customer_name: string;
      customer_location_index: number;
      stan_awal: string;
      stan_akhir: string;
      Vt: string;
      k: string;
      V: string;
    };
  }>;
}

interface NotaBesarData {
  customer: Customer;
  notaBesars: NotaBesar[];
  summary: {
    total_nota_besars: number;
    confirmed_nota_besars: number;
    total_price: number;
    total_volume: number;
  };
}

const CustomerNotaBesarPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<NotaBesarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotaBesars();
  }, [id]);

  const fetchNotaBesars = async () => {
    try {
      setLoading(true);
      const response = await authClient.get(`/customers/${id}/nota-besars`);
      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch nota besars');
      toast.error('Failed to load nota besars');
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
      billed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Billed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'No data available'}</p>
          <button
            onClick={() => navigate('/customers')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/customers')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
          >
            ← Back to Customers
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nota Besar - {data.customer.customer_name}</h1>
          <p className="text-gray-600">{data.customer.location}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Nota Besars</div>
          <div className="text-2xl font-bold text-gray-900">{data.summary.total_nota_besars}</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.summary.confirmed_nota_besars} confirmed
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Volume</div>
          <div className="text-2xl font-bold text-green-700">
            {data.summary.total_volume.toFixed(2)} m³
          </div>
          <div className="text-xs text-gray-500 mt-1">From confirmed only</div>
        </div>

        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Price</div>
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(data.summary.total_price)}
          </div>
          <div className="text-xs text-gray-500 mt-1">From confirmed only</div>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Current Balance</div>
          <div className="text-2xl font-bold text-purple-700">
            {formatCurrency(data.customer.nota_besar)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {Number(data.customer.nota_kecil).toFixed(2)} m³
          </div>
        </div>
      </div>

      {/* Nota Besar List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">All Nota Besars</h2>
        </div>

        {data.notaBesars.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No nota besars found for this customer
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {data.notaBesars.map((notaBesar) => (
              <div key={notaBesar.id} className="p-6 hover:bg-gray-50">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Nota Besar #{notaBesar.id}
                      </h3>
                      {getStatusBadge(notaBesar.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>DO: {notaBesar.deliveryOrder.do_number}</span>
                      <span>•</span>
                      <span>Created by: {notaBesar.creator.username}</span>
                      <span>•</span>
                      <span>{formatDate(notaBesar.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Total Volume</div>
                    <div className="text-xl font-bold text-gray-900">
                      {Number(notaBesar.total_volume).toFixed(2)} m³
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Gas Price</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(notaBesar.gas_price_per_m3)}/m³
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Total Price</div>
                    <div className="text-xl font-bold text-blue-700">
                      {formatCurrency(notaBesar.total_price)}
                    </div>
                  </div>
                </div>

                {/* Nota Kecil Items */}
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Nota Kecil Items ({notaBesar.items.length})
                  </div>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Location</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Stan Awal</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Stan Akhir</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Vt (m³)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">k</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">V (m³)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {notaBesar.items.map((item) => (
                          <tr key={item.id} className="hover:bg-white">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              #{item.notaKecil.customer_location_index}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900">
                              {Number(item.notaKecil.stan_awal).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900">
                              {Number(item.notaKecil.stan_akhir).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900">
                              {Number(item.notaKecil.Vt).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900">
                              {Number(item.notaKecil.k).toFixed(4)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-blue-600">
                              {Number(item.notaKecil.V).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                              {formatCurrency(item.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                {notaBesar.notes && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-xs font-medium text-yellow-800 mb-1">Notes:</div>
                    <div className="text-sm text-yellow-900">{notaBesar.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerNotaBesarPage;


