// src/pages/DepositGroupManagement.tsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';

interface DepositGroup {
  id: number;
  group_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  // Enhanced with SPBG-specific fields
  group_type: 'general' | 'spbg'; // New field to distinguish SPBG groups
  spbg_location?: string; // SPBG location for SPBG groups
  spbg_operator?: string; // SPBG operator/company name
  gas_type?: 'cng' | 'lng' | 'lpg'; // Type of gas handled
  // Additional fields from API response
  balance: string;
  target_quantity: string;
  deposited_amount: string;
  remaining_quantity: string;
  unit: string;
  status: string;
  total_selisih_amount: string;
  selisih_details: any;
  selisih_status: string;
}

const DepositGroupManagement = () => {
  const [groups, setGroups] = useState<DepositGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DepositGroup | null>(null);

  // Enhanced form data with SPBG fields
  const [formData, setFormData] = useState({
    group_name: '',
    description: '',
    group_type: 'general' as 'general' | 'spbg',
    spbg_location: '',
    spbg_operator: '',
    gas_type: 'cng' as 'cng' | 'lng' | 'lpg'
  });

  // SPBG locations for selection
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

  // Gas types for SPBG groups
  const gasTypes = [
    { value: 'cng', label: 'CNG (Compressed Natural Gas)' },
    { value: 'lng', label: 'LNG (Liquefied Natural Gas)' },
    { value: 'lpg', label: 'LPG (Liquefied Petroleum Gas)' }
  ];

  useEffect(() => {
    fetchGroups();
  }, []);

  // Debug: Log groups state changes
  useEffect(() => {
    console.log('Groups state updated:', groups);
  }, [groups]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/deposit-groups');
      console.log('API Response:', response);
      console.log('Response data:', response.data);
      // The API returns an array directly, not wrapped in data property
      setGroups(response.data || []);
    } catch (err) {
      setError('Failed to fetch deposit groups.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingGroup) {
        await apiClient.put(`/api/web/deposit-groups/${editingGroup.id}`, formData);
      } else {
        await apiClient.post('/api/web/deposit-groups', formData);
      }
      
      setShowCreateModal(false);
      setEditingGroup(null);
      resetForm();
      fetchGroups();
    } catch (err) {
      setError('Failed to save deposit group.');
      console.error(err);
    }
  };

  const handleEdit = (group: DepositGroup) => {
    setEditingGroup(group);
    setFormData({
      group_name: group.group_name,
      description: group.description || '',
      group_type: group.group_type || 'general',
      spbg_location: group.spbg_location || '',
      spbg_operator: group.spbg_operator || '',
      gas_type: group.gas_type || 'cng'
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this deposit group?')) {
      return;
    }

    try {
      await apiClient.delete(`/api/web/deposit-groups/${id}`);
      fetchGroups();
    } catch (err) {
      setError('Failed to delete deposit group.');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      group_name: '',
      description: '',
      group_type: 'general',
      spbg_location: '',
      spbg_operator: '',
      gas_type: 'cng'
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingGroup(null);
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingGroup(null);
    resetForm();
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

  // Get SPBG location display name
  const getSPBGLocationLabel = (value: string) => {
    const location = spbgLocations.find(loc => loc.value === value);
    return location ? location.label : value;
  };

  // Get gas type display name
  const getGasTypeLabel = (value: string) => {
    const gasType = gasTypes.find(gas => gas.value === value);
    return gasType ? gasType.label : value;
  };

  if (loading) return <div className="text-center p-8">Loading deposit groups...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Deposit Group Management</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          + Create Deposit Group
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-200 overflow-hidden">
            {/* Group Type Badge */}
            <div className={`px-4 py-2 text-xs font-medium text-white ${
              group.group_type === 'spbg' ? 'bg-blue-600' : 'bg-gray-600'
            }`}>
              {group.group_type === 'spbg' ? 'SPBG Group' : 'General Group'}
            </div>

            <div className="p-6 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">{group.group_name}</h3>
              
              {group.description && (
                <p className="text-gray-600 text-sm mb-4 p-2 bg-gray-50 rounded border border-gray-200">{group.description}</p>
              )}

              {/* SPBG-specific information display */}
              {group.group_type === 'spbg' && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-3 border-b border-blue-300 pb-1">SPBG Information</h4>
                  <div className="space-y-2 text-sm">
                    {group.spbg_location && (
                      <div className="flex items-center">
                        <span className="text-blue-700 font-medium w-20">Location:</span>
                        <span className="text-blue-900">{getSPBGLocationLabel(group.spbg_location)}</span>
                      </div>
                    )}
                    {group.spbg_operator && (
                      <div className="flex items-center">
                        <span className="text-blue-700 font-medium w-20">Operator:</span>
                        <span className="text-blue-900">{group.spbg_operator}</span>
                      </div>
                    )}
                    {group.gas_type && (
                      <div className="flex items-center">
                        <span className="text-blue-700 font-medium w-20">Gas Type:</span>
                        <span className="text-blue-900">{getGasTypeLabel(group.gas_type)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(parseFloat(group.deposited_amount))}
                  </div>
                  <div className="text-xs text-gray-500">Total Deposits</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    parseFloat(group.balance) >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(parseFloat(group.balance))}
                  </div>
                  <div className="text-xs text-gray-500">Current Balance</div>
                </div>
              </div>

              {/* Additional SPBG Information */}
              {group.group_type === 'spbg' && (
                <div className="mb-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <h4 className="text-sm font-medium text-green-900 mb-3 border-b border-green-300 pb-1">Gas Station Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-white rounded border border-green-200">
                      <span className="text-green-700 font-medium">Target:</span>
                      <span className="ml-2 text-green-900 font-semibold">{group.target_quantity} {group.unit}</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-green-200">
                      <span className="text-green-700 font-medium">Remaining:</span>
                      <span className="ml-2 text-green-900 font-semibold">{group.remaining_quantity} {group.unit}</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-green-200">
                      <span className="text-green-700 font-medium">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        group.status === 'normal' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {group.status}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded border border-green-200">
                      <span className="text-green-700 font-medium">Selisih:</span>
                      <span className="ml-2 text-green-900 font-semibold">{formatCurrency(parseFloat(group.total_selisih_amount))}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span>Created {formatDate(group.created_at)}</span>
                <span className={`px-3 py-1 text-xs rounded-full border ${
                  group.status === 'normal' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                }`}>
                  {group.status}
                </span>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(group)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded border border-blue-600 hover:border-blue-700 transition-colors duration-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(group.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm py-2 px-3 rounded border border-red-600 hover:border-red-700 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Deposit Groups</h3>
          <p className="text-gray-500 mb-4">Start by creating your first deposit group.</p>
          <button
            onClick={openCreateModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Create Group
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingGroup ? 'Edit Deposit Group' : 'Create New Deposit Group'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Group Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Type *
                  </label>
                  <select
                    value={formData.group_type}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      group_type: e.target.value as 'general' | 'spbg',
                      // Reset SPBG fields when switching to general
                      ...(e.target.value === 'general' && {
                        spbg_location: '',
                        spbg_operator: '',
                        gas_type: 'cng'
                      })
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="general">General Deposit Group</option>
                    <option value="spbg">SPBG (Gas Station) Group</option>
                  </select>
                </div>

                {/* Basic Group Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={formData.group_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, group_name: e.target.value }))}
                    placeholder="Enter group name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter group description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                {/* SPBG-specific fields - only show when SPBG group type is selected */}
                {formData.group_type === 'spbg' && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">SPBG Information</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SPBG Location *
                        </label>
                        <select
                          value={formData.spbg_location}
                          onChange={(e) => setFormData(prev => ({ ...prev, spbg_location: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SPBG Operator
                        </label>
                        <input
                          type="text"
                          value={formData.spbg_operator}
                          onChange={(e) => setFormData(prev => ({ ...prev, spbg_operator: e.target.value }))}
                          placeholder="e.g., Pertamina, Shell, etc."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gas Type *
                        </label>
                        <select
                          value={formData.gas_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, gas_type: e.target.value as 'cng' | 'lng' | 'lpg' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        >
                          {gasTypes.map(gasType => (
                            <option key={gasType.value} value={gasType.value}>
                              {gasType.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    {editingGroup ? 'Update Group' : 'Create Group'}
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

export default DepositGroupManagement;
