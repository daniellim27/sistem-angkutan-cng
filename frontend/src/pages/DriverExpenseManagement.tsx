// src/pages/DriverExpenseManagement.tsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';

interface DriverExpense {
  id: number;
  jenis: string;
  amount: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  receipt_url?: string;
  created_at: string;
  approved_at?: string;
  driver: {
    id: number;
    username: string;
    driverProfile?: {
      full_name: string;
    };
  };
  deliveryOrder: {
    do_number: string;
    customer_name: string;
  };
  approvedBy?: {
    id: number;
    username: string;
  };
}

interface BudgetRequest {
  id: number;
  requested_amount: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  evidence_url?: string;
  created_at: string;
  approved_at?: string;
  driver: {
    id: number;
    username: string;
    driverProfile?: {
      full_name: string;
    };
  };
  deliveryOrder: {
    do_number: string;
    customer_name: string;
  };
  approver?: {
    id: number;
    username: string;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface GasExtraExpense {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  total_cost: string;
  biaya_lain_amount?: string;
  biaya_lain_description?: string;
  biaya_lain_photo_url?: string | null;
  created_at: string;
  driver?: {
    id: number;
    username: string;
    driverProfile?: {
      full_name: string;
    };
  };
  vehicle?: {
    id: number;
    license_plate: string;
    type?: string;
  };
  depositGroup?: {
    id: number;
    spbg_name?: string | null;
    spbg_location: string;
  };
}

const DriverExpenseManagement: React.FC = () => {
  const [expenses, setExpenses] = useState<DriverExpense[]>([]);
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [gasExtraExpenses, setGasExtraExpenses] = useState<GasExtraExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'expenses' | 'budgets' | 'gas-extra'>('expenses');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<DriverExpense | null>(null);
  const [selectedBudgetRequest, setSelectedBudgetRequest] = useState<BudgetRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const expenseTypes = {
    'bbm': 'BBM/Solar',
    'tol': 'Tol',
    'parkir': 'Parkir', 
    'makan': 'Makan',
    'pengeluaran_tambahan': 'Tambah Pengeluaran',
    'lainnya': 'Lain-lain'
  };

  useEffect(() => {
    if (activeTab === 'expenses') {
      fetchExpenses();
    } else if (activeTab === 'budgets') {
      fetchBudgetRequests();
    } else {
      fetchGasExtraExpenses();
    }
  }, [statusFilter, currentPage, activeTab]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await apiClient.get(`/expenses?${params}`);
      setExpenses(response.data.expenses);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError('Failed to fetch driver expenses.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await apiClient.get(`/budget-requests?${params}`);
      setBudgetRequests(response.data.budgetRequests || response.data.requests || []);
      setPagination({
        total: response.data.total || response.data.budgetRequests?.length || 0,
        page: currentPage,
        limit: 20,
        totalPages: Math.ceil((response.data.total || response.data.budgetRequests?.length || 0) / 20)
      });
    } catch (err: any) {
      setError('Failed to fetch budget requests.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGasExtraExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await apiClient.get(`/gas-transactions/driver-extra-expenses?${params}`);

      // For this endpoint, api interceptor returns `data` as the nested `data` field
      const { items, pagination: apiPagination } = response.data || {};

      setGasExtraExpenses(items || []);
      if (apiPagination) {
        setPagination(apiPagination);
      } else {
        setPagination({
          total: items?.length || 0,
          page: currentPage,
          limit: 20,
          totalPages: Math.max(1, Math.ceil((items?.length || 0) / 20)),
        });
      }
    } catch (err: any) {
      setError('Failed to fetch driver extra gas expenses.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(parseFloat(amount));
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

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const handleApproveExpense = async (expense: DriverExpense) => {
    setSelectedExpense(expense);
    setShowApprovalModal(true);
  };

  const handleRejectExpense = async (expense: DriverExpense) => {
    setSelectedExpense(expense);
    setRejectionReason('');
    setShowApprovalModal(true);
  };

  const confirmApproval = async () => {
    if (!selectedExpense) return;

    setActionLoading(true);
    try {
      await apiClient.put(`/expenses/${selectedExpense.id}/approve`);
      setShowApprovalModal(false);
      setSelectedExpense(null);
      fetchExpenses(); // Refresh the list
    } catch (err: any) {
      console.error('Error approving expense:', err);
      alert('Failed to approve expense');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRejection = async () => {
    if (!selectedExpense || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.put(`/expenses/${selectedExpense.id}/reject`, {
        rejection_reason: rejectionReason
      });
      setShowApprovalModal(false);
      setSelectedExpense(null);
      setRejectionReason('');
      fetchExpenses(); // Refresh the list
    } catch (err: any) {
      console.error('Error rejecting expense:', err);
      alert('Failed to reject expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveBudgetRequest = async (request: BudgetRequest) => {
    setSelectedBudgetRequest(request);
    setShowApprovalModal(true);
  };

  const handleRejectBudgetRequest = async (request: BudgetRequest) => {
    setSelectedBudgetRequest(request);
    setRejectionReason('');
    setShowApprovalModal(true);
  };

  const confirmBudgetApproval = async () => {
    if (!selectedBudgetRequest) return;

    setActionLoading(true);
    try {
      await apiClient.put(`/budget-requests/${selectedBudgetRequest.id}/approve`);
      setShowApprovalModal(false);
      setSelectedBudgetRequest(null);
      fetchBudgetRequests(); // Refresh the list
    } catch (err: any) {
      console.error('Error approving budget request:', err);
      alert('Failed to approve budget request');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmBudgetRejection = async () => {
    if (!selectedBudgetRequest || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.put(`/budget-requests/${selectedBudgetRequest.id}/reject`, {
        rejection_reason: rejectionReason
      });
      setShowApprovalModal(false);
      setSelectedBudgetRequest(null);
      setRejectionReason('');
      fetchBudgetRequests(); // Refresh the list
    } catch (err: any) {
      console.error('Error rejecting budget request:', err);
      alert('Failed to reject budget request');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (loading) return <div className="text-center p-8">Loading driver expenses...</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Financial Management</h1>
          <p className="text-gray-600">Kelola pengeluaran driver dan permintaan tambahan budget</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('expenses');
              setCurrentPage(1);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expenses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Driver Expenses
          </button>
          <button
            onClick={() => {
              setActiveTab('budgets');
              setCurrentPage(1);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'budgets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💸 Budget Requests
          </button>
          <button
            onClick={() => {
              setActiveTab('gas-extra');
              setCurrentPage(1);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'gas-extra'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ⛽ Biaya Lain (Gas)
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <button
            onClick={() => activeTab === 'expenses' ? fetchExpenses() : fetchBudgetRequests()}
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Expenses/Budget Requests Table */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jenis Pengeluaran
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {expense.driver.driverProfile?.full_name || expense.driver.username}
                      </div>
                      <div className="text-sm text-gray-500">{expense.driver.username}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{expense.deliveryOrder.do_number}</div>
                    <div className="text-sm text-gray-500">{expense.deliveryOrder.customer_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {expenseTypes[expense.jenis as keyof typeof expenseTypes] || expense.jenis}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(expense.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(expense.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {expense.notes || '-'}
                    {expense.rejection_reason && (
                      <div className="text-red-600 text-xs mt-1">
                        Rejected: {expense.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {expense.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveExpense(expense)}
                            className="text-green-600 hover:text-green-900 px-2 py-1 bg-green-100 rounded text-xs"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleRejectExpense(expense)}
                            className="text-red-600 hover:text-red-900 px-2 py-1 bg-red-100 rounded text-xs"
                          >
                            ✗ Reject
                          </button>
                        </>
                      )}
                      {expense.receipt_url && (
                        <a
                          href={`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/${expense.receipt_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 px-2 py-1 bg-blue-100 rounded text-xs"
                        >
                          📄 Receipt
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * 20) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 20, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Budget Requests Table */}
      {activeTab === 'budgets' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgetRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.driver.driverProfile?.full_name || request.driver.username}
                        </div>
                        <div className="text-sm text-gray-500">{request.driver.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.deliveryOrder.do_number}</div>
                      <div className="text-sm text-gray-500">{request.deliveryOrder.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(request.requested_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {request.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveBudgetRequest(request)}
                              className="text-green-600 hover:text-green-900 px-2 py-1 bg-green-100 rounded text-xs"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleRejectBudgetRequest(request)}
                              className="text-red-600 hover:text-red-900 px-2 py-1 bg-red-100 rounded text-xs"
                            >
                              ✗ Reject
                            </button>
                          </>
                        )}
                        {request.evidence_url && (
                          <a
                            href={`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/${request.evidence_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 bg-blue-100 rounded text-xs"
                          >
                            📎 Evidence
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination for Budget Requests */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((currentPage - 1) * 20) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * 20, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gas Extra Expenses Table (from gas transactions) */}
      {activeTab === 'gas-extra' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver & Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SPBG / Deposit Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Biaya Lain Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gas Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Picture
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gasExtraExpenses.map((tx) => {
                  const backendBase =
                    process.env.REACT_APP_BACKEND_URL ||
                    (process.env.REACT_APP_API_URL
                      ? process.env.REACT_APP_API_URL.replace('/api/web', '').replace('/api', '')
                      : 'http://localhost:3000');

                  const biayaAmount = tx.biaya_lain_amount || '0';

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tx.driver?.driverProfile?.full_name || tx.driver?.username || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tx.vehicle?.license_plate || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {tx.depositGroup?.spbg_name || tx.depositGroup?.spbg_location || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(biayaAmount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {tx.biaya_lain_description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(tx.total_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(tx.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {tx.biaya_lain_photo_url ? (
                          <a
                            href={`${backendBase}${tx.biaya_lain_photo_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 bg-blue-100 rounded text-xs"
                          >
                            🖼 View
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">No Image</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination for Gas Extra Expenses */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((currentPage - 1) * 20) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * 20, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {showApprovalModal && (selectedExpense || selectedBudgetRequest) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {rejectionReason !== undefined 
                        ? (selectedExpense ? 'Reject Expense' : 'Reject Budget Request')
                        : (selectedExpense ? 'Approve Expense' : 'Approve Budget Request')
                      }
                    </h3>
                    
                    <div className="mb-4">
                      {selectedExpense ? (
                        <>
                          <p><strong>Driver:</strong> {selectedExpense.driver.driverProfile?.full_name || selectedExpense.driver.username}</p>
                          <p><strong>DO:</strong> {selectedExpense.deliveryOrder.do_number}</p>
                          <p><strong>Type:</strong> {expenseTypes[selectedExpense.jenis as keyof typeof expenseTypes] || selectedExpense.jenis}</p>
                          <p><strong>Amount:</strong> {formatCurrency(selectedExpense.amount)}</p>
                          {selectedExpense.notes && <p><strong>Notes:</strong> {selectedExpense.notes}</p>}
                        </>
                      ) : selectedBudgetRequest ? (
                        <>
                          <p><strong>Driver:</strong> {selectedBudgetRequest.driver.driverProfile?.full_name || selectedBudgetRequest.driver.username}</p>
                          <p><strong>DO:</strong> {selectedBudgetRequest.deliveryOrder.do_number}</p>
                          <p><strong>Requested Amount:</strong> {formatCurrency(selectedBudgetRequest.requested_amount)}</p>
                          <p><strong>Reason:</strong> {selectedBudgetRequest.reason}</p>
                        </>
                      ) : null}
                    </div>

                    {rejectionReason !== undefined && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rejection Reason:
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Please provide a reason for rejection..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={rejectionReason !== undefined 
                    ? (selectedExpense ? confirmRejection : confirmBudgetRejection)
                    : (selectedExpense ? confirmApproval : confirmBudgetApproval)
                  }
                  disabled={actionLoading || (rejectionReason !== undefined && !rejectionReason.trim())}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    rejectionReason !== undefined 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {actionLoading ? 'Processing...' : (rejectionReason !== undefined ? 'Reject' : 'Approve')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedExpense(null);
                    setSelectedBudgetRequest(null);
                    setRejectionReason('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverExpenseManagement;
