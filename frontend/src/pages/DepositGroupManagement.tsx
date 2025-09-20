// src/pages/DepositGroupManagement.tsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';

interface DeliveryOrder {
  id: number;
  do_number: string;
  customer_name: string;
  item_name: string;
  minimal_load_quantity: number;
  unit: string;
  unit_price: string;
  total_amount: string;
  final_amount: string;
  payment_status: string;
  status: string;
  member_quantity?: number;
  created_at: string;
}

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
  delivery_orders?: DeliveryOrder[]; // Added by backend response
  created_at: string;
  updated_at: string;
}

// Removed PurchaseOrder interface - system no longer relies on purchase orders

interface DepositGroupWithMembers extends DepositGroup {
  delivery_orders: DeliveryOrder[];
  total_deposits: number;
  total_balance: number;
  do_count: number;
}

const DepositGroupManagement = () => {
  const [groups, setGroups] = useState<DepositGroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDOModal, setShowDOModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DepositGroupWithMembers | null>(null);
  const [editingGroup, setEditingGroup] = useState<DepositGroup | null>(null);
  // Removed PO dependencies - system no longer relies on purchase orders
  // const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);
  // const [loadingPOs, setLoadingPOs] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingDriversVehicles, setLoadingDriversVehicles] = useState(false);

  // Form data for creating/editing groups
  const [formData, setFormData] = useState({
    group_name: '',
    target_quantity: '',
    deposited_amount: '',
    unit: 'kubik' // Fixed to kubik (m³)
  });

  // Form data for creating DOs - match delivery orders page structure
  const [doFormData, setDOFormData] = useState({
    customer_name: '',
    item_name: '',
    minimal_load_quantity: '',
    unit: 'kubik', // DOs always use kubik
    unit_price: '',
    load_location: '',
    unload_location: '',
    driver_id: '',
    vehicle_id: '',
    trip_allowance: '0',
    gaji: '0',
    do_name: '',
    paid_amount: '0',
    // Gas filling fields - match delivery orders page
    gas_volume_m3: '',
    spbg_location: '',
    calculation_method: 'jisdor' as 'jisdor' | 'fixed',
    jisdor_rate: '',
    gas_filling_cost: ''
  });

  // State for multiple unload locations - match delivery orders page
  const [unloadLocations, setUnloadLocations] = useState<string[]>(['']);

  // Unit is always kubik (m³) for deposit groups

  useEffect(() => {
    const initializeData = async () => {
      await fetchGroups(); // No longer need PO data
      await fetchDriversAndVehicles();
    };
    initializeData();
  }, []);

  const fetchDriversAndVehicles = async () => {
    try {
      setLoadingDriversVehicles(true);
      const [driversRes, vehiclesRes] = await Promise.all([
        apiClient.get('/users?role=driver'),
        apiClient.get('/vehicles')
      ]);
      setDrivers(driversRes.data.data || driversRes.data || []);
      setVehicles(vehiclesRes.data.data || vehiclesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch drivers and vehicles:', err);
    } finally {
      setLoadingDriversVehicles(false);
    }
  };

  // Removed fetchAllPurchaseOrders - system no longer relies on purchase orders

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/deposit-groups');
      // The API returns data directly, not wrapped in a 'data' property
      const groupsData = response.data || [];
      
      console.log('🔍 Debug - groupsData:', groupsData.map((g: DepositGroup) => ({ id: g.id, name: g.group_name })));
      
      const transformedGroups = groupsData.map((group: DepositGroup) => {
        // Calculate balance based on DO amounts (no longer use PO data)
        const depositedAmount = parseFloat(group.deposited_amount);
        const deliveryOrders = group.delivery_orders || [];
        const totalDOAmount = deliveryOrders.reduce((sum, do_item) => sum + parseFloat(do_item.total_amount), 0);
        const calculatedBalance = depositedAmount - totalDOAmount;
        
        return {
          ...group,
          delivery_orders: deliveryOrders, // Use DOs from backend response
          total_deposits: depositedAmount,
          total_balance: calculatedBalance,
          do_count: deliveryOrders.length
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
      unit: 'kubik' // Always kubik (m³)
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

  const openDOModal = (group: DepositGroupWithMembers) => {
    setSelectedGroup(group);
    setShowDOModal(true);
  };

  const handleDOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGroup) return;

    try {
      const payload = {
        customer_name: doFormData.customer_name,
        item_name: doFormData.item_name,
        unit: 'kubik', // Force kubik for DOs
        unit_price: parseFloat(doFormData.unit_price),
        minimal_load_quantity: parseFloat(doFormData.minimal_load_quantity),
        driver_id: parseInt(doFormData.driver_id),
        vehicle_id: parseInt(doFormData.vehicle_id),
        load_location: doFormData.load_location,
        unload_location: doFormData.unload_location,
        additional_unload_locations: unloadLocations.slice(1).filter(loc => loc.trim() !== ''), // Include only additional locations
        trip_allowance: parseFloat(doFormData.trip_allowance),
        gaji: parseFloat(doFormData.gaji),
        do_name: doFormData.do_name,
        deposit_group_id: selectedGroup.id,
        // Include gas filling data - match delivery orders page
        gas_volume_m3: doFormData.gas_volume_m3 ? parseFloat(doFormData.gas_volume_m3) : null,
        spbg_location: doFormData.spbg_location || null,
        calculation_method: doFormData.calculation_method,
        jisdor_rate: doFormData.jisdor_rate ? parseFloat(doFormData.jisdor_rate) : null,
        gas_filling_cost: doFormData.gas_filling_cost ? parseFloat(doFormData.gas_filling_cost) : null
      };

      // Use the same endpoint as delivery orders page
      await apiClient.post('/delivery-orders', payload);
      setShowDOModal(false);
      resetDOForm();
      resetUnloadLocations();
      // Refresh groups after creating DO (no longer need PO data)
      fetchGroups();
    } catch (err) {
      setError('Failed to create delivery order.');
      console.error(err);
    }
  };

  const resetDOForm = () => {
    setDOFormData({
      customer_name: '',
      item_name: '',
      minimal_load_quantity: '',
      unit: 'kubik',
      unit_price: '',
      load_location: '',
      unload_location: '',
      driver_id: '',
      vehicle_id: '',
      trip_allowance: '0',
      gaji: '0',
      do_name: '',
      paid_amount: '0',
      // Gas filling fields - match delivery orders page
      gas_volume_m3: '',
      spbg_location: '',
      calculation_method: 'jisdor' as 'jisdor' | 'fixed',
      jisdor_rate: '',
      gas_filling_cost: ''
    });
  };

  const resetUnloadLocations = () => {
    setUnloadLocations(['']);
  };

  // Functions to handle unload locations
  const addUnloadLocation = () => {
    setUnloadLocations([...unloadLocations, '']);
  };

  const updateUnloadLocation = (index: number, value: string) => {
    const updated = [...unloadLocations];
    updated[index] = value;
    setUnloadLocations(updated);
    // Update main unload location if it's the first one
    if (index === 0) {
      setDOFormData(prev => ({ ...prev, unload_location: value }));
    }
  };

  const removeUnloadLocation = (index: number) => {
    if (unloadLocations.length > 1 && index > 0) {
      const updated = unloadLocations.filter((_, i) => i !== index);
      setUnloadLocations(updated);
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowDOModal(false);
    setShowMembersModal(false);
    setEditingGroup(null);
    setSelectedGroup(null);
    resetForm();
    resetDOForm();
    resetUnloadLocations();
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

  // Get unit display name (always kubik for deposit groups)
  const getUnitLabel = (value: string) => {
    return "Kubik (m³)";
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
                  onClick={() => openDOModal(group)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-3 rounded"
                >
                  Add DO
                </button>
                 <button
                   onClick={() => openMembersModal(group)}
                   className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded"
                 >
                   View DOs
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

                {/* Unit (Fixed to m³) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value="Kubik (m³)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    disabled
                  />
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

      {/* DO Creation Modal */}
      {showDOModal && selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create Delivery Order in {selectedGroup.group_name}
              </h3>
              
              <form onSubmit={handleDOSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DO Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      DO Name *
                    </label>
                    <input
                      type="text"
                      value={doFormData.do_name}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, do_name: e.target.value }))}
                      placeholder="Enter DO name"
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
                      value={doFormData.customer_name}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, customer_name: e.target.value }))}
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
                      value={doFormData.item_name}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, item_name: e.target.value }))}
                      placeholder="Enter item name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>

                  {/* Driver */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver *
                    </label>
                    <select
                      value={doFormData.driver_id}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, driver_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select Driver</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.full_name || driver.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vehicle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle *
                    </label>
                    <select
                      value={doFormData.vehicle_id}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, vehicle_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.license_plate} - {vehicle.brand}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Minimal Load Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimal Load Quantity *
                    </label>
                    <input
                      type="number"
                      value={doFormData.minimal_load_quantity}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, minimal_load_quantity: e.target.value }))}
                      placeholder="Enter quantity"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Price (IDR) *
                    </label>
                    <input
                      type="number"
                      value={doFormData.unit_price}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                      placeholder="Enter unit price"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  {/* Trip Allowance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trip Allowance (IDR)
                    </label>
                    <input
                      type="number"
                      value={doFormData.trip_allowance}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, trip_allowance: e.target.value }))}
                      placeholder="Enter trip allowance"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Gaji */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gaji (IDR)
                    </label>
                    <input
                      type="number"
                      value={doFormData.gaji}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, gaji: e.target.value }))}
                      placeholder="Enter gaji"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Load Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Load Location
                    </label>
                    <input
                      type="text"
                      value={doFormData.load_location}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, load_location: e.target.value }))}
                      placeholder="Enter load location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Unload Locations */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unload Locations
                    </label>
                    {unloadLocations.map((location, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => updateUnloadLocation(index, e.target.value)}
                          placeholder={`Enter unload location ${index + 1}`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        />
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeUnloadLocation(index)}
                            className="px-2 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addUnloadLocation}
                      className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Add Unload Location
                    </button>
                  </div>

                  {/* Gas Volume */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gas Volume (m³)
                    </label>
                    <input
                      type="number"
                      value={doFormData.gas_volume_m3}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, gas_volume_m3: e.target.value }))}
                      placeholder="Enter gas volume"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* SPBG Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SPBG Location
                    </label>
                    <input
                      type="text"
                      value={doFormData.spbg_location}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, spbg_location: e.target.value }))}
                      placeholder="Enter SPBG location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Calculation Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calculation Method
                    </label>
                    <select
                      value={doFormData.calculation_method}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, calculation_method: e.target.value as 'jisdor' | 'fixed' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="jisdor">JISDOR</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>

                  {/* JISDOR Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      JISDOR Rate
                    </label>
                    <input
                      type="number"
                      value={doFormData.jisdor_rate}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, jisdor_rate: e.target.value }))}
                      placeholder="Enter JISDOR rate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Gas Filling Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gas Filling Cost (IDR)
                    </label>
                    <input
                      type="number"
                      value={doFormData.gas_filling_cost}
                      onChange={(e) => setDOFormData(prev => ({ ...prev, gas_filling_cost: e.target.value }))}
                      placeholder="Enter gas filling cost"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Unit (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value="Kubik (m³)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      disabled
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
                    Create DO
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
                  Delivery Orders in {selectedGroup.group_name}
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

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-500">Loading delivery orders...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DO Number
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
                          Payment Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedGroup.delivery_orders.map((do_item) => (
                        <tr key={do_item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {do_item.do_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {do_item.customer_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {do_item.item_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {do_item.minimal_load_quantity} Kubik
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {formatCurrency(parseFloat(do_item.unit_price))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {formatCurrency(parseFloat(do_item.total_amount))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              do_item.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                              do_item.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              do_item.payment_status === 'proses_tagihan' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {do_item.payment_status.replace('_', ' ').charAt(0).toUpperCase() + do_item.payment_status.replace('_', ' ').slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && selectedGroup.delivery_orders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No delivery orders in this group yet.</p>
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
