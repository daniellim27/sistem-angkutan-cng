// src/pages/DepositGroupManagement.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '../api/axiosConfig';
import { GasStationApi } from '../api/gasStationApi';
import { convertMoneyToVolume, formatVolume } from '../utils/volumeConversionUtils';
import { getImageUrl } from '../utils/imageUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

interface DeliveryOrder {
  id: number;
  do_number: string;
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
  spbg_name?: string | null; // Optional SPBG name
  spbg_location: string;
  latitude?: number | string | null; // Coordinate fields
  longitude?: number | string | null;
  balance: string;
  deposited_amount: string;
  remaining_quantity: string;
  completed_quantity: string;
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
  total_completed_amount: number;
  do_count: number;
}

interface Customer {
  id: number;
  customer_name: string;
  location: string;
  display_name: string;
}
 
const DepositGroupManagement = () => {
  const [groups, setGroups] = useState<DepositGroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showTagihanModal, setShowTagihanModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showBalancingModal, setShowBalancingModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DepositGroupWithMembers | null>(null);
  const [selectedDOPhotos, setSelectedDOPhotos] = useState<{do_number: string, photos: string[]} | null>(null);
  // Removed PO dependencies - system no longer relies on purchase orders
  // const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);
  // const [loadingPOs, setLoadingPOs] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [gasStations, setGasStations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingDriversVehicles, setLoadingDriversVehicles] = useState(false);
  
  // JISDOR rate state for automatic calculation
  const [currentJisdorRate, setCurrentJisdorRate] = useState<number | null>(null);

  // Form data for creating/editing groups
  const [formData, setFormData] = useState({
    spbg_name: '', // New: SPBG name field
    spbg_location: '',
    coordinateInput: '', // Single input: "lat, lng"
    deposited_amount: '',
    unit: 'kubik' // Fixed to kubik (m³)
  });

  // Input method selection: 'location' or 'coordinate'
  const [locationInputMethod, setLocationInputMethod] = useState<'location' | 'coordinate'>('location');

  // Form data for top up
  const [topUpAmount, setTopUpAmount] = useState('');

  // Inline editing state
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [editingLocationName, setEditingLocationName] = useState('');

  // Tagihan state
  const [tagihanData, setTagihanData] = useState<any>(null);
  const [loadingTagihan, setLoadingTagihan] = useState(false);

  // Balancing state
  const [balancingData, setBalancingData] = useState<any>(null);
  const [loadingBalancing, setLoadingBalancing] = useState(false);
  
  // Pagination state for balancing transactions
  const [balancingPage, setBalancingPage] = useState(1);
  const [balancingPageSize] = useState(10);
  const [balancingTotalPages, setBalancingTotalPages] = useState(1);

  // Unit is always kubik (m³) for deposit groups

  useEffect(() => {
    const initializeData = async () => {
      await fetchGroups(); // No longer need PO data
      await fetchDriversAndVehicles();
      await fetchCurrentJisdorRate();
    };
    initializeData();
  }, []);


  const fetchDriversAndVehicles = async () => {
    try {
      setLoadingDriversVehicles(true);
      const [driversRes, vehiclesRes, gasStationsRes, customersRes] = await Promise.all([
        apiClient.get('/users?role=driver&status=available'),
        apiClient.get('/vehicles?status=available'),
        GasStationApi.getAllGasStations(),
        apiClient.get('/customers/locations')
      ]);
      setDrivers(driversRes.data.data || driversRes.data || []);
      setVehicles(vehiclesRes.data.data || vehiclesRes.data || []);
      setGasStations(gasStationsRes.data || []);
      setCustomers(customersRes.data.data || customersRes.data || []);
    } catch (err) {
      console.error('Failed to fetch drivers, vehicles, gas stations, and customers:', err);
    } finally {
      setLoadingDriversVehicles(false);
    }
  };

  // Fetch current JISDOR rate
  const fetchCurrentJisdorRate = async () => {
    try {
      console.log('🔄 Fetching current JISDOR rate...');
      const response = await apiClient.get('/exchange-rates/current');
      
      if (response.data.success) {
        const rate = response.data.data.rate;
        
        setCurrentJisdorRate(rate);
        console.log('✅ JISDOR rate fetched successfully:', rate);
      } else {
        throw new Error('API response indicates failure');
      }
    } catch (err) {
      console.error('Failed to fetch JISDOR rate:', err);
      // Set default JISDOR rate if API fails
      setCurrentJisdorRate(16364.42);
    }
  };

  // Removed fetchAllPurchaseOrders - system no longer relies on purchase orders

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/deposit-groups');
      // The API returns data directly, not wrapped in a 'data' property
      const groupsData = response.data || [];
      
      console.log('🔍 Debug - groupsData:', groupsData.map((g: DepositGroup) => ({ id: g.id, name: g.spbg_location })));
      
      const transformedGroups = groupsData.map((group: DepositGroup) => {
        // Calculate balance based on DO amounts (no longer use PO data)
        const depositedAmount = parseFloat(group.deposited_amount) || 0; // Handle null/empty values gracefully
        const deliveryOrders = group.delivery_orders || [];
        const totalDOAmount = deliveryOrders.reduce((sum, do_item) => sum + parseFloat(do_item.total_amount), 0);
        const calculatedBalance = depositedAmount - totalDOAmount;
        
        return {
          ...group,
          delivery_orders: deliveryOrders, // Use DOs from backend response
          total_deposits: depositedAmount,
          total_balance: calculatedBalance,
          total_completed_amount: totalDOAmount,
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
      let latitude: number | null = null;
      let longitude: number | null = null;
      let spbgLocationValue: string = '';

      if (locationInputMethod === 'coordinate') {
        // Coordinate method: require and parse coordinates
        const coordinateText = formData.coordinateInput.trim();
        
        if (!coordinateText) {
          alert('Coordinates are required when using coordinate input method.');
          return;
        }

        const parts = coordinateText.split(',').map(p => p.trim());
        if (parts.length !== 2 || parts.some(p => p === '')) {
          alert('Invalid coordinates. Use format: "-6.2, 106.8".');
          return;
        }

        latitude = parseFloat(parts[0]);
        longitude = parseFloat(parts[1]);

        if (isNaN(latitude) || latitude < -90 || latitude > 90) {
          alert('Invalid latitude. Must be between -90 and 90.');
          return;
        }
        if (isNaN(longitude) || longitude < -180 || longitude > 180) {
          alert('Invalid longitude. Must be between -180 and 180.');
          return;
        }

        spbgLocationValue = `${latitude}, ${longitude}`;
      } else {
        // Location method: require location address
        if (!formData.spbg_location.trim()) {
          alert('SPBG location is required when using location input method.');
          return;
        }

        spbgLocationValue = formData.spbg_location;

        // Optionally parse coordinates if provided (for backward compatibility)
        const coordinateText = formData.coordinateInput.trim();
        if (coordinateText) {
          const parts = coordinateText.split(',').map(p => p.trim());
          if (parts.length === 2 && !parts.some(p => p === '')) {
            const parsedLat = parseFloat(parts[0]);
            const parsedLng = parseFloat(parts[1]);
            if (!isNaN(parsedLat) && !isNaN(parsedLng) && 
                parsedLat >= -90 && parsedLat <= 90 && 
                parsedLng >= -180 && parsedLng <= 180) {
              latitude = parsedLat;
              longitude = parsedLng;
            }
          }
        }
      }
      
      const payload = {
        spbg_name: formData.spbg_name || undefined, // Optional SPBG name
        spbg_location: spbgLocationValue,
        latitude,
        longitude,
        deposited_amount: formData.deposited_amount ? parseFloat(formData.deposited_amount) : 0,
        status: 'active'
      };

      const response = await apiClient.post('/deposit-groups', payload);
      
      // Check if SPBG was created with coordinates
      const createdGroup = response.data;
      const hasCoords = createdGroup?.latitude != null && createdGroup?.longitude != null;
      
      if (locationInputMethod === 'location' && !hasCoords) {
        toast.success('SPBG created successfully');
        toast(
          '⚠️ Location geocoding may take a moment. If SPBG doesn\'t appear on map, try editing with Coordinate input method.',
          { icon: '📍', duration: 6000 }
        );
      } else {
        toast.success('SPBG created successfully');
      }
      
      setShowCreateModal(false);
      resetForm();
      fetchGroups();
    } catch (err) {
      setError('Failed to create deposit group.');
      toast.error('Failed to create SPBG');
      console.error(err);
    }
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
      spbg_name: '',
      spbg_location: '',
      coordinateInput: '',
      deposited_amount: '',
      unit: 'kubik' // Always kubik (m³)
    });
    setLocationInputMethod('location');
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openMembersModal = (group: DepositGroupWithMembers) => {
    setSelectedGroup(group);
    // POs are already calculated and stored in the group object
    setShowMembersModal(true);
  };

  const openTopUpModal = (group: DepositGroupWithMembers) => {
    setSelectedGroup(group);
    setTopUpAmount('');
    setShowTopUpModal(true);
  };

  const openTagihanModal = async (group: DepositGroupWithMembers) => {
    setSelectedGroup(group);
    setShowTagihanModal(true);
    setLoadingTagihan(true);
    
    try {
      const response = await apiClient.get(`/deposit-groups/${group.id}/tagihan`);
      console.log('Tagihan API Response:', response.data);
      
      // Handle both intercepted and non-intercepted response structures
      const data = response.data.data || response.data;
      setTagihanData(data);
    } catch (err: any) {
      console.error('Failed to fetch tagihan data:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load billing data';
      setError(`Failed to load billing data: ${errorMessage}`);
    } finally {
      setLoadingTagihan(false);
    }
  };

  const openBalancingModal = async (group: DepositGroupWithMembers) => {
    setSelectedGroup(group);
    setShowBalancingModal(true);
    setBalancingPage(1); // Reset to first page
    await fetchBalancingData(group.id, 1);
  };

  const fetchBalancingData = async (groupId: number, page: number = balancingPage) => {
    setLoadingBalancing(true);
    
    try {
      const response = await apiClient.get(`/deposit-groups/${groupId}/balancing-report`, {
        params: {
          page: page,
          pageSize: balancingPageSize
        }
      });
      console.log('Balancing API Response:', response.data);
      
      // Handle both intercepted and non-intercepted response structures
      const data = response.data.data || response.data;
      setBalancingData(data);
      
      // Update pagination info
      if (data.pagination) {
        setBalancingTotalPages(data.pagination.totalPages);
        setBalancingPage(data.pagination.currentPage);
      }
    } catch (err: any) {
      console.error('Failed to fetch balancing data:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load balancing data';
      setError(`Failed to load balancing data: ${errorMessage}`);
    } finally {
      setLoadingBalancing(false);
    }
  };

  const handleBalancingPageChange = async (newPage: number) => {
    if (selectedGroup && newPage >= 1 && newPage <= balancingTotalPages) {
      await fetchBalancingData(selectedGroup.id, newPage);
    }
  };

  const startEditingLocation = (group: DepositGroupWithMembers) => {
    setEditingLocationId(group.id);
    setEditingLocationName(group.spbg_location);
  };

  const cancelEditingLocation = () => {
    setEditingLocationId(null);
    setEditingLocationName('');
  };

  const saveLocationName = async (groupId: number) => {
    try {
      if (!editingLocationName.trim()) {
        setError('Location name cannot be empty');
        return;
      }

      await apiClient.put(`/deposit-groups/${groupId}`, {
        spbg_location: editingLocationName.trim()
      });

      setEditingLocationId(null);
      setEditingLocationName('');
      fetchGroups();
    } catch (err) {
      setError('Failed to update location name.');
      console.error(err);
    }
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGroup) return;

    try {
      const amount = parseFloat(topUpAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount greater than 0');
        return;
      }

      await apiClient.post(`/deposit-groups/${selectedGroup.id}/topup`, { amount });
      
      setShowTopUpModal(false);
      setTopUpAmount('');
      setSelectedGroup(null);
      fetchGroups();
    } catch (err) {
      setError('Failed to top up balance.');
      console.error(err);
    }
  };

  const handleConfirmOCR = async (deliveryOrder: any) => {
    const confirmed = window.confirm(
      `Confirm OCR data for ${deliveryOrder.do_number}?\n\n` +
      `OCR Volume: ${deliveryOrder.surat_jalan_volume_extracted} m³\n` +
      `Gas Volume: ${deliveryOrder.gas_volume_m3} m³\n\n` +
      `Do you want to confirm this volume?`
    );

    if (!confirmed) return;

    try {
      await apiClient.post(`/deposit-groups/delivery-orders/${deliveryOrder.id}/confirm-surat-jalan-ocr`, {
        confirmed_volume: deliveryOrder.surat_jalan_volume_extracted
      });

      // Refresh tagihan data
      if (selectedGroup) {
        const response = await apiClient.get(`/deposit-groups/${selectedGroup.id}/tagihan`);
        setTagihanData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to confirm OCR data:', err);
      setError('Failed to confirm OCR data');
    }
  };

  const handleRetryOCR = async (deliveryOrder: any) => {
    const confirmed = window.confirm(
      `Retry OCR processing for ${deliveryOrder.do_number}?\n\n` +
      `This will attempt to process the surat jalan photos again using OCR.\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    try {
      setLoadingTagihan(true);
      
      // Call retry OCR endpoint
      await apiClient.post(`/delivery-orders/${deliveryOrder.id}/retry-surat-jalan-ocr`);

      // Refresh tagihan data after a short delay to allow OCR processing
      setTimeout(async () => {
        if (selectedGroup) {
          const response = await apiClient.get(`/deposit-groups/${selectedGroup.id}/tagihan`);
          setTagihanData(response.data.data);
        }
        setLoadingTagihan(false);
      }, 3000);

    } catch (err) {
      console.error('Failed to retry OCR processing:', err);
      setError('Failed to retry OCR processing');
      setLoadingTagihan(false);
    }
  };

  const handleViewSuratJalan = (deliveryOrder: any) => {
    if (!deliveryOrder.surat_jalan_photo_url || deliveryOrder.surat_jalan_photo_url.length === 0) {
      alert('No surat jalan photos available for this delivery order.');
      return;
    }

    setSelectedDOPhotos({
      do_number: deliveryOrder.do_number,
      photos: deliveryOrder.surat_jalan_photo_url
    });
    setShowPhotoModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowMembersModal(false);
    setShowTopUpModal(false);
    setShowTagihanModal(false);
    setShowPhotoModal(false);
    setShowBalancingModal(false);
    setSelectedGroup(null);
    setSelectedDOPhotos(null);
    setEditingLocationId(null);
    setEditingLocationName('');
    setTagihanData(null);
    setBalancingData(null);
    // Reset balancing pagination
    setBalancingPage(1);
    setBalancingTotalPages(1);
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

  // Get unit display name (always kubik for deposit groups)
  const getUnitLabel = (value: string) => {
    return "Kubik (m³)";
  };

  if (loading) return <div className="text-center p-8">Loading deposit groups...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">SPBG Management</h1>
        <button
          onClick={openCreateModal}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          + Create SPBG
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow-md overflow-hidden relative">
            {/* Delete X Button */}
            <button
              onClick={() => handleDelete(group.id)}
              className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors"
              title="Delete SPBG"
            >
              ×
            </button>
            
            {/* Status Badge */}
            <div className={`px-4 py-2 text-xs font-medium text-white ${
              group.status === 'active' ? 'bg-green-600' : 
              group.status === 'fulfilled' ? 'bg-blue-600' : 
              group.status === 'overdrawn' ? 'bg-red-600' : 'bg-gray-600'
            }`}>
              {group.status.charAt(0).toUpperCase() + group.status.slice(1).replace('_', ' ')}
            </div>

            <div className="p-4">
              {/* Location Name with Inline Edit */}
              <div className="mb-2">
                {editingLocationId === group.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingLocationName}
                      onChange={(e) => setEditingLocationName(e.target.value)}
                      className="flex-1 px-2 py-1 text-lg font-semibold border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveLocationName(group.id);
                        } else if (e.key === 'Escape') {
                          cancelEditingLocation();
                        }
                      }}
                    />
                    <button
                      onClick={() => saveLocationName(group.id)}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="Save"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={cancelEditingLocation}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Cancel"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">{group.spbg_location}</h3>
                    <button
                      onClick={() => startEditingLocation(group)}
                      className="p-1 text-gray-500 hover:text-blue-600"
                      title="Edit location name"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Group Information */}
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Group Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Completed:</span>
                    </div>
                    {group.total_completed_amount > 0 && (
                      <div className="ml-4 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">JISDOR:</span>
                          <span className="text-blue-600 font-medium">
                            {formatVolume(convertMoneyToVolume(group.total_completed_amount, currentJisdorRate).jisdorVolume)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Fixed Rate:</span>
                          <span className="text-green-600 font-medium">
                            {formatVolume(convertMoneyToVolume(group.total_completed_amount, currentJisdorRate).fixedRateVolume)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Remaining:</span>
                    </div>
                    {group.total_balance > 0 && (
                      <div className="ml-4 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">JISDOR:</span>
                          <span className="text-blue-600 font-medium">
                            {formatVolume(convertMoneyToVolume(group.total_balance, currentJisdorRate).jisdorVolume)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Fixed Rate:</span>
                          <span className="text-green-600 font-medium">
                            {formatVolume(convertMoneyToVolume(group.total_balance, currentJisdorRate).fixedRateVolume)}
                          </span>
                        </div>
                      </div>
                    )}
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
                    {formatCurrency(group.total_deposits || 0)}
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
                  {group.total_balance > 0 && (
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="text-blue-600">
                        {formatVolume(convertMoneyToVolume(group.total_balance, currentJisdorRate).jisdorVolume)} (JISDOR)
                      </div>
                      <div className="text-green-600">
                        {formatVolume(convertMoneyToVolume(group.total_balance, currentJisdorRate).fixedRateVolume)} (Fixed Rate)
                      </div>
                    </div>
                  )}
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

              <div className="space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => openTopUpModal(group)}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-sm py-2 px-3 rounded"
                  >
                    Top Up
                  </button>
                  <button
                    onClick={() => openMembersModal(group)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded"
                  >
                    View DOs
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openTagihanModal(group)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded"
                  >
                    Tagihan
                  </button>
                  <button
                    onClick={() => openBalancingModal(group)}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm py-2 px-3 rounded"
                  >
                    Balancing
                  </button>
                </div>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No SPBG</h3>
          <p className="text-gray-500 mb-4">Start by creating your first SPBG.</p>
          <button
            onClick={openCreateModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Create SPBG
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New SPBG
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* SPBG Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SPBG Name
                  </label>
                  <input
                    type="text"
                    value={formData.spbg_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, spbg_name: e.target.value }))}
                    placeholder="Enter SPBG name (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Enter a display name for this SPBG
                  </p>
                </div>

                {/* Input Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Input Method *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="locationInputMethod"
                        value="location"
                        checked={locationInputMethod === 'location'}
                        onChange={(e) => setLocationInputMethod(e.target.value as 'location' | 'coordinate')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Location</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="locationInputMethod"
                        value="coordinate"
                        checked={locationInputMethod === 'coordinate'}
                        onChange={(e) => setLocationInputMethod(e.target.value as 'location' | 'coordinate')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Coordinate</span>
                    </label>
                  </div>
                </div>

                {/* SPBG Location - shown when location method is selected */}
                {locationInputMethod === 'location' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SPBG Location *
                    </label>
                    <input
                      type="text"
                      value={formData.spbg_location}
                      onChange={(e) => setFormData(prev => ({ ...prev, spbg_location: e.target.value }))}
                      placeholder="Enter SPBG location/address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Location addresses will be auto-geocoded. For guaranteed map display, use Coordinate input method instead.
                    </p>
                  </div>
                )}

                {/* Coordinates - shown when coordinate method is selected */}
                {locationInputMethod === 'coordinate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coordinates (lat, lng) *
                    </label>
                    <input
                      type="text"
                      value={formData.coordinateInput}
                      onChange={(e) => setFormData(prev => ({ ...prev, coordinateInput: e.target.value }))}
                      placeholder="-6.200000, 106.816666"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter coordinates as "lat, lng" (e.g., -6.200000, 106.816666)
                    </p>
                  </div>
                )}


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
                    Initial Deposited Amount (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.deposited_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, deposited_amount: e.target.value }))}
                    placeholder="Enter initial deposited amount (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty if no initial deposit is made. Use Top Up button to add balance later.
                  </p>
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
                    Create SPBG
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
                  Delivery Orders in {selectedGroup.spbg_location}
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

      {/* Top Up Modal */}
      {showTopUpModal && selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Top Up Balance - {selectedGroup.spbg_location}
              </h3>
              
              <form onSubmit={handleTopUpSubmit} className="space-y-4">
                {/* Current Balance Display */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Current Balance</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedGroup.total_balance)}
                  </div>
                </div>

                {/* Top Up Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Top Up Amount (Rp) *
                  </label>
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="Enter amount to top up"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                    step="0.01"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the amount to add to the current balance
                  </p>
                </div>

                {/* New Balance Preview */}
                {topUpAmount && parseFloat(topUpAmount) > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-gray-600 mb-1">New Balance After Top Up</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedGroup.total_balance + parseFloat(topUpAmount))}
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
                    className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Confirm Top Up
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tagihan (Billing) Modal */}
      {showTagihanModal && selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  📋 Tagihan - {selectedGroup.spbg_location}
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

              {loadingTagihan ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-500">Loading billing data...</p>
                </div>
              ) : tagihanData ? (
                <div className="space-y-6">
                  {/* Debug info */}
                  <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                    <strong>Debug:</strong> Found {tagihanData.delivery_orders?.length || 0} delivery orders, 
                    Total cost: {tagihanData.summary?.total_cost || 0}
                  </div>
                  {/* Summary Section */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Total DOs</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {tagihanData.summary.total_delivery_orders}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Base Gas Cost</div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(tagihanData.summary.total_base_gas_cost)}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Selisih Cost</div>
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(tagihanData.summary.total_selisih_cost)}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Pending / Confirmed</div>
                      <div className="text-2xl font-bold">
                        <span className="text-yellow-600">{tagihanData.summary.pending_confirmation}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-green-600">{tagihanData.summary.confirmed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Costs Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-200">
                      <div className="text-xs text-gray-600 mb-1">Receipt Cost</div>
                      <div className="text-lg font-bold text-pink-600">
                        {formatCurrency(tagihanData.summary.total_receipt_cost || 0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {tagihanData.summary.total_receipts || 0} receipt{(tagihanData.summary.total_receipts || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border-4 border-purple-300">
                      <div className="text-xs text-gray-600 mb-1">💰 Grand Total Cost</div>
                      <div className="text-xl font-bold text-purple-600">
                        {formatCurrency(tagihanData.summary.total_cost)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Gas + Selisih + Receipts
                      </div>
                    </div>
                  </div>

                  {/* Volume Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Set Volume (m³)</div>
                        <div className="text-xl font-bold text-blue-600">
                          {tagihanData.summary.total_set_volume.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Actual Volume (m³)</div>
                        <div className="text-xl font-bold text-green-600">
                          {tagihanData.summary.total_actual_volume.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Selisih Volume (m³)</div>
                        <div className={`text-xl font-bold ${tagihanData.summary.total_selisih_volume >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                          {tagihanData.summary.total_selisih_volume >= 0 ? '+' : ''}{tagihanData.summary.total_selisih_volume.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Orders Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            DO Number
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Customer
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Set Vol. (m³)
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actual Vol. (m³)
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Selisih (m³)
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Base Cost
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Selisih Cost
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            🧾 Receipts
                          </th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Total Cost
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tagihanData.delivery_orders.map((do_item: any) => (
                          <tr key={do_item.id} className={`hover:bg-gray-50 ${do_item.selisih_volume_m3 > 0 ? 'bg-orange-50' : ''}`}>
                            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {do_item.do_number}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                              {do_item.customer_name}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                              {do_item.set_volume_m3.toFixed(2)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                              {do_item.actual_volume_m3 > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className={`font-medium ${do_item.surat_jalan_ocr_confirmed ? 'text-green-600' : 'text-blue-500'}`}>
                                    {do_item.actual_volume_m3.toFixed(2)}
                                  </span>
                                  {do_item.has_ocr_data && (
                                    <span className="text-xs text-gray-500">
                                      {do_item.surat_jalan_ocr_confirmed ? '✓ Confirmed' : '📊 OCR'}
                                    </span>
                                  )}
                                  {do_item.has_surat_jalan && !do_item.has_ocr_data && (
                                    <span className="text-xs text-orange-500">⚠️ No OCR</span>
                                  )}
                                </div>
                              ) : do_item.has_surat_jalan ? (
                                <span className="text-orange-500 text-xs">📷 Photo only</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                              {do_item.actual_volume_m3 > 0 ? (
                                <span className={`font-bold ${do_item.selisih_volume_m3 > 0 ? 'text-orange-600' : do_item.selisih_volume_m3 < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {do_item.selisih_volume_m3 > 0 ? '+' : ''}{do_item.selisih_volume_m3.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatCurrency(do_item.base_gas_cost)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                              {do_item.selisih_cost > 0 ? (
                                <span className="text-orange-600 font-medium">
                                  {formatCurrency(do_item.selisih_cost)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                              {do_item.receipts_count > 0 ? (
                                <div className="flex flex-col items-center">
                                  <span className="font-medium text-pink-600">
                                    {do_item.receipts_count} receipt{do_item.receipts_count > 1 ? 's' : ''}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {do_item.total_receipt_volume.toFixed(2)} m³
                                  </span>
                                  <span className="font-semibold text-pink-700">
                                    {formatCurrency(do_item.total_receipt_cost)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                              {formatCurrency(do_item.total_cost)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              {do_item.surat_jalan_ocr_confirmed ? (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                  ✓ Confirmed
                                </span>
                              ) : do_item.actual_volume_m3 > 0 ? (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                  No Data
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="flex flex-col space-y-1">
                                {do_item.needs_confirmation && (
                                  <button
                                    onClick={() => handleConfirmOCR(do_item)}
                                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                  >
                                    Confirm
                                  </button>
                                )}
                                {do_item.has_surat_jalan && !do_item.has_ocr_data && (
                                  <button
                                    onClick={() => handleRetryOCR(do_item)}
                                    className="text-orange-600 hover:text-orange-900 text-xs font-medium"
                                    title="Retry OCR processing"
                                  >
                                    🔄 Retry OCR
                                  </button>
                                )}
                                {do_item.has_surat_jalan && (
                                  <button
                                    onClick={() => handleViewSuratJalan(do_item)}
                                    className="text-green-600 hover:text-green-900 text-xs font-medium"
                                    title="View Surat Jalan Photos"
                                  >
                                    📷 View Photos
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No billing data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Surat Jalan Photo Modal */}
      {showPhotoModal && selectedDOPhotos && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  📷 Surat Jalan Photos - {selectedDOPhotos.do_number}
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

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Found {selectedDOPhotos.photos.length} surat jalan photo(s) for this delivery order.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDOPhotos.photos.map((photoUrl, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Photo {index + 1}
                        </span>
                      </div>
                      <div className="relative">
                        <img
                          src={getImageUrl(photoUrl)}
                          alt={`Surat Jalan ${index + 1}`}
                          className="w-full h-64 object-contain border rounded cursor-pointer hover:opacity-80"
                          onClick={() => window.open(getImageUrl(photoUrl), '_blank')}
                          onError={(e) => {
                            console.error('Failed to load image:', photoUrl);
                            console.error('Attempted URL:', getImageUrl(photoUrl));
                            console.error('BACKEND_URL:', BACKEND_URL);
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iI2Y5ZjlmOSIvPgo8L3N2Zz4K';
                          }}
                        />
                        <div className="absolute bottom-2 right-2">
                          <button
                            onClick={() => window.open(getImageUrl(photoUrl), '_blank')}
                            className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs hover:bg-opacity-70"
                            title="Open in new tab"
                          >
                            🔍 View Full Size
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <div>Original Path: {photoUrl}</div>
                        <div>Full URL: {getImageUrl(photoUrl)}</div>
                        <div>Backend URL: {BACKEND_URL}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Balancing Report Modal */}
      {showBalancingModal && selectedGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  ⚖️ Balancing Report - {selectedGroup.spbg_location}
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

              {loadingBalancing ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-gray-500">Loading balancing report...</p>
                </div>
              ) : balancingData ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                      <div className="text-sm text-gray-600 mb-2">Total Purchases from SPBG</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(balancingData.summary?.total_purchases || 0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Volume: {balancingData.summary?.total_purchase_volume?.toFixed(2) || '0.00'} m³
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                      <div className="text-sm text-gray-600 mb-2">Total Sales to Customers</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(balancingData.summary?.total_sales || 0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Volume: {balancingData.summary?.total_sales_volume?.toFixed(2) || '0.00'} m³
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                      <div className="text-sm text-gray-600 mb-2">Balance Difference</div>
                      <div className={`text-2xl font-bold ${
                        (balancingData.summary?.balance_difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(balancingData.summary?.balance_difference || 0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Volume Diff: {((balancingData.summary?.volume_difference || 0) >= 0 ? '+' : '')}{balancingData.summary?.volume_difference?.toFixed(2) || '0.00'} m³
                      </div>
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Purchases Section */}
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">📥 Purchases from SPBG</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                          <span className="text-sm font-medium text-gray-700">Gas Filling Costs</span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatCurrency(balancingData.purchases?.gas_filling_costs || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm font-medium text-gray-700">Total Volume</span>
                          <span className="text-lg font-bold text-gray-600">
                            {balancingData.purchases?.total_volume?.toFixed(2) || '0.00'} m³
                          </span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-semibold text-gray-900">Total Purchases</span>
                            <span className="text-xl font-bold text-blue-600">
                              {formatCurrency(balancingData.purchases?.total || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sales Section */}
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">📤 Sales to Customers</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                          <span className="text-sm font-medium text-gray-700">Delivery Orders Total</span>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(balancingData.sales?.delivery_orders_total || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm font-medium text-gray-700">Number of DOs</span>
                          <span className="text-lg font-bold text-gray-600">
                            {balancingData.sales?.delivery_orders_count || 0}
                          </span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-semibold text-gray-900">Total Sales</span>
                            <span className="text-xl font-bold text-green-600">
                              {formatCurrency(balancingData.sales?.total || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  {balancingData.recent_transactions && balancingData.recent_transactions.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">🕒 Recent Transactions</h4>
                        {balancingData.pagination && (
                          <div className="text-sm text-gray-500">
                            Showing {((balancingData.pagination.currentPage - 1) * balancingData.pagination.pageSize) + 1} - {Math.min(balancingData.pagination.currentPage * balancingData.pagination.pageSize, balancingData.pagination.totalTransactions)} of {balancingData.pagination.totalTransactions} transactions
                          </div>
                        )}
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {balancingData.recent_transactions.map((transaction: any, index: number) => (
                              <tr key={`${transaction.do_number}-${transaction.type}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(transaction.date)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    transaction.type === 'purchase' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {transaction.type === 'purchase' ? 'Purchase' : 'Sale'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {transaction.description}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                                  {formatCurrency(transaction.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {balancingData.pagination && balancingData.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleBalancingPageChange(balancingData.pagination.currentPage - 1)}
                              disabled={!balancingData.pagination.hasPrevPage || loadingBalancing}
                              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: Math.min(5, balancingData.pagination.totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (balancingData.pagination.totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (balancingData.pagination.currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (balancingData.pagination.currentPage >= balancingData.pagination.totalPages - 2) {
                                  pageNum = balancingData.pagination.totalPages - 4 + i;
                                } else {
                                  pageNum = balancingData.pagination.currentPage - 2 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => handleBalancingPageChange(pageNum)}
                                    disabled={loadingBalancing}
                                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                                      pageNum === balancingData.pagination.currentPage
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <button
                              onClick={() => handleBalancingPageChange(balancingData.pagination.currentPage + 1)}
                              disabled={!balancingData.pagination.hasNextPage || loadingBalancing}
                              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            Page {balancingData.pagination.currentPage} of {balancingData.pagination.totalPages}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No balancing data available</p>
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
