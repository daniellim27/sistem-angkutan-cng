// src/pages/DepositGroupManagement.tsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';

interface DepositGroup {
  id: number;
  group_name: string;
  balance: string;
  target_quantity: string;
  deposited_amount: string;
  remaining_quantity: string;
  unit: string;
  status: string;
  total_selisih_amount: string;
  selisih_details: string | null;
  selisih_status: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  customer_name: string;
  item_name: string;
  total_quantity: number;
  unit: string;
  unit_price: string;
  total_amount: string;
  status: string;
  deposit_group_id?: number;
  created_at: string;
}

interface DepositGroupWithMembers extends DepositGroup {
  purchase_orders: PurchaseOrder[];
  total_deposits: number;
  total_balance: number;
  po_count: number;
}

const DepositGroupManagement = () => {
  const [groups, setGroups] = useState<DepositGroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DepositGroupWithMembers | null>(null);
  const [editingGroup, setEditingGroup] = useState<DepositGroup | null>(null);
  const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);

  // Form data for creating/editing groups
  const [formData, setFormData] = useState({
    group_name: '',
    target_quantity: '',
    deposited_amount: '',
    unit: 'ton'
  });

  // Form data for creating POs
  const [poFormData, setPOFormData] = useState({
    po_number: '',
    customer_name: '',
    item_name: '',
    total_quantity: '',
    unit: 'ton',
    unit_price: '',
    load_location: '',
    unload_location: ''
  });

  // Unit options for selection
  const unitOptions = [
    { value: 'ton', label: 'Ton' },
    { value: 'kubik', label: 'Kubik (m³)' },
    { value: 'kilogram', label: 'Kilogram' }
  ];

  useEffect(() => {
    const initializeData = async () => {
      const purchaseOrders = await fetchAllPurchaseOrders();
      await fetchGroups(purchaseOrders); // Pass POs directly to avoid state timing issues
    };
    initializeData();
  }, []);

  const fetchAllPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
    try {
      setLoadingPOs(true);
      console.log('🔍 Debug - Fetching purchase orders...');
      const response = await apiClient.get('/purchase-orders?page=1&limit=20');
      console.log('🔍 Debug - Raw API response:', response);
      console.log('🔍 Debug - response.data:', response.data);
      const allPos = response.data?.data || response.data || [];
      console.log('🔍 Debug - Extracted POs:', allPos);
      setAllPurchaseOrders(allPos);
      return allPos;
    } catch (err) {
      console.error('Failed to fetch purchase orders:', err);
      setAllPurchaseOrders([]);
      return [];
    } finally {
      setLoadingPOs(false);
    }
  };

  const fetchGroups = async (purchaseOrders?: PurchaseOrder[]) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/deposit-groups');
      // The API returns data directly, not wrapped in a 'data' property
      const groupsData = response.data || [];
      
      // Use passed POs or fall back to state
      const posToUse = purchaseOrders || allPurchaseOrders;
      
      // Calculate balance as: deposited_amount - sum_of_po_amounts
      console.log('🔍 Debug - allPurchaseOrders length:', posToUse.length);
      console.log('🔍 Debug - allPurchaseOrders:', posToUse.map(po => ({ id: po.id, deposit_group_id: po.deposit_group_id })));
      console.log('🔍 Debug - groupsData:', groupsData.map((g: DepositGroup) => ({ id: g.id, name: g.group_name })));
      
      const transformedGroups = groupsData.map((group: DepositGroup) => {
        // Find POs for this group
        const groupPos = posToUse.filter((po: PurchaseOrder) => po.deposit_group_id === group.id);
        console.log(`🔍 Debug - Group ${group.id} (${group.group_name}): Found ${groupPos.length} POs`, groupPos.map(po => ({ id: po.id, deposit_group_id: po.deposit_group_id })));
        const totalPOAmount = groupPos.reduce((sum, po) => sum + parseFloat(po.total_amount), 0);
        const depositedAmount = parseFloat(group.deposited_amount);
        const calculatedBalance = depositedAmount - totalPOAmount;
        
        return {
          ...group,
          purchase_orders: groupPos,
          total_deposits: depositedAmount,
          total_balance: calculatedBalance, // Use calculated balance instead of API balance
          po_count: groupPos.length
        };
      });
      setGroups(transformedGroups);
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
      const payload = {
        ...formData,
        target_quantity: parseFloat(formData.target_quantity),
        deposited_amount: parseFloat(formData.deposited_amount),
        remaining_quantity: parseFloat(formData.target_quantity), // Initially same as target
        status: 'active'
      };

      if (editingGroup) {
        await apiClient.put(`/deposit-groups/${editingGroup.id}`, payload);
      } else {
        await apiClient.post('/deposit-groups', payload);
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
      target_quantity: group.target_quantity,
      deposited_amount: group.deposited_amount,
      unit: group.unit
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
      target_quantity: '',
      deposited_amount: '',
      unit: 'ton'
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingGroup(null);
    setShowCreateModal(true);
  };

  const openMembersModal = (group: DepositGroupWithMembers) => {
    setSelectedGroup(group);
    // POs are already calculated and stored in the group object
    setShowMembersModal(true);
  };

  const openPOModal = (group: DepositGroupWithMembers) => {
    setSelectedGroup(group);
    setShowPOModal(true);
  };

  const handlePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGroup) return;

    try {
      const payload = {
        ...poFormData,
        total_quantity: parseFloat(poFormData.total_quantity),
        unit_price: parseFloat(poFormData.unit_price),
        deposit_group_id: selectedGroup.id
      };

      await apiClient.post('/purchase-orders', payload);
      setShowPOModal(false);
      resetPOForm();
      // Refresh purchase orders first, then groups (so balance calculation has updated PO data)
      const updatedPOs = await fetchAllPurchaseOrders();
      fetchGroups(updatedPOs);
    } catch (err) {
      setError('Failed to create purchase order.');
      console.error(err);
    }
  };

  const resetPOForm = () => {
    setPOFormData({
      po_number: '',
      customer_name: '',
      item_name: '',
      total_quantity: '',
      unit: 'ton',
      unit_price: '',
      load_location: '',
      unload_location: ''
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowPOModal(false);
    setShowMembersModal(false);
    setEditingGroup(null);
    setSelectedGroup(null);
    resetForm();
    resetPOForm();
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

  // Get unit display name
  const getUnitLabel = (value: string) => {
    const unit = unitOptions.find(u => u.value === value);
    return unit ? unit.label : value;
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
            {/* Status Badge */}
            <div className={`px-4 py-2 text-xs font-medium text-white ${
              group.status === 'active' ? 'bg-green-600' : 
              group.status === 'fulfilled' ? 'bg-blue-600' : 
              group.status === 'overdrawn' ? 'bg-red-600' : 'bg-gray-600'
            }`}>
              {group.status.charAt(0).toUpperCase() + group.status.slice(1).replace('_', ' ')}
            </div>

            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{group.group_name}</h3>
              
              {/* Group Information */}
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Group Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Target:</span>
                    <span className="text-gray-900">{group.target_quantity} {getUnitLabel(group.unit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Remaining:</span>
                    <span className="text-gray-900">{group.remaining_quantity} {getUnitLabel(group.unit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Unit:</span>
                    <span className="text-gray-900">{getUnitLabel(group.unit)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(group.total_deposits)}
                  </div>
                  <div className="text-xs text-gray-500">Deposited Amount</div>
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

              {/* Selisih Information */}
              {group.selisih_status !== 'none' && (
                <div className="mb-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="text-sm font-medium text-yellow-900 mb-1">Selisih Status</h4>
                  <div className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-700 font-medium">Amount:</span>
                      <span className="text-yellow-900">{formatCurrency(parseFloat(group.total_selisih_amount))}</span>
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                      Status: {group.selisih_status}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Created {formatDate(group.created_at)}</span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => openPOModal(group)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-3 rounded"
                >
                  Add PO
                </button>
                <button
                  onClick={() => openMembersModal(group)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded"
                >
                  View POs
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
                {/* Group Name */}
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

                {/* Target Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.target_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_quantity: e.target.value }))}
                    placeholder="Enter target quantity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    {unitOptions.map(unit => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deposited Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deposited Amount (Rp) *
                  </label>
                  <input
                    type="number"
                    value={formData.deposited_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, deposited_amount: e.target.value }))}
                    placeholder="Enter deposited amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

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

      {/* PO Creation Modal */}
      {showPOModal && selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create Purchase Order in {selectedGroup.group_name}
              </h3>
              
              <form onSubmit={handlePOSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PO Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PO Number *
                    </label>
                    <input
                      type="text"
                      value={poFormData.po_number}
                      onChange={(e) => setPOFormData(prev => ({ ...prev, po_number: e.target.value }))}
                      placeholder="Enter PO number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={poFormData.customer_name}
                      onChange={(e) => setPOFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      placeholder="Enter customer name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={poFormData.item_name}
                      onChange={(e) => setPOFormData(prev => ({ ...prev, item_name: e.target.value }))}
                      placeholder="Enter item name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  {/* Total Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Quantity *
                    </label>
                    <input
                      type="number"
                      value={poFormData.total_quantity}
                      onChange={(e) => setPOFormData(prev => ({ ...prev, total_quantity: e.target.value }))}
                      placeholder="Enter quantity"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <select
                      value={poFormData.unit}
                      onChange={(e) => setPOFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      {unitOptions.map(unit => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Price (IDR) *
                    </label>
                    <input
                      type="number"
                      value={poFormData.unit_price}
                      onChange={(e) => setPOFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                      placeholder="Enter unit price"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  {/* SPBU Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SPBU Location
                    </label>
                    <input
                      type="text"
                      value={poFormData.load_location}
                      onChange={(e) => setPOFormData(prev => ({ ...prev, load_location: e.target.value }))}
                      placeholder="Enter SPBU location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Unload Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unload Location
                    </label>
                    <input
                      type="text"
                      value={poFormData.unload_location}
                      onChange={(e) => setPOFormData(prev => ({ ...prev, unload_location: e.target.value }))}
                      placeholder="Enter unload location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

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
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Create PO
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
                  Purchase Orders in {selectedGroup.group_name}
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

              {loadingPOs ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-500">Loading purchase orders...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PO Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedGroup.purchase_orders.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {po.po_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {po.customer_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {po.item_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {po.total_quantity} {getUnitLabel(po.unit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {formatCurrency(parseFloat(po.unit_price))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {formatCurrency(parseFloat(po.total_amount))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              po.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              po.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              po.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loadingPOs && selectedGroup.purchase_orders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No purchase orders in this group yet.</p>
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
