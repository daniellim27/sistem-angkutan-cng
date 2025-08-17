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
}

interface DepositGroupMember {
  id: number;
  member_name: string;
  member_type: 'driver' | 'vehicle' | 'company';
  member_id: number;
  deposit_amount: number;
  current_balance: number;
  last_transaction_date?: string;
  created_at: string;
}

interface DepositGroupWithMembers extends DepositGroup {
  members: DepositGroupMember[];
  total_deposits: number;
  total_balance: number;
  member_count: number;
}

const DepositGroupManagement = () => {
  const [groups, setGroups] = useState<DepositGroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DepositGroupWithMembers | null>(null);
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

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/deposit-groups');
      setGroups(response.data.data || []);
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
        await apiClient.put(`/deposit-groups/${editingGroup.id}`, formData);
      } else {
        await apiClient.post('/deposit-groups', formData);
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
      await apiClient.delete(`/deposit-groups/${id}`);
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

  const openMembersModal = (group: DepositGroupWithMembers) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowMembersModal(false);
    setEditingGroup(null);
    setSelectedGroup(null);
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
          <div key={group.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Group Type Badge */}
            <div className={`px-4 py-2 text-xs font-medium text-white ${
              group.group_type === 'spbg' ? 'bg-blue-600' : 'bg-gray-600'
            }`}>
              {group.group_type === 'spbg' ? 'SPBG Group' : 'General Group'}
            </div>

            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{group.group_name}</h3>
              
              {group.description && (
                <p className="text-gray-600 text-sm mb-3">{group.description}</p>
              )}

              {/* SPBG-specific information display */}
              {group.group_type === 'spbg' && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">SPBG Information</h4>
                  <div className="space-y-1 text-sm">
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

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(group.total_deposits)}
                  </div>
                  <div className="text-xs text-gray-500">Total Deposits</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    group.total_balance >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(group.total_balance)}
                  </div>
                  <div className="text-xs text-gray-500">Current Balance</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{group.member_count} members</span>
                <span>Created {formatDate(group.created_at)}</span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => openMembersModal(group)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded"
                >
                  View Members
                </button>
                <button
                  onClick={() => handleEdit(group)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(group.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm py-2 px-3 rounded"
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

      {/* Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Members of {selectedGroup.group_name}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deposit Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedGroup.members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {member.member_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            member.member_type === 'driver' ? 'bg-blue-100 text-blue-800' :
                            member.member_type === 'vehicle' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {member.member_type.charAt(0).toUpperCase() + member.member_type.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(member.deposit_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-medium ${
                            member.current_balance >= 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(member.current_balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.last_transaction_date ? formatDate(member.last_transaction_date) : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedGroup.members.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No members in this group yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositGroupManagement;
