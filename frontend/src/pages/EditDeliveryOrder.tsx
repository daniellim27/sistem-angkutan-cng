import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";

interface DeliveryOrderData {
  id: number;
  do_number: string;
  customer_name?: string;
  item_name?: string;
  minimal_load_quantity?: number;
  actual_load_quantity?: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  load_location: string;
  unload_location: string;
  load_locations?: string[];
  unload_locations?: string[];
  status: string;
  notes?: string;
  driver_name?: string;
  vehicle_info?: string;
  trip_allowance?: number;
  gaji?: number;
  // Enhanced with gas filling fields
  gas_volume_m3?: number;
  spbg_location?: string;
  calculation_method?: 'jisdor' | 'fixed';
  jisdor_rate?: number;
  gas_filling_cost?: number;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'at_spbu', label: 'At SPBU' },
  { value: 'otw_to_unload_location', label: 'On the way to Customer' },
  { value: 'at_unload_location', label: 'At Customer' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const EditDeliveryOrder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrderData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  
  // Add state for customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<(number | null)[]>([null]);
  
  // JISDOR rate state for automatic calculation
  const [currentJisdorRate, setCurrentJisdorRate] = useState<number | null>(null);
  const [jisdorLastUpdated, setJisdorLastUpdated] = useState<string | null>(null);

  // SPBG locations for selection
  const spbgLocations: { value: string; label: string }[] = [
    { value: '', label: 'Select SPBG Location' },
    { value: 'jakarta_utara', label: 'SPBG Jakarta Utara' },
    { value: 'jakarta_timur', label: 'SPBG Jakarta Timur' },
    { value: 'jakarta_selatan', label: 'SPBG Jakarta Selatan' },
    { value: 'jakarta_barat', label: 'SPBG Jakarta Barat' },
    { value: 'tangerang', label: 'SPBG Tangerang' },
    { value: 'bekasi', label: 'SPBG Bekasi' },
    { value: 'depok', label: 'SPBG Depok' },
    { value: 'bogor', label: 'SPBG Bogor' },
    { value: 'cikampek', label: 'SPBG Cikampek' },
    { value: 'bandung', label: 'SPBG Bandung' }
  ];

  // Gas calculation methods
  const calculationMethods: { value: string; label: string }[] = [
    { value: 'jisdor', label: 'JISDOR Rate' },
    { value: 'fixed', label: 'Fixed Rate (7,800 IDR per m³)' }
  ];

  // Helper function to get SPBG location label
  const getSPBGLocationLabel = (value: string) => {
    return spbgLocations.find(loc => loc.value === value)?.label || value;
  };

  // Auto-calculate gas volume when gas filling cost changes
  const calculateGasVolume = (formData: any): number => {
    const cost = parseFloat(formData.gas_filling_cost);
    if (!cost) return 0;

    let volume = 0;
    if (formData.calculation_method === 'jisdor') {
      // Use current JISDOR rate if available, otherwise use the manually entered rate
      const jisdorRate = formData.jisdor_rate ? parseFloat(formData.jisdor_rate) : currentJisdorRate;
      if (jisdorRate && !isNaN(jisdorRate)) {
        // Reverse formula: cost / ((1/27.27) * 12.7 * jisdor_rate)
        // Simplified: cost / (12.7 * jisdor_rate / 27.27)
        volume = cost / (12.7 * jisdorRate / 27.27);
      }
    } else if (formData.calculation_method === 'fixed') {
      // Fixed rate: 7800 IDR per m³
      volume = cost / 7800;
    }

    return Math.round(volume * 100) / 100; // Round to 2 decimal places
  };

  // Location management functions
  const addLoadLocation = () => {
    setFormData(prev => ({
      ...prev,
      load_locations: [...prev.load_locations, ""]
    }));
  };

  const removeLoadLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      load_locations: prev.load_locations.filter((_, i) => i !== index)
    }));
  };

  const updateLoadLocation = (index: number, value: string) => {
    setFormData(prev => {
      const newLoadLocations = prev.load_locations.map((loc, i) => i === index ? value : loc);
      return {
        ...prev,
        load_locations: newLoadLocations,
        // Keep original field in sync for backward compatibility
        load_location: newLoadLocations[0] || ""
      };
    });
  };

  const addUnloadLocation = () => {
    setFormData(prev => ({
      ...prev,
      unload_locations: [...prev.unload_locations, ""]
    }));
    setSelectedCustomerIds(prev => [...prev, null]);
  };

  const removeUnloadLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      unload_locations: prev.unload_locations.filter((_, i) => i !== index)
    }));
    setSelectedCustomerIds(prev => prev.filter((_, i) => i !== index));
  };

  const updateUnloadLocation = (index: number, value: string) => {
    setFormData(prev => {
      const newUnloadLocations = prev.unload_locations.map((loc, i) => i === index ? value : loc);
      return {
        ...prev,
        unload_locations: newUnloadLocations,
        // Keep original field in sync for backward compatibility
        unload_location: newUnloadLocations[0] || ""
      };
    });
  };

  const handleCustomerLocationChange = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    if (customerId) {
      const selectedCustomer = customers.find((c: any) => c.id.toString() === customerId);
      if (selectedCustomer) {
        // Update the location
        setFormData(prev => {
          const newUnloadLocations = [...prev.unload_locations];
          newUnloadLocations[index] = selectedCustomer.location;
          return {
            ...prev,
            unload_locations: newUnloadLocations,
            // Keep original field in sync for backward compatibility
            unload_location: newUnloadLocations[0] || ""
          };
        });

        // Update selected customer IDs
        setSelectedCustomerIds(prev => {
          const newIds = [...prev];
          newIds[index] = selectedCustomer.id;
          return newIds;
        });
      }
    } else {
      // Clear the location
      setFormData(prev => {
        const newUnloadLocations = [...prev.unload_locations];
        newUnloadLocations[index] = '';
        return {
          ...prev,
          unload_locations: newUnloadLocations,
          // Keep original field in sync for backward compatibility
          unload_location: newUnloadLocations[0] || ""
        };
      });

      // Clear selected customer ID
      setSelectedCustomerIds(prev => {
        const newIds = [...prev];
        newIds[index] = null;
        return newIds;
      });
    }
  };

  // Get available customers for a specific dropdown (excluding already selected ones)
  const getAvailableCustomers = (currentIndex: number) => {
    return customers.filter((customer: any) => {
      const isAlreadySelected = selectedCustomerIds.some((id, index) => 
        index !== currentIndex && id === customer.id
      );
      return !isAlreadySelected;
    });
  };

  // Form state
  const [formData, setFormData] = useState({
    actual_load_quantity: 0,
    unit: "kubik", // DOs always use kubik
    unit_price: 0,
    load_location: "",
    unload_location: "",
    load_locations: [""] as string[],
    unload_locations: [""] as string[],
    notes: "",
    trip_allowance: 0,
    gaji: 0,
    status: "assigned",
    // Enhanced with gas filling fields
    gas_volume_m3: 0,
    spbg_location: "",
    calculation_method: 'jisdor' as 'jisdor' | 'fixed',
    jisdor_rate: 0,
    gas_filling_cost: 0,
  });

  useEffect(() => {
    if (id) {
      fetchDeliveryOrder();
      fetchCustomers();
      fetchCurrentJisdorRate();
    }
    // eslint-disable-next-line
  }, [id]);

  // Auto-calculate gas filling cost when current JISDOR rate changes
  useEffect(() => {
    if (currentJisdorRate && formData.calculation_method === 'jisdor' && !formData.jisdor_rate) {
      setFormData(prev => ({ ...prev, jisdor_rate: currentJisdorRate }));
    }
    if (formData.gas_filling_cost) {
      const newVolume = calculateGasVolume(formData);
      setFormData(prev => ({ ...prev, gas_volume_m3: newVolume }));
    }
  }, [currentJisdorRate]);

  // Fetch customers for dropdown
  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/customers/locations');
      setCustomers(response.data.data || response.data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  // Fetch current JISDOR rate
  const fetchCurrentJisdorRate = async () => {
    try {
      console.log('🔄 Fetching current JISDOR rate...');
      const response = await apiClient.get('/exchange-rates/current');
      
      if (response.data.success) {
        const rate = response.data.data.rate;
        const lastScraped = response.data.data.last_scraped_at;
        
        setCurrentJisdorRate(rate);
        setJisdorLastUpdated(lastScraped);
        console.log('✅ JISDOR rate fetched successfully:', rate);
      } else {
        throw new Error('API response indicates failure');
      }
    } catch (err) {
      console.error('Failed to fetch JISDOR rate:', err);
      // Set default JISDOR rate if API fails
      setCurrentJisdorRate(16364.42);
      setJisdorLastUpdated(new Date().toISOString());
    }
  };

  const fetchDeliveryOrder = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/delivery-orders/${id}`);
      const data = response.data.data;

      setDeliveryOrder(data);
      setFormData({
        actual_load_quantity: data.actual_load_quantity || 0,
        unit: "kubik", // All delivery orders use cubic meters only
        unit_price: data.unit_price || 0,
        load_location: data.load_location || "",
        unload_location: data.unload_location || "",
        load_locations: data.load_locations && data.load_locations.length > 0 ? data.load_locations : [data.load_location || ""],
        unload_locations: (() => {
          // If we have additional_unload_locations, combine primary + additional
          if (data.additional_unload_locations && data.additional_unload_locations.length > 0) {
            const primary = data.unload_location || "";
            const additional = data.additional_unload_locations.map((loc: any) => 
              typeof loc === 'string' ? loc : loc.location || ""
            );
            return [primary, ...additional].filter(loc => loc.trim() !== "");
          }
          // Otherwise use legacy unload_locations or fallback to primary
          return data.unload_locations && data.unload_locations.length > 0 
            ? data.unload_locations 
            : [data.unload_location || ""];
        })(),
        notes: data.notes || "",
        trip_allowance: data.trip_allowance || 0,
        gaji: data.gaji || 0,
        status: data.status || "assigned",
        // Enhanced with gas filling fields
        gas_volume_m3: data.gas_volume_m3 || 0,
        spbg_location: data.spbg_location || "",
        calculation_method: data.calculation_method || 'jisdor',
        jisdor_rate: data.jisdor_rate || 0,
        gas_filling_cost: data.gas_filling_cost || 0,
      });

      // Initialize selected customer IDs based on unload locations
      const unloadLocationCount = (() => {
        if (data.additional_unload_locations && data.additional_unload_locations.length > 0) {
          return 1 + data.additional_unload_locations.length; // primary + additional
        }
        return data.unload_locations && data.unload_locations.length > 0 
          ? data.unload_locations.length 
          : 1;
      })();
      
      setSelectedCustomerIds(new Array(unloadLocationCount).fill(null));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch delivery order");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]: name.includes("quantity") ||
          name.includes("price") ||
          name.includes("allowance") ||
          name === "gaji" ||
          name === "gas_volume_m3" ||
          name === "jisdor_rate" ||
          name === "gas_filling_cost"
            ? parseFloat(value) || 0
            : value,
      };

      // Auto-set JISDOR rate when calculation method changes to jisdor
      if (name === 'calculation_method' && value === 'jisdor' && currentJisdorRate) {
        newFormData.jisdor_rate = currentJisdorRate;
      }

      // Auto-calculate gas volume when gas filling cost changes
      if (name === 'gas_filling_cost' || name === 'calculation_method' || name === 'jisdor_rate') {
        newFormData.gas_volume_m3 = calculateGasVolume(newFormData);
      }

      // Ensure gas filling cost is properly formatted if manually entered
      if (name === 'gas_filling_cost') {
        const cost = parseFloat(value);
        if (!isNaN(cost)) {
          newFormData.gas_filling_cost = Math.round(cost * 100) / 100;
        }
      }

      return newFormData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      // Prepare data with both individual and array fields for compatibility
      const submissionData = {
        ...formData,
        // Keep original fields for backward compatibility
        load_location: formData.load_locations[0] || "",
        unload_location: formData.unload_locations[0] || "",
        // Add new array fields
        load_locations: formData.load_locations.filter(loc => loc.trim() !== ""),
        additional_unload_locations: formData.unload_locations.slice(1).filter(loc => loc.trim() !== "") // Only additional locations (excluding first one)
      };

      await apiClient.put(`/delivery-orders/${id}`, submissionData);

      navigate("/delivery-orders", {
        state: { message: "Delivery Order updated successfully!" },
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to update delivery order"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      setError("Cancellation reason is required");
      return;
    }

    try {
      setCancelling(true);
      setError(null);

      await apiClient.patch(`/delivery-orders/${id}/cancel`, {
        cancellation_reason: cancellationReason,
      });

      setShowCancelModal(false);
      navigate("/delivery-orders", {
        state: { message: "Delivery Order cancelled successfully!" },
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to cancel delivery order"
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !deliveryOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error: {error}</p>
          <button
            onClick={() => navigate("/delivery-orders")}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Back to Delivery Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <span>Edit Delivery Order</span>
              {deliveryOrder?.status === "completed" && (
                <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">
                  Completed
                </span>
              )}
              {deliveryOrder?.status === "cancelled" && (
                <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">
                  Cancelled
                </span>
              )}
            </h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
              <span>
                <span className="font-medium">DO Number:</span>{" "}
                {deliveryOrder?.do_number}
              </span>
              {deliveryOrder?.driver_name && (
                <span>
                  <span className="font-medium">Driver:</span>{" "}
                  {deliveryOrder.driver_name}
                </span>
              )}
              {deliveryOrder?.vehicle_info && (
                <span>
                  <span className="font-medium">Vehicle:</span>{" "}
                  {deliveryOrder.vehicle_info}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate("/delivery-orders")}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={
                deliveryOrder?.status === "cancelled" ||
                deliveryOrder?.status === "completed"
              }
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Cancel DO
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-lg p-8 border border-gray-100"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Actual Load Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual Quantity
            </label>
            <input
              type="number"
              name="actual_load_quantity"
              value={formData.actual_load_quantity}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              disabled
            >
              <option value="kubik">Kubik (m³)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Delivery orders always use cubic meters (m³)</p>
          </div>

          {/* Unit Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Price (Rp)
            </label>
            <input
              type="number"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Trip Allowance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trip Allowance (Rp)
            </label>
            <input
              type="number"
              name="trip_allowance"
              value={formData.trip_allowance}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Gaji */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Driver Salary (Rp)
            </label>
            <input
              type="number"
              name="gaji"
              value={formData.gaji}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gas Filling Information Section */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
            ⛽ Gas Filling Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gas Volume (m³) - Calculated */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calculated Gas Volume (m³)
              </label>
              <input
                type="number"
                name="gas_volume_m3"
                value={formData.gas_volume_m3}
                readOnly
                step="0.01"
                min="0"
                placeholder="Auto-calculated"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>

            {/* SPBG Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SPBG Location
              </label>
              <select
                name="spbg_location"
                value={formData.spbg_location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select SPBG Location</option>
                {spbgLocations.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Calculation Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calculation Method
              </label>
              <select
                name="calculation_method"
                value={formData.calculation_method}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {calculationMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {/* JISDOR Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JISDOR Rate (IDR)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="jisdor_rate"
                  value={formData.jisdor_rate}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder={currentJisdorRate ? `Current rate: ${currentJisdorRate.toLocaleString()}` : "Enter JISDOR rate"}
                  disabled={formData.calculation_method !== 'jisdor'}
                  className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.calculation_method !== 'jisdor' ? 'bg-gray-100' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={fetchCurrentJisdorRate}
                  disabled={formData.calculation_method !== 'jisdor'}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Refresh JISDOR rate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {currentJisdorRate && formData.calculation_method === 'jisdor' && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Current rate from Bank Indonesia: Rp {currentJisdorRate.toLocaleString('id-ID')}
                  {jisdorLastUpdated && (
                    <span className="block text-gray-500">Last updated: {new Date(jisdorLastUpdated).toLocaleDateString()}</span>
                  )}
                </p>
              )}
              {formData.calculation_method !== 'jisdor' && (
                <p className="text-xs text-gray-500 mt-1">Only required for JISDOR calculation</p>
              )}
            </div>

            {/* Gas Filling Cost */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gas Filling Cost (IDR) *
              </label>
              <input
                type="number"
                name="gas_filling_cost"
                value={formData.gas_filling_cost}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                max="999999999"
                placeholder="Enter gas filling cost"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the total cost for gas filling
              </p>
            </div>
          </div>

          {/* Gas Filling Summary */}
          {formData.gas_volume_m3 > 0 && formData.spbg_location && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="text-sm font-medium text-blue-900 mb-2">Gas Filling Summary</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-blue-700">Volume:</span>
                  <span className="ml-1 text-blue-900 font-medium">{formData.gas_volume_m3} m³</span>
                </div>
                <div>
                  <span className="text-blue-700">Location:</span>
                  <span className="ml-1 text-blue-900 font-medium">
                    {getSPBGLocationLabel(formData.spbg_location)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Method:</span>
                  <span className="ml-1 text-blue-900 font-medium capitalize">
                    {formData.calculation_method}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Cost:</span>
                  <span className="ml-1 text-blue-900 font-medium">
                    Rp {formData.gas_filling_cost?.toLocaleString('id-ID') || '0'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SPBU Locations */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              SPBU Locations
            </label>
            <button
              type="button"
              onClick={addLoadLocation}
              className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              + Add Location
            </button>
          </div>
          <div className="space-y-3">
            {formData.load_locations.map((location, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => updateLoadLocation(index, e.target.value)}
                  placeholder={`SPBU location ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={index === 0}
                />
                {formData.load_locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLoadLocation(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Unload Locations */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Customer Locations
            </label>
            <button
              type="button"
              onClick={addUnloadLocation}
              className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              + Add Location
            </button>
          </div>
          <div className="space-y-3">
            {formData.unload_locations.map((location, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <select
                    value={selectedCustomerIds[index] || ''}
                    onChange={(e) => handleCustomerLocationChange(index, e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={index === 0}
                  >
                    <option value="">
                      {index === 0 ? "Select Primary Customer Location" : `Select Additional Customer Location ${index + 1}`}
                    </option>
                    {getAvailableCustomers(index).map((customer: any) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.display_name}
                      </option>
                    ))}
                  </select>
                  {/* Hidden input to maintain the location value for backend */}
                  <input
                    type="hidden"
                    value={location}
                    onChange={(e) => updateUnloadLocation(index, e.target.value)}
                  />
                </div>
                {formData.unload_locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUnloadLocation(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select customers from the dropdown. Each customer can only be selected once.
          </p>
        </div>

        {/* Notes */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes..."
          />
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Update Delivery Order"}
          </button>
        </div>
      </form>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cancel Delivery Order
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this delivery order? This action
              cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason *
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Please provide a reason for cancellation..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Keep DO
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling || !cancellationReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {cancelling ? "Cancelling..." : "Cancel DO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditDeliveryOrder;
