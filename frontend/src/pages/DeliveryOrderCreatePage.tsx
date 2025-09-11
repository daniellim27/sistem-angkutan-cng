// src/pages/DeliveryOrderCreatePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

interface DeliveryOrder {
  id: number;
  do_number: string;
  customer_name: string;
  item_name: string;
  unit_price: number;
  minimal_load_quantity: number;
  actual_load_quantity?: number;
  final_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  payment_id?: number;
  // Enhanced with gas filling fields
  gas_volume_m3?: number;
  spbg_location?: string;
  calculation_method?: 'jisdor' | 'fixed';
  jisdor_rate?: number;
  gas_filling_cost?: number;
}

const DeliveryOrderCreatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Standalone DO form data with all required fields
  const [formData, setFormData] = useState({
    customer_name: '',
    item_name: '',
    unit: 'kubik', // DOs always use kubik
    unit_price: '',
    minimal_load_quantity: '',
    driver_id: '',
    vehicle_id: '',
    load_location: '',
    unload_location: '',
    trip_allowance: '0',
    gaji: '0',
    do_name: '',
    paid_amount: '0',
    // Gas filling fields
    gas_volume_m3: '',
    spbg_location: '',
    calculation_method: 'jisdor' as 'jisdor' | 'fixed',
    jisdor_rate: '',
    gas_filling_cost: ''
  });

  // State for multiple unload locations
  const [unloadLocations, setUnloadLocations] = useState<string[]>(['']);

  // SPBG locations for selection
  const spbgLocations: { value: string; label: string }[] = [];

  // Gas calculation methods
  const calculationMethods: { value: string; label: string }[] = [];

  // Add state for drivers and vehicles
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    fetchDriversAndVehicles();
  }, []);

  const fetchDriversAndVehicles = async () => {
    try {
      setLoading(true);
      const [driversRes, vehiclesRes] = await Promise.all([
        apiClient.get('/users?role=driver'),
        apiClient.get('/vehicles')
      ]);
      setDrivers(driversRes.data.data || driversRes.data || []);
      setVehicles(vehiclesRes.data.data || vehiclesRes.data || []);
    } catch (err) {
      setError('Failed to fetch drivers and vehicles.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-calculate amounts when quantity or unit price changes
    if (name === 'minimal_load_quantity' || name === 'unit_price') {
      const quantity = parseFloat(name === 'minimal_load_quantity' ? value : formData.minimal_load_quantity);
      const price = parseFloat(name === 'unit_price' ? value : formData.unit_price);
      
      if (!isNaN(quantity) && !isNaN(price)) {
        const total = quantity * price;
        setFormData(prev => ({ 
          ...prev, 
          total_amount: total.toString(),
          final_amount: total.toString()
        }));
      }
    }

    // Auto-calculate gas filling cost when volume changes
    if (name === 'gas_volume_m3' || name === 'calculation_method' || name === 'jisdor_rate') {
      calculateGasFillingCost();
    }
  };

  // Functions to handle multiple unload locations
  const addUnloadLocation = () => {
    setUnloadLocations(prev => [...prev, '']);
  };

  const removeUnloadLocation = (index: number) => {
    if (unloadLocations.length > 1) {
      setUnloadLocations(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateUnloadLocation = (index: number, value: string) => {
    setUnloadLocations(prev => {
      const newLocations = [...prev];
      newLocations[index] = value;
      return newLocations;
    });
    
    // Keep the main unload_location field in sync with the first location for backward compatibility
    if (index === 0) {
      setFormData(prev => ({
        ...prev,
        unload_location: value
      }));
    }
  };

  const calculateGasFillingCost = () => {
    const volume = parseFloat(formData.gas_volume_m3);
    if (!volume) {
      setFormData(prev => ({ ...prev, gas_filling_cost: '' }));
      return;
    }

    let cost = 0;
    if (formData.calculation_method === 'jisdor' && formData.jisdor_rate) {
      const jisdorRate = parseFloat(formData.jisdor_rate);
      if (!isNaN(jisdorRate)) {
        // Formula: (volume/27.27) * 12.7 * jisdor_rate
        cost = (volume / 27.27) * 12.7 * jisdorRate;
      }
    } else if (formData.calculation_method === 'fixed') {
      // Fixed rate: 7800 IDR per m³
      cost = volume * 7800;
    }

    setFormData(prev => ({ 
      ...prev, 
      gas_filling_cost: cost > 0 ? cost.toString() : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      const payload = {
        customer_name: formData.customer_name,
        item_name: formData.item_name,
        unit: 'kubik', // Force kubik for DOs
        unit_price: parseFloat(formData.unit_price),
        minimal_load_quantity: parseFloat(formData.minimal_load_quantity),
        driver_id: parseInt(formData.driver_id),
        vehicle_id: parseInt(formData.vehicle_id),
        load_location: formData.load_location,
        unload_location: formData.unload_location,
        additional_unload_locations: unloadLocations.filter(loc => loc.trim() !== ''), // Include additional unload locations
        trip_allowance: parseFloat(formData.trip_allowance),
        gaji: parseFloat(formData.gaji),
        do_name: formData.do_name,
        // Include gas filling data
        gas_volume_m3: formData.gas_volume_m3 ? parseFloat(formData.gas_volume_m3) : null,
        spbg_location: formData.spbg_location || null,
        calculation_method: formData.calculation_method,
        jisdor_rate: formData.jisdor_rate ? parseFloat(formData.jisdor_rate) : null,
        gas_filling_cost: formData.gas_filling_cost ? parseFloat(formData.gas_filling_cost) : null
      };

      await apiClient.post('/delivery-orders', payload);
      navigate('/delivery-orders');
    } catch (err) {
      setError('Failed to create delivery order.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      item_name: '',
      unit: 'kubik', // DOs always use kubik
      unit_price: '',
      minimal_load_quantity: '',
      driver_id: '',
      vehicle_id: '',
      load_location: '',
      unload_location: '',
      trip_allowance: '0',
      gaji: '0',
      do_name: '',
      paid_amount: '0',
      // Reset gas filling fields
      gas_volume_m3: '',
      spbg_location: '',
      calculation_method: 'jisdor',
      jisdor_rate: '',
      gas_filling_cost: ''
    });
    // Reset unload locations
    setUnloadLocations(['']);
  };

  if (loading) return <div className="text-center p-8">Loading drivers and vehicles...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Create Delivery Order</h1>
        <p className="text-gray-600">Create a standalone delivery order with all required details</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Delivery Order Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Order Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name *
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                disabled
                required
              >
                <option value="kubik">Kubik (m³)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Delivery orders always use cubic meters (m³)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver *
              </label>
              <select
                name="driver_id"
                value={formData.driver_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Driver</option>
                {drivers.map((driver: any) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.driverProfile?.full_name || driver.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle *
              </label>
              <select
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Vehicle</option>
                {vehicles.map((vehicle: any) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.license_plate} - {vehicle.type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price (IDR) *
              </label>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleInputChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimal Load Quantity *
              </label>
              <input
                type="number"
                name="minimal_load_quantity"
                value={formData.minimal_load_quantity}
                onChange={handleInputChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DO Name
              </label>
              <input
                type="text"
                name="do_name"
                value={formData.do_name}
                onChange={handleInputChange}
                placeholder="Optional descriptive name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SPBU Location *
              </label>
              <input
                type="text"
                name="load_location"
                value={formData.load_location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter SPBU (Gas Station) location"
                required
              />
            </div>

            {/* Multiple Unload Locations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unload Locations *
              </label>
              <div className="space-y-2">
                {unloadLocations.map((location, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => updateUnloadLocation(index, e.target.value)}
                      placeholder={`Unload location ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={index === 0} // First location is required
                    />
                    {unloadLocations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUnloadLocation(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                        title="Remove location"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addUnloadLocation}
                  className="inline-flex items-center px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Unload Location
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Add multiple unload locations for this delivery order. First location is required.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Allowance (IDR) *
              </label>
              <input
                type="number"
                name="trip_allowance"
                value={formData.trip_allowance}
                onChange={handleInputChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gaji (IDR) *
              </label>
              <input
                type="number"
                name="gaji"
                value={formData.gaji}
                onChange={handleInputChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paid Amount (IDR)
              </label>
              <input
                type="number"
                name="paid_amount"
                value={formData.paid_amount}
                onChange={handleInputChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Gas Filling Information Section */}
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ⛽ Gas Filling Information
          </h2>
          <p className="text-gray-600 mb-4">
            Optional: Record gas filling details for this delivery order
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="100.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
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
                {spbgLocations.map(location => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
            </div>

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
                {calculationMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calculated Gas Filling Cost (IDR)
              </label>
              <input
                type="number"
                name="gas_filling_cost"
                value={formData.gas_filling_cost}
                readOnly
                placeholder="Will be calculated automatically"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-blue-50 font-medium"
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
          {formData.gas_volume_m3 && formData.spbg_location && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Gas Filling Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Volume:</span>
                  <span className="ml-2 text-blue-900 font-medium">{formData.gas_volume_m3} m³</span>
                </div>
                <div>
                  <span className="text-blue-700">Location:</span>
                  <span className="ml-2 text-blue-900 font-medium">
                    {spbgLocations.find(loc => loc.value === formData.spbg_location)?.label}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Method:</span>
                  <span className="ml-2 text-blue-900 font-medium capitalize">
                    {formData.calculation_method}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Cost:</span>
                  <span className="ml-2 text-blue-900 font-medium">
                    {formData.gas_filling_cost ? `Rp ${parseFloat(formData.gas_filling_cost).toLocaleString('id-ID')}` : 'Calculating...'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/delivery-orders')}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Delivery Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryOrderCreatePage;
