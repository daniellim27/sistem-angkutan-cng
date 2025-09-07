import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { toast } from 'react-toastify';

interface Vehicle {
  id: number;
  license_plate: string;
  type: string;
  capacity: string;
  status: string;
}

interface CashCategory {
  id: number;
  category_name: string;
  category_type: 'income' | 'expense';
  description?: string;
}

interface VehicleExpenseTransaction {
  id: number;
  transaction_type: 'debit' | 'kredit' | 'debit_tempo' | 'kredit_tempo';
  category_id?: number;
  amount: number;
  description: string;
  reference_number?: string;
  transaction_date: string;
  created_at: string;
  running_balance?: number;
  category?: CashCategory;
  vehicle?: Vehicle;
  account: string;
  no_nota?: string[];
}

interface VehicleExpenseSummary {
  total_debit: number;
  total_kredit: number;
  total_debit_tempo: number;
  total_kredit_tempo: number;
  saldo: number;
}

const VehicleExpenseCashPage = () => {
  const [transactions, setTransactions] = useState<VehicleExpenseTransaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [summary, setSummary] = useState<VehicleExpenseSummary>({
    total_debit: 0,
    total_kredit: 0,
    total_debit_tempo: 0,
    total_kredit_tempo: 0,
    saldo: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Filters
  const [filters, setFilters] = useState({
    transaction_type: '',
    category_id: '',
    date_from: '',
    date_to: '',
    search: '',
    account: 'All',
    vehicle_id: '',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Modal state for add/edit
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<VehicleExpenseTransaction | null>(null);
  const [formData, setFormData] = useState({
    transaction_type: 'debit_tempo' as 'debit' | 'kredit' | 'debit_tempo' | 'kredit_tempo',
    category_id: '',
    amount: '',
    description: '',
    reference_number: '',
    account: 'General',
    vehicle_id: '',
    nota_number: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  // New states for lunasi modal
  const [showLunasiModal, setShowLunasiModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<VehicleExpenseTransaction | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const handleLunasi = (transaction: VehicleExpenseTransaction) => {
    setSelectedTransaction(transaction);
    setSelectedAccount(transaction.account);
    setShowLunasiModal(true);
  };

  const confirmLunasi = async () => {
    if (!selectedTransaction || !selectedAccount) {
      toast.error('Silakan pilih akun');
      return;
    }
    const currentType = selectedTransaction.transaction_type;
    const newType = currentType === 'debit_tempo' ? 'debit' : 'kredit';
    try {
      await apiClient.put(`/vehicle-expense-cash/${selectedTransaction.id}`, {
        transaction_type: newType,
        account: selectedAccount,
      });
      setShowLunasiModal(false);
      setSelectedTransaction(null);
      setSelectedAccount('');
      fetchTransactions();
      toast.success('Transaksi berhasil dilunasi');
    } catch (err) {
      console.error('Failed to lunasi transaction:', err);
      toast.error('Gagal melunasi transaksi');
    }
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const filteredFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const paramsObject = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filteredFilters,
      };
      const params = new URLSearchParams(paramsObject);
      const response = await apiClient.get(`/vehicle-expense-cash?${params}`);
      setTransactions(response.data.data || []);
      setSummary({
        total_debit: response.data.summary?.total_debit || 0,
        total_kredit: response.data.summary?.total_kredit || 0,
        total_debit_tempo: response.data.summary?.total_debit_tempo || 0,
        total_kredit_tempo: response.data.summary?.total_kredit_tempo || 0,
        saldo: response.data.summary?.saldo || 0,
      });
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0,
      }));
    } catch (err) {
      setError('Failed to fetch vehicle expense transactions.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await apiClient.get('/vehicle-expense-cash/vehicles');
      setVehicles(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/vehicle-expense-cash/categories');
      setCategories(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchVehicles();
    fetchCategories();
  }, [fetchVehicles, fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await apiClient.put(`/vehicle-expense-cash/${editingTransaction.id}`, formData);
      } else {
        await apiClient.post('/vehicle-expense-cash', formData);
      }
      setShowModal(false);
      setEditingTransaction(null);
      resetForm();
      fetchTransactions();
      toast.success('Transaksi berhasil disimpan');
    } catch (err) {
      console.error('Error saving transaction:', err);
      toast.error('Gagal menyimpan transaksi');
    }
  };

  const handleEdit = (transaction: VehicleExpenseTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      transaction_type: transaction.transaction_type,
      category_id: transaction.category_id?.toString() || '',
      amount: transaction.amount.toString(),
      description: transaction.description,
      reference_number: transaction.reference_number || '',
      transaction_date: transaction.transaction_date,
      account: transaction.account || 'General',
      vehicle_id: transaction.vehicle?.id?.toString() || '',
      nota_number: transaction.no_nota?.[0] || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      return;
    }
    try {
      await apiClient.delete(`/vehicle-expense-cash/${id}`);
      fetchTransactions();
      toast.success('Transaksi berhasil dihapus');
    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast.error('Gagal menghapus transaksi');
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_type: 'debit_tempo',
      category_id: '',
      amount: '',
      description: '',
      reference_number: '',
      account: 'General',
      vehicle_id: '',
      nota_number: '',
      transaction_date: new Date().toISOString().split('T')[0],
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (type: string) => {
    const statusMap = {
      'debit': { label: 'Debit', class: 'bg-green-100 text-green-800' },
      'kredit': { label: 'Kredit', class: 'bg-red-100 text-red-800' },
      'debit_tempo': { label: 'Debit Tempo', class: 'bg-blue-100 text-blue-800' },
      'kredit_tempo': { label: 'Kredit Tempo', class: 'bg-orange-100 text-orange-800' },
    };
    const status = statusMap[type as keyof typeof statusMap] || { label: type, class: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.class}`}>
        {status.label}
      </span>
    );
  };

  if (loading) return <div className="text-center p-8">Loading vehicle expense transactions...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Kas Pengeluaran Mobil</h1>
        <button
          onClick={() => {
            resetForm();
            setEditingTransaction(null);
            setShowModal(true);
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          + Tambah Pengeluaran
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-700">Total Debit</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_debit)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <h3 className="text-lg font-semibold text-gray-700">Total Kredit</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_kredit)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-700">Debit Tempo</h3>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_debit_tempo)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <h3 className="text-lg font-semibold text-gray-700">Kredit Tempo</h3>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.total_kredit_tempo)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-700">Saldo</h3>
          <p className={`text-2xl font-bold ${summary.saldo >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
            {formatCurrency(summary.saldo)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
            <select
              value={filters.transaction_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, transaction_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Semua Tipe</option>
              <option value="debit">Debit</option>
              <option value="kredit">Kredit</option>
              <option value="debit_tempo">Debit Tempo</option>
              <option value="kredit_tempo">Kredit Tempo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan</label>
            <select
              value={filters.vehicle_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, vehicle_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Semua Kendaraan</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.license_plate} - {vehicle.type} ({vehicle.capacity}kg)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, category_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Semua Kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
            <input
              type="text"
              placeholder="Deskripsi, nota, atau referensi..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setFilters({
                transaction_type: '',
                category_id: '',
                date_from: '',
                date_to: '',
                search: '',
                account: 'All',
                vehicle_id: '',
              });
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nota No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kendaraan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deskripsi
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akun
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.no_nota?.[0] || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.vehicle ? (
                      <div>
                        <div className="font-medium">{transaction.vehicle.license_plate}</div>
                        <div className="text-xs text-gray-500">
                          {transaction.vehicle.type} - {transaction.vehicle.capacity}kg
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(transaction.transaction_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.category?.category_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      {transaction.reference_number && (
                        <div className="text-xs text-gray-500">Ref: {transaction.reference_number}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-medium ${
                      transaction.transaction_type === 'debit' || transaction.transaction_type === 'debit_tempo'
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'debit' || transaction.transaction_type === 'debit_tempo' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    {transaction.running_balance !== undefined ? (
                      <span className={transaction.running_balance >= 0 ? 'text-blue-600' : 'text-red-600'}>
                        {formatCurrency(transaction.running_balance)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.account}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      {(transaction.transaction_type === 'debit_tempo' ||
                        transaction.transaction_type === 'kredit_tempo') && (
                        <button
                          onClick={() => handleLunasi(transaction)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Lunasi
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Transaksi Pengeluaran Kendaraan</h3>
            <p className="text-gray-500 mb-4">Mulai dengan membuat transaksi pengeluaran kendaraan pertama Anda.</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))
                }
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setPagination((prev) => ({ ...prev, page }))}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.page === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit Transaction */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTransaction ? 'Edit Pengeluaran Kendaraan' : 'Tambah Pengeluaran Kendaraan'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan *</label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vehicle_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Pilih Kendaraan</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} - {vehicle.type} ({vehicle.capacity}kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Akun *</label>
                  <select
                    value={formData.account}
                    onChange={(e) => setFormData((prev) => ({ ...prev, account: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="Ewaldo">Ewaldo</option>
                    <option value="Malvin">Malvin</option>
                    <option value="Company">Company</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Transaksi *</label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        transaction_type: e.target.value as 'debit' | 'kredit' | 'debit_tempo' | 'kredit_tempo',
                        category_id: '',
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="debit">Debit (Pemasukan)</option>
                    <option value="kredit">Kredit (Pengeluaran)</option>
                    <option value="debit_tempo">Debit Tempo (Pemasukan Tempo)</option>
                    <option value="kredit_tempo">Kredit Tempo (Pengeluaran Tempo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories
                      .filter(
                        (cat) =>
                          (formData.transaction_type === 'debit' || formData.transaction_type === 'debit_tempo') && cat.category_type === 'income' ||
                          (formData.transaction_type === 'kredit' || formData.transaction_type === 'kredit_tempo') && cat.category_type === 'expense'
                      )
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.category_name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nota No</label>
                  <input
                    type="text"
                    value={formData.nota_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nota_number: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Nomor nota (opsional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Deskripsi pengeluaran..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Referensi</label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reference_number: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Nomor referensi (opsional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, transaction_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTransaction(null);
                      resetForm();
                    }}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    {editingTransaction ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lunasi Modal */}
      {showLunasiModal && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Lunasi Transaksi Tempo</h3>
              <div className="space-y-4">
                <p>Deskripsi: {selectedTransaction.description}</p>
                <p>Jumlah: {formatCurrency(selectedTransaction.amount)}</p>
                <p>Tipe saat ini: {selectedTransaction.transaction_type}</p>
                <p>Tipe baru: {selectedTransaction.transaction_type === 'debit_tempo' ? 'debit' : 'kredit'}</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Akun</label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Pilih Akun</option>
                    <option value="Ewaldo">Ewaldo</option>
                    <option value="Malvin">Malvin</option>
                    <option value="Company">Company</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLunasiModal(false)}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmLunasi}
                  disabled={!selectedAccount}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  Lunasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleExpenseCashPage;
