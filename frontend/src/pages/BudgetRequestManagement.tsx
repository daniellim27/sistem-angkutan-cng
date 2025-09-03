import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';

interface BudgetRequest {
  id: number;
  requested_amount: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  evidence_url?: string;
  created_at: string;
  rejection_reason?: string;
  driver: {
    id: number;
    username: string;
    driverProfile?: {
      full_name: string;
    };
  };
  deliveryOrder: {
    id: number;
    do_number: string;
    customer_name: string;
    trip_allowance: number;
  };
}

const BudgetRequestManagement = () => {
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);

  useEffect(() => {
    fetchPendingBudgetRequests();
  }, []);

  const fetchPendingBudgetRequests = async () => {
    try {
      const response = await apiClient.get('/budget-requests/pending');
      setBudgetRequests(response.data.budgetRequests || []);
    } catch (error) {
      console.error('Error fetching budget requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      const response = await apiClient.put(`/budget-requests/${requestId}/approve`);
      // Remove from pending list
      setBudgetRequests(prev => prev.filter(req => req.id !== requestId));
      alert('Budget request approved successfully!');
    } catch (error: any) {
      console.error('Error approving budget request:', error);
      alert(`Failed to approve request: ${error.response?.data?.message || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessingId(selectedRequest.id);
    try {
      const response = await apiClient.put(`/budget-requests/${selectedRequest.id}/reject`, {
        rejection_reason: rejectionReason,
      });
      // Remove from pending list
      setBudgetRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      alert('Budget request rejected successfully!');
    } catch (error: any) {
      console.error('Error rejecting budget request:', error);
      alert(`Failed to reject request: ${error.response?.data?.message || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
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
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Budget Request Management</h1>
        <p className="mt-2 text-gray-600">Review and approve driver budget requests</p>
      </div>

      {budgetRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500 text-lg">
            No pending budget requests
          </div>
          <p className="text-gray-400 mt-2">
            All budget requests have been processed or there are no new requests.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {budgetRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {request.driver.driverProfile?.full_name || request.driver.username}
                    </h3>
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-gray-600 mb-1">
                    DO: {request.deliveryOrder.do_number} - {request.deliveryOrder.customer_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Current Trip Allowance: {formatCurrency(request.deliveryOrder.trip_allowance)}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(request.requested_amount)}
                  </p>
                  <p className="text-sm text-gray-500">Requested Amount</p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Reason for Request:</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{request.reason}</p>
                </div>
              </div>

              {request.evidence_url && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Supporting Evidence:</h4>
                  <a
                    href={request.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    📎 View Evidence
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Requested on {formatDate(request.created_at)}
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowRejectModal(true);
                    }}
                    disabled={processingId === request.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingId === request.id ? 'Processing...' : 'Reject'}
                  </button>
                  
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={processingId === request.id}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingId === request.id ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Budget Request
            </h3>
            
            <p className="text-gray-600 mb-4">
              Rejecting request from {selectedRequest.driver.driverProfile?.full_name || selectedRequest.driver.username} 
              for {formatCurrency(selectedRequest.requested_amount)}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
                placeholder="Please provide a clear reason for rejecting this request..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId === selectedRequest.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === selectedRequest.id ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetRequestManagement;
