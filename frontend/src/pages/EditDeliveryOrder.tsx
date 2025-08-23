import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";

interface DeliveryOrderData {
  id: number;
  do_number: string;
  customer_name: string;
  item_name: string;
  minimal_load_quantity: number;
  actual_load_quantity?: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  load_location: string;
  unload_location: string;
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

const STATUS_OPTIONS = [
  { value: "assigned", label: "Ditugaskan" },
  { value: "otw_to_load_location", label: "Menuju Lokasi Muat" },
  { value: "at_load_location", label: "Di Lokasi Muat" },
  { value: "otw_to_unload_location", label: "Menuju Lokasi Bongkar" },
  { value: "at_unload_location", label: "Di Lokasi Bongkar" },
  { value: "otw_to_base", label: "Perjalanan Pulang" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
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

  // SPBG locations for selection
  const spbgLocations = [
    { value: '', label: 'Select SPBG Location' },
    { value: 'jakarta', label: 'Jakarta' },
    { value: 'bandung', label: 'Bandung' },
    { value: 'surabaya', label: 'Surabaya' },
    { value: 'semarang', label: 'Semarang' },
    { value: 'yogyakarta', label: 'Yogyakarta' },
    { value: 'medan', label: 'Medan' },
    { value: 'palembang', label: 'Palembang' },
    { value: 'makassar', label: 'Makassar' }
  ];

  // Gas calculation methods
  const calculationMethods = [
    { value: 'jisdor', label: 'JISDOR Rate (Dynamic)' },
    { value: 'fixed', label: 'Fixed Rate (Standard)' }
  ];

  // Helper function to get SPBG location label
  const getSPBGLocationLabel = (value: string) => {
    return spbgLocations.find(loc => loc.value === value)?.label || value;
  };

  // Auto-calculate gas filling cost when gas-related fields change
  const calculateGasFillingCost = (formData: any): number => {
    const volume = parseFloat(formData.gas_volume_m3);
    if (!volume) return 0;

    let cost = 0;
    if (formData.calculation_method === 'jisdor' && formData.jisdor_rate) {
      const jisdorRate = parseFloat(formData.jisdor_rate);
      if (!isNaN(jisdorRate)) {
        // Formula: (volume/27.27) * 12.7 * jisdor_rate
        // Round to 2 decimal places to avoid precision issues
        cost = Math.round((volume / 27.27) * 12.7 * jisdorRate * 100) / 100;
      }
    } else if (formData.calculation_method === 'fixed') {
      // Fixed rate: 7800 IDR per m³
      cost = Math.round(volume * 7800 * 100) / 100;
    }

    return cost;
  };

  // Form state
  const [formData, setFormData] = useState({
    customer_name: "",
    item_name: "",
    minimal_load_quantity: 0,
    actual_load_quantity: 0,
    unit: "ton",
    unit_price: 0,
    load_location: "",
    unload_location: "",
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
    }
    // eslint-disable-next-line
  }, [id]);

  const fetchDeliveryOrder = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/delivery-orders/${id}`);
      const data = response.data.data;

      setDeliveryOrder(data);
      setFormData({
        customer_name: data.customer_name || "",
        item_name: data.item_name || "",
        minimal_load_quantity: data.minimal_load_quantity || 0,
        actual_load_quantity: data.actual_load_quantity || 0,
        unit: data.unit || "ton",
        unit_price: data.unit_price || 0,
        load_location: data.load_location || "",
        unload_location: data.unload_location || "",
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

      // Auto-calculate gas filling cost when gas-related fields change
      if (name === 'gas_volume_m3' || name === 'calculation_method' || name === 'jisdor_rate') {
        newFormData.gas_filling_cost = calculateGasFillingCost(newFormData);
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

      await apiClient.put(`/delivery-orders/${id}`, formData);

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
          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name
            </label>
            <input
              type="text"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name
            </label>
            <input
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Minimal Load Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Quantity
            </label>
            <input
              type="number"
              name="minimal_load_quantity"
              value={formData.minimal_load_quantity}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ton">Ton</option>
              <option value="kilogram">Kilogram</option>
              <option value="kubik">Kubik</option>
            </select>
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
            {/* Gas Volume (m³) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gas Volume (m³)
              </label>
              <input
                type="number"
                name="gas_volume_m3"
                value={formData.gas_volume_m3}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                placeholder="100.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <input
                type="number"
                name="jisdor_rate"
                value={formData.jisdor_rate}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                placeholder="7800.00"
                disabled={formData.calculation_method !== 'jisdor'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formData.calculation_method !== 'jisdor' ? 'bg-gray-100' : ''
                }`}
              />
              {formData.calculation_method !== 'jisdor' && (
                <p className="text-xs text-gray-500 mt-1">Only required for JISDOR calculation</p>
              )}
            </div>

            {/* Gas Filling Cost */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gas Filling Cost (IDR)
              </label>
              <input
                type="number"
                name="gas_filling_cost"
                value={formData.gas_filling_cost}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                max="999999999"
                placeholder="Calculated automatically"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-blue-100 font-medium"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.calculation_method === 'jisdor' 
                  ? 'Formula: (Volume/27.27) × 12.7 × JISDOR Rate'
                  : 'Fixed Rate: 7,800 IDR per m³'
                }
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

        {/* Load Location */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Load Location
          </label>
          <input
            type="text"
            name="load_location"
            value={formData.load_location}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Unload Location */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unload Location
          </label>
          <input
            type="text"
            name="unload_location"
            value={formData.unload_location}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
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
