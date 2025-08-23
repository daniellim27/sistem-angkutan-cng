// src/pages/CashManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import CreatableSelect from 'react-select/creatable';

interface CashCategory {
  id: number;
  category_name: string;
  category_type: 'income' | 'expense';
  description?: string;
}

interface CashTransaction {
  id: number;
  transaction_type: 'debit' | 'kredit';
  category_id?: number;
  amount: number;
  description: string;
  reference_number?: string;
  transaction_date: string;
  created_at: string;
  running_balance?: number;
  category?: CashCategory;
  account: string;
  attachment_urls?: Array<string>;
  no_nota?: string[];
  // SPBG-specific fields
  spbg_location?: string;
  gas_volume_m3?: number;
  calculation_method?: 'jisdor' | 'fixed';
  jisdor_rate?: number;
  gas_filling_cost?: number;
}

interface CashSummary {
  total_debit: number;
  total_kredit: number;
  saldo: number;
}

// SPBG locations for filtering
const spbgLocations = [
  { value: 'jakarta', label: 'Jakarta' },
  { value: 'bandung', label: 'Bandung' },
  { value: 'surabaya', label: 'Surabaya' },
  { value: 'semarang', label: 'Semarang' },
  { value: 'yogyakarta', label: 'Yogyakarta' },
  { value: 'medan', label: 'Medan' },
  { value: 'palembang', label: 'Palembang' },
  { value: 'makassar', label: 'Makassar' }
];

// Helper functions
const isSPBGTransaction = (transaction: CashTransaction) => {
  // Check if this is an SPBG transaction by category_id = 10 or by SPBG fields
  return transaction.category_id === 10 || 
         transaction.spbg_location || 
         transaction.gas_volume_m3 || 
         transaction.calculation_method;
};

const getSPBGLocationLabel = (value: string) => {
  const location = spbgLocations.find(loc => loc.value === value);
  return location ? location.label : value;
};

const CashManagementPage = () => {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [summary, setSummary] = useState<CashSummary>({
    total_debit: 0,
    total_kredit: 0,
    saldo: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpecialCategory, setIsSpecialCategory] = useState(false);
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    transaction_type: '',
    category_id: '',
    date_from: '',
    date_to: '',
    search: '',
    account: 'All'
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);
  const [formData, setFormData] = useState({
    transaction_type: 'debit' as 'debit' | 'kredit',
    category_id: '',
    amount: '',
    description: '',
    reference_number: '',
    account: 'General',
    transaction_date: new Date().toISOString().split('T')[0],
    no_nota: [] as string[],
    // SPBG-specific form fields
    spbg_location: '',
    gas_volume_m3: '',
    calculation_method: 'jisdor' as 'jisdor' | 'fixed',
    jisdor_rate: '',
    gas_filling_cost: ''
  });

  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>(formData.account);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await apiClient.get('/cash/accounts');
        setAccounts(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      }
    };
    fetchAccounts();
  }, []);

  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await apiClient.get(`/cash/transactions?${params}`);
      
      setTransactions(response.data.data || []);
      setSummary(response.data.summary || { total_debit: 0, total_kredit: 0, saldo: 0 });
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }));
    } catch (err) {
      setError('Failed to fetch cash transactions.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/cash/categories');
      setCategories(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [fetchTransactions, fetchCategories]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => handleAddFile(file));
    }
  };

  const handleAddFile = (file: File) => {
    setAttachmentFiles((prev) => [...prev, file]);
    setFormData((prev) => ({ ...prev, no_nota: [...prev.no_nota, ''] }));
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...attachmentFiles];
    newFiles.splice(index, 1);
    setAttachmentFiles(newFiles);

  const newNotas = [...formData.no_nota];
    newNotas.splice(index, 1);
    setFormData((prev) => ({ ...prev, no_nota: newNotas }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSpecialCategory) {
      setShowModal(false);
      if (formData.category_id === 'inventory_redirect') {
        navigate('/inventory/purchase');
      } else {
        navigate('/services');
      }
      return; // Exit early
    }

    // For SPBG transactions, calculate amount from gas filling cost
    let finalAmount = formData.amount;
    if (formData.category_id === '10') { // SPBG category ID is 10
      if (formData.gas_volume_m3 && formData.jisdor_rate) {
        finalAmount = (parseFloat(formData.gas_volume_m3) * parseFloat(formData.jisdor_rate)).toString();
      } else {
        setError('For SPBG transactions, Gas Volume and JISDOR Rate are required to calculate amount.');
        return;
      }
    }

    const submissionData = new FormData();

    // Append all form data with the calculated amount
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'no_nota') return; // Skip no_nota for now
      if (key === 'amount') {
        // Use the calculated amount for SPBG transactions
        submissionData.append(key, finalAmount);
      } else if (typeof value === 'string' || typeof value === 'number') {
        submissionData.append(key, value.toString());
      } else if (Array.isArray(value)) {
        submissionData.append(key, JSON.stringify(value)); // Serialize arrays
      }
    });

    submissionData.append('no_nota', JSON.stringify(formData.no_nota));
    
    attachmentFiles.forEach((file) => {
      submissionData.append('attachments', file);
    });

    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' }
      };

      if (editingTransaction) {
        await apiClient.put(`/cash/transactions/${editingTransaction.id}`, submissionData, config);
      } else {
        await apiClient.post('/cash/transactions', submissionData, config);
      }

      setShowModal(false);
      fetchTransactions();
    } catch (err) {
      console.error('Error saving transaction:', err);
      setError('Failed to save transaction.');
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, category_id: value }));
    
    // Handle special categories
    if (value === 'inventory_redirect' || value === 'service_redirect') {
      setIsSpecialCategory(true);
    } else if (value === '10') { // SPBG category ID is 10
      // For SPBG transactions, set default values and clear regular fields
      setFormData(prev => ({
        ...prev,
        category_id: value,
        amount: '', // Clear amount for SPBG transactions
        description: '', // Clear description for SPBG transactions
        spbg_location: '',
        gas_volume_m3: '',
        calculation_method: 'jisdor',
        jisdor_rate: '',
        gas_filling_cost: ''
      }));
      setIsSpecialCategory(false);
    } else {
      setIsSpecialCategory(false);
    }
  };

  const handleEdit = (transaction: CashTransaction) => {
    setEditingTransaction(transaction);
    
    // Check if this is an SPBG transaction
    const isSPBG = transaction.spbg_location || transaction.gas_volume_m3 || transaction.calculation_method;
    
    setFormData({
      transaction_type: transaction.transaction_type,
      category_id: isSPBG ? '10' : (transaction.category_id?.toString() || ''),
      amount: transaction.amount.toString(),
      description: transaction.description,
      reference_number: transaction.reference_number || '',
      transaction_date: transaction.transaction_date,
      account: transaction.account || 'General',
      no_nota: transaction.no_nota || [''],
      // Include SPBG fields
      spbg_location: transaction.spbg_location || '',
      gas_volume_m3: transaction.gas_volume_m3?.toString() || '',
      calculation_method: transaction.calculation_method || 'jisdor',
      jisdor_rate: transaction.jisdor_rate?.toString() || '',
      gas_filling_cost: transaction.gas_filling_cost?.toString() || ''
    });
    
    setAttachmentFiles([]);
    setIsSpecialCategory(false); // SPBG transactions are not special category
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      return;
    }

    try {
      await apiClient.delete(`/cash/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Failed to delete transaction.');
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_type: 'debit',
      category_id: '',
      amount: '',
      description: '',
      reference_number: '',
      account: 'General',
      transaction_date: new Date().toISOString().split('T')[0],
      no_nota: [''],
      // Reset SPBG fields
      spbg_location: '',
      gas_volume_m3: '',
      calculation_method: 'jisdor',
      jisdor_rate: '',
      gas_filling_cost: ''
    });
    setAttachmentFiles([]);
    setIsSpecialCategory(false);
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
      day: 'numeric'
    });
  };

  if (loading) return <div className="text-center p-8">Loading cash transactions...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Cash Book</h1>
        <button
          onClick={() => {
            resetForm();
            setEditingTransaction(null);
            setShowModal(true);
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          + Add Transaction
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-700">Total Debit</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_debit)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <h3 className="text-lg font-semibold text-gray-700">Total Credit</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_kredit)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-700">Balance</h3>
          <p className={`text-2xl font-bold ${summary.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(summary.saldo)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
          <h3 className="text-lg font-semibold text-gray-700">Total Transactions</h3>
          <p className="text-2xl font-bold text-gray-600">{pagination.total}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.transaction_type}
              onChange={(e) => setFilters(prev => ({ ...prev, transaction_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="debit">Debit</option>
              <option value="kredit">Credit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters(prev => ({ ...prev, category_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.category_name}
                  </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Description or reference..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <CreatableSelect
              value={filters.account === 'All' ? { label: 'All', value: 'All' } : { label: filters.account, value: filters.account }}
              options={[
                { label: 'All', value: 'All' },
                ...accounts.map(account => ({ label: account, value: account }))
              ]}
              onChange={(selected) => {
                const newAccount = selected?.value || 'All';
                setFilters(prev => ({ ...prev, account: newAccount }));
              }}
              onCreateOption={(inputValue) => {
                setFilters(prev => ({ ...prev, account: inputValue }));
              }}
              className="w-full"
            />
          </div>
        </div>
        
        {/* Enhanced Filter Section */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setFilters({
                transaction_type: '',
                category_id: '',
                date_from: '',
                date_to: '',
                search: '',
                account: 'All'
              });
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Reset Filter
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
        <CreatableSelect
          value={{ label: selectedAccount, value: selectedAccount }}
          options={accounts.map(account => ({ label: account, value: account }))}
          onChange={(selected) => {
            const newAccount = selected?.value || 'General';
            setSelectedAccount(newAccount);
            setFormData(prev => ({ ...prev, account: newAccount }));
          }}
          onCreateOption={(inputValue) => {
            setSelectedAccount(inputValue);
            setFormData(prev => ({ ...prev, account: inputValue }));
          }}
          className="w-full"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Note No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                {/* SPBG-specific columns - only show when SPBG transactions exist */}
                {transactions.some(isSPBGTransaction) && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SPBG Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gas Volume
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calculation
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const isSPBG = isSPBGTransaction(transaction);
                return (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.transaction_type === 'debit' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.transaction_type === 'debit' ? 'Debit' : 'Credit'}
                      </span>
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
                         {transaction.attachment_urls && transaction.attachment_urls.length > 0 ? (
                            <div className="space-y-1">
                              {transaction.attachment_urls.map((url, index) => (
                                <div key={index}>
                                  <a
                                    href={`${process.env.REACT_APP_BACKEND_URL}/${url}`}
                                    target="_blank"
                                    className="text-blue-500 hover:underline"
                                  >
                                    Nota {index + 1}
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : 'Tidak ada file'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {transaction.transaction_type === 'debit' ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(transaction.amount)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {transaction.transaction_type === 'kredit' ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(transaction.amount)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {transaction.running_balance !== undefined ? (
                        <span className={transaction.running_balance >= 0 ? 'text-blue-600' : 'text-red-600'}>
                          {formatCurrency(transaction.running_balance)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.no_nota 
                        ? Array.isArray(transaction.no_nota) 
                          ? transaction.no_nota.join(', ') 
                          : JSON.parse(transaction.no_nota).join(', ') 
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.account}
                    </td>
                    
                    {/* SPBG-specific information - only show when SPBG transactions exist */}
                    {transactions.some(isSPBGTransaction) && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isSPBG && transaction.spbg_location ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getSPBGLocationLabel(transaction.spbg_location)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isSPBG && transaction.gas_volume_m3 ? (
                            <span className="font-medium text-blue-600">
                              {transaction.gas_volume_m3} m³
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isSPBG && transaction.calculation_method ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.calculation_method === 'jisdor' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {transaction.calculation_method === 'jisdor' ? 'JISDOR' : 'Fixed Rate'}
                              {transaction.jisdor_rate && transaction.calculation_method === 'jisdor' && (
                                <span className="ml-1">({transaction.jisdor_rate})</span>
                              )}
                            </span>
                          ) : '-'}
                        </td>
                      </>
                    )}
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Transaksi</h3>
            <p className="text-gray-500 mb-4">Mulai dengan membuat transaksi kas pertama Anda.</p>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span> of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
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
                        onClick={() => setPagination(prev => ({ ...prev, page }))}
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
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
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

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Akun *</label>
                  <CreatableSelect
                    value={{ label: selectedAccount, value: selectedAccount }}
                    options={accounts.map(account => ({ label: account, value: account }))}
                    onChange={(selected) => {
                      const newAccount = selected?.value || 'General';
                      setSelectedAccount(newAccount);
                      setFormData(prev => ({ ...prev, account: newAccount }));
                    }}
                    onCreateOption={(inputValue) => {
                      setSelectedAccount(inputValue);
                      setFormData(prev => ({ ...prev, account: inputValue }));
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe Transaksi *
                  </label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        transaction_type: e.target.value as 'debit' | 'kredit',
                        category_id: ''
                      }));
                      setIsSpecialCategory(false);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="debit">Debit (Pemasukan)</option>
                    <option value="kredit">Kredit (Pengeluaran)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={handleCategoryChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories
                      .filter(cat => 
                        (formData.transaction_type === 'debit' && cat.category_type === 'income') ||
                        (formData.transaction_type === 'kredit' && cat.category_type === 'expense')
                      )
                      .map(category => (
                        <option key={category.id} value={category.id}>
                          {category.category_name}
                        </option>
                      ))}
                    
                    {/* SPBG Option */}
                    <option value="10">SPBG</option>
                    
                    {formData.transaction_type === 'kredit' && (
                      <option value="inventory_redirect">Inventory (Pembelian Stok)</option>
                    )}
                    {formData.transaction_type === 'kredit' && (
                      <option value="service_redirect">Servis</option>
                    )}
                  </select>
                </div>

                {/* Regular Transaction Fields - Show when NOT SPBG */}
                {!isSpecialCategory && formData.category_id !== '10' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jumlah *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="0"
                        required={!isSpecialCategory}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deskripsi *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        rows={3}
                        placeholder="Deskripsi transaksi..."
                        required={!isSpecialCategory}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nomor Referensi
                      </label>
                      <input
                        type="text"
                        value={formData.reference_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Nomor referensi (opsional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal Transaksi *
                      </label>
                      <input
                        type="date"
                        value={formData.transaction_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        required={!isSpecialCategory}
                      />
                    </div>
                  </>
                )}

                {/* SPBG Transaction Fields - Show when SPBG is selected */}
                {formData.category_id === '10' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal Transaksi *
                      </label>
                      <input
                        type="date"
                        value={formData.transaction_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        required
                      />
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-md font-medium text-gray-700 mb-3">⛽ SPBG Transaction Details</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SPBG Location *
                          </label>
                          <select
                            value={formData.spbg_location}
                            onChange={(e) => setFormData(prev => ({ ...prev, spbg_location: e.target.value }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            required
                          >
                            <option value="">Select SPBG Location</option>
                            {spbgLocations.map(location => (
                              <option key={location.value} value={location.value}>
                                {location.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gas Volume (m³) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.gas_volume_m3}
                            onChange={(e) => {
                              const volume = e.target.value;
                              setFormData(prev => ({ 
                                ...prev, 
                                gas_volume_m3: volume,
                                // Auto-calculate gas filling cost if both volume and rate are available
                                ...(volume && formData.jisdor_rate ? {
                                  gas_filling_cost: (parseFloat(volume) * parseFloat(formData.jisdor_rate)).toFixed(2)
                                } : {})
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="0.00"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Calculation Method *
                          </label>
                          <select
                            value={formData.calculation_method}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              calculation_method: e.target.value as 'jisdor' | 'fixed' 
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            required
                          >
                            <option value="jisdor">JISDOR Rate</option>
                            <option value="fixed">Fixed Rate</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            JISDOR Rate (IDR/m³) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.jisdor_rate}
                            onChange={(e) => {
                              const rate = e.target.value;
                              setFormData(prev => ({ 
                                ...prev, 
                                jisdor_rate: rate,
                                // Auto-calculate gas filling cost if both volume and rate are available
                                ...(rate && formData.gas_volume_m3 ? {
                                  gas_filling_cost: (parseFloat(formData.gas_volume_m3) * parseFloat(rate)).toFixed(2)
                                } : {})
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      {/* Auto-calculated Gas Filling Cost */}
                      {formData.gas_volume_m3 && formData.jisdor_rate && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <label className="block text-sm font-medium text-blue-700 mb-1">
                            Gas Filling Cost (Auto-calculated)
                          </label>
                          <div className="text-lg font-semibold text-blue-800">
                            {formatCurrency(parseFloat(formData.gas_volume_m3) * parseFloat(formData.jisdor_rate))}
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            {formData.gas_volume_m3} m³ × {formatCurrency(parseFloat(formData.jisdor_rate))} = {formatCurrency(parseFloat(formData.gas_volume_m3) * parseFloat(formData.jisdor_rate))}
                          </p>
                        </div>
                      )}

                      {/* SPBG Description */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SPBG Transaction Description *
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          rows={3}
                          placeholder="Describe the SPBG transaction (e.g., Gas filling at Jakarta SPBG, Deposit top-up, etc.)"
                          required
                        />
                      </div>

                      {/* SPBG Reference Number */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SPBG Reference Number
                        </label>
                        <input
                          type="text"
                          value={formData.reference_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="SPBG receipt number, invoice number, etc."
                        />
                      </div>

                      {/* SPBG File Upload */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload SPBG Documents</label>
                        <div className="flex items-center space-x-2">
                          <input
                            id="fileInput"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('fileInput')?.click()}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                          >
                            <span>+</span> <span className="ml-1">Tambah Dokumen SPBG</span>
                          </button>
                          {attachmentFiles.length > 0 && (
                            <div className="mt-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">New Files</label>
                              <ul className="space-y-1">
                                {attachmentFiles.map((file, index) => (
                                  <li key={index} className="text-sm text-gray-600 flex justify-between">
                                    <span>{file.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFile(index)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      ×
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Show existing attachments */}
                      {editingTransaction?.attachment_urls && 
                        editingTransaction.attachment_urls.length > 0 && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Existing Files</label>
                            <ul className="space-y-1">
                              {editingTransaction.attachment_urls.map((url, index) => (
                                <li key={index}>
                                  <a
                                    href={`${process.env.REACT_APP_BACKEND_URL}/${url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                  >
                                    Dokumen SPBG {index + 1}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  </>
                )}

                {/* File Upload Section - Show for regular transactions */}
                {!isSpecialCategory && formData.category_id !== '10' && (
                  <>
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Nota</label>
                      <div className="flex items-center space-x-2">
                        <input
                          id="fileInput"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('fileInput')?.click()}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                        >
                          <span>+</span> <span className="ml-1">Tambah Nota</span>
                        </button>
                        {attachmentFiles.length > 0 && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Files</label>
                            <ul className="space-y-1">
                              {attachmentFiles.map((file, index) => (
                                <li key={index} className="text-sm text-gray-600 flex justify-between">
                                  <span>{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Show existing attachments */}
                    {editingTransaction?.attachment_urls && 
                      editingTransaction.attachment_urls.length > 0 && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Existing Files</label>
                          <ul className="space-y-1">
                            {editingTransaction.attachment_urls.map((url, index) => (
                              <li key={index}>
                                <a
                                  href={`${process.env.REACT_APP_BACKEND_URL}/${url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline"
                                >
                                  Nota {index + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* No. Nota Section for Regular Transactions */}
                    {formData.no_nota.map((nota, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          No. Nota {index + 1}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={nota}
                            onChange={(e) => {
                              const newNotas = [...formData.no_nota];
                              newNotas[index] = e.target.value;
                              setFormData({ ...formData, no_nota: newNotas });
                            }}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                            placeholder="Masukkan nomor nota"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newNotas = [...formData.no_nota];
                              newNotas.splice(index, 1);
                              setFormData({ ...formData, no_nota: newNotas });
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                                 {/* No. Nota Section for SPBG Transactions */}
                 {formData.category_id === '10' && (
                   <>
                     {formData.no_nota.map((nota, index) => (
                       <div key={index}>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           No. Dokumen SPBG {index + 1}
                         </label>
                         <div className="flex gap-2">
                           <input
                             type="text"
                             value={nota}
                             onChange={(e) => {
                               const newNotas = [...formData.no_nota];
                               newNotas[index] = e.target.value;
                               setFormData({ ...formData, no_nota: newNotas });
                             }}
                             className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                             placeholder="Masukkan nomor dokumen SPBG"
                           />
                           <button
                             type="button"
                             onClick={() => {
                               const newNotas = [...formData.no_nota];
                               newNotas.splice(index, 1);
                               setFormData({ ...formData, no_nota: newNotas });
                             }}
                             className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm"
                           >
                             ×
                           </button>
                         </div>
                       </div>
                     ))}
                   </>
                 )}

                {isSpecialCategory && (
                  <div className="bg-blue-50 p-3 rounded-md text-blue-800">
                    {formData.category_id === 'inventory_redirect' ? (
                      <p>Anda akan diarahkan ke halaman pembelian stok</p>
                    ) : (
                      <p>Anda akan diarahkan ke halaman penjualan servis</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingTransaction(null);
                      resetForm();
                      setIsSpecialCategory(false);
                    }}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    {editingTransaction ? 'Update' : 'Lanjutkan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashManagementPage;
