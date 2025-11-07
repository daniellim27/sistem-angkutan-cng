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
    stan_awal: string;
    stan_akhir: string;
    tekanan_operasi: string;
    temperatur_operasi: string;
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
          <h1 className="text-2xl font-bold text-gray-900">Nota Kecil - {data.customer.customer_name}</h1>
          <p className="text-gray-600">{data.customer.location}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Nota Kecils</div>
          <div className="text-2xl font-bold text-gray-900">{data.summary.total_nota_kecils}</div>
          <div className="text-xs text-gray-500 mt-1">
            From {data.summary.from_nota_besars} nota besar(s)
          </div>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Volume</div>
          <div className="text-2xl font-bold text-green-700">
            {data.summary.total_volume.toFixed(2)} m³
          </div>
          <div className="text-xs text-gray-500 mt-1">Confirmed only</div>
        </div>

        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Price</div>
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(data.summary.total_price)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Confirmed only</div>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Current Balance</div>
          <div className="text-2xl font-bold text-purple-700">
            {Number(data.customer.nota_kecil).toFixed(2)} m³
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatCurrency(data.customer.nota_besar)}
          </div>
        </div>
      </div>

      {/* Nota Kecil List Grouped by Nota Besar */}
      <div className="space-y-4">
        {data.notaKecils.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No confirmed nota besars found for this customer
          </div>
        ) : (
          data.notaKecils.map((group) => (
            <div key={group.notaBesar.id} className="bg-white rounded-lg shadow">
              {/* Nota Besar Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Nota Besar #{group.notaBesar.id} - {group.notaBesar.deliveryOrder.do_number}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>Created: {formatDate(group.notaBesar.created_at)}</span>
                      <span>•</span>
                      <span>Gas Price: {formatCurrency(group.notaBesar.gas_price_per_m3)}/m³</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Total Volume</div>
                    <div className="text-xl font-bold text-blue-700">
                      {Number(group.notaBesar.total_volume).toFixed(2)} m³
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatCurrency(group.notaBesar.total_price)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota Kecil Items */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Location
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                        Stan Awal
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                        Stan Akhir
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                        Tekanan (Bar)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                        Temp (°C)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                        Vt (m³)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                        k Factor
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                        V (m³)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {group.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              {item.notaKecil.customer_location_index}
                            </span>
                            <span className="text-xs text-gray-500">
                              {item.notaKecil.customer_address || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {Number(item.notaKecil.stan_awal).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {Number(item.notaKecil.stan_akhir).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {Number(item.notaKecil.tekanan_operasi).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {Number(item.notaKecil.temperatur_operasi).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {Number(item.notaKecil.Vt).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-mono">
                          {Number(item.notaKecil.k).toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                          {Number(item.notaKecil.V).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {formatCurrency(item.price)}
                        </td>
                      </tr>
                    ))}
                    {/* Subtotal Row */}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={7} className="px-4 py-3 text-sm text-right text-gray-700">
                        Subtotal ({group.items.length} items):
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-blue-700">
                        {group.items.reduce((sum, item) => sum + Number(item.volume_m3), 0).toFixed(2)} m³
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(
                          group.items.reduce((sum, item) => sum + Number(item.price), 0)
                        )}
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
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Total Nota Kecils</div>
              <div className="text-3xl font-bold text-gray-900">{data.summary.total_nota_kecils}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Total Volume</div>
              <div className="text-3xl font-bold text-green-700">
                {data.summary.total_volume.toFixed(2)} m³
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Total Price</div>
              <div className="text-3xl font-bold text-blue-700">
                {formatCurrency(data.summary.total_price)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerNotaKecilPage;


