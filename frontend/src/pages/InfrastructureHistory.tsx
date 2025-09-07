// src/pages/InfrastructureHistory.tsx
import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import apiClient from "../api/axiosConfig";

interface InfrastructureTransaction {
  id: number;
  transaction_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  reference_type: string;
  supplier: string;
  notes: string;
  transaction_date: string;
  created_at: string;
  batch?: {
    batch_number: string;
    unit_price: number;
    supplier: string;
    purchase_date: string;
    expired_date?: string;
  };
}

interface InfrastructureBatch {
  id: number;
  batch_number: string;
  quantity: number;
  original_quantity: number;
  unit_price: number;
  purchase_date: string;
  expired_date?: string;
  supplier: string;
  notes: string;
  used_quantity: number;
  remaining_percentage: string;
  current_value: number;
  status: string;
}

interface InfrastructureItem {
  id: number;
  item_name: string;
  item_code: string;
  unit: string;
  current_quantity: number;
  min_quantity: number;
  average_unit_price: number;
  total_value: number;
  category?: { category_name: string };
  location?: { location_name: string };
}

interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

const InfrastructureHistory = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<InfrastructureTransaction[]>([]);
  const [batches, setBatches] = useState<InfrastructureBatch[]>([]);
  const [infrastructureItem, setInfrastructureItem] = useState<InfrastructureItem | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0
  });
  
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (id) {
      fetchInfrastructureItem();
      fetchBatches();
      
      // Check URL params for batch filter
      const urlParams = new URLSearchParams(location.search);
      const batchParam = urlParams.get('batch');
      if (batchParam) {
        setSelectedBatch(batchParam);
      }
    }
  }, [id, location.search]);

  useEffect(() => {
    if (id) {
      fetchTransactions();
    }
  }, [id, selectedBatch, pagination.page, filters]);

  const fetchInfrastructureItem = async () => {
    try {
      const response = await apiClient.get(`/infrastructure/${id}`);
      const itemData = response.data.success ? response.data.data : response.data;
      setInfrastructureItem(itemData);
    } catch (err) {
      console.error('Failed to fetch infrastructure item:', err);
      setError('Failed to load infrastructure item details');
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await apiClient.get(`/infrastructure/${id}/batches`);
      setBatches(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      if (selectedBatch) {
        params.append('batchId', selectedBatch);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await apiClient.get(`/infrastructure/${id}/history?${params.toString()}`);
      const responseData = response.data;
      
      setTransactions(responseData.data || []);
      
      if (responseData.pagination) {
        setPagination(prev => ({
          ...prev,
          totalPages: responseData.pagination.totalPages,
          totalItems: responseData.pagination.totalItems,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleBatchFilter = (batchId: string) => {
    setSelectedBatch(batchId);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', startDate: '', endDate: '' });
    setSelectedBatch('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'in':
        return <span className="px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded-full">IN</span>;
      case 'out':
        return <span className="px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded-full">OUT</span>;
      case 'adjustment':
        return <span className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">ADJ</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded-full">{type}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <Link
          to="/infrastructure"
          className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
        >
          Back to Infrastructure
        </Link>
      </div>
    );
  }

  if (!infrastructureItem) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading infrastructure item details...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Infrastructure History
            </h1>
            <div className="mt-2">
              <h2 className="text-xl text-gray-700">
                {infrastructureItem.item_name}
              </h2>
              <p className="text-gray-500">
                {infrastructureItem.item_code || 'No Code'} • 
                {infrastructureItem.category?.category_name || 'No Category'} • 
                {infrastructureItem.location?.location_name || 'No Location'}
              </p>
            </div>
          </div>
          <Link
            to="/infrastructure"
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
          >
            Back to Infrastructure
          </Link>
        </div>
      </div>

      {/* Item Summary */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Item Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {infrastructureItem.current_quantity} {infrastructureItem.unit}
            </div>
            <div className="text-sm text-gray-500">Current Quantity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(infrastructureItem.average_unit_price)}
            </div>
            <div className="text-sm text-gray-500">Average Price</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(infrastructureItem.total_value)}
            </div>
            <div className="text-sm text-gray-500">Total Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {infrastructureItem.min_quantity} {infrastructureItem.unit}
            </div>
            <div className="text-sm text-gray-500">Minimum Quantity</div>
          </div>
        </div>
      </div>

      {/* Batches Section */}
      {batches.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Batches</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expired Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {batch.batch_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.quantity} / {batch.original_quantity} {infrastructureItem.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(batch.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(batch.purchase_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.expired_date ? formatDate(batch.expired_date) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        batch.status === 'exhausted' ? 'bg-red-100 text-red-800' :
                        batch.status === 'unused' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {batch.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleBatchFilter(batch.id.toString())}
                        className={`px-3 py-1 text-xs rounded ${
                          selectedBatch === batch.id.toString()
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {selectedBatch === batch.id.toString() ? 'Filtered' : 'Filter'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Transaction History
            {selectedBatch && (
              <span className="ml-2 text-sm text-gray-500">
                (Filtered by batch)
              </span>
            )}
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-lg">Loading transactions...</div>
          </div>
        ) : (
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
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTransactionTypeBadge(transaction.transaction_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.quantity} {infrastructureItem.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.unit_price ? formatCurrency(transaction.unit_price) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.total_amount ? formatCurrency(transaction.total_amount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.batch?.batch_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
                  </span>{" "}
                  of <span className="font-medium">{pagination.totalItems}</span> results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
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
    </div>
  );
};

export default InfrastructureHistory;
