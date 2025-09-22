// src/pages/DeliveryOrderCreatePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

interface DeliveryOrder {
  id: number;
  do_number: string;
  unit_price: number;
  actual_load_quantity?: number;
  final_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  payment_id?: number;
  // Enhanced with gas filling fields
  gas_volume_m3?: number;
  calculation_method?: 'jisdor' | 'fixed';
  jisdor_rate?: number;
  gas_filling_cost?: number;
}

interface Customer {
  id: number;
  customer_name: string;
  location: string;
  display_name: string;
}

const DeliveryOrderCreatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Standalone DO form data with all required fields
  const [formData, setFormData] = useState({
    unit: 'kubik', // DOs always use kubik
    unit_price: '',
    driver_id: '',
    vehicle_id: '',
    load_location: '',
    unload_location: '',
    customer_name: '',
    customer_location: '',
    trip_allowance: '0',
    gaji: '0',
    do_name: '',
    paid_amount: '0',
    // Gas filling fields
    gas_volume_m3: '',
    calculation_method: 'jisdor' as 'jisdor' | 'fixed',
    jisdor_rate: '',
    gas_filling_cost: ''
  });

  // State for multiple unload locations - now using customer IDs
  const [unloadLocations, setUnloadLocations] = useState<string[]>(['']);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<(number | null)[]>([null]);

  // Add state for drivers, vehicles, and customers
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchDriversVehiclesAndCustomers();
  }, []);

  const fetchDriversVehiclesAndCustomers = async () => {
    try {
      setLoading(true);
      const [driversRes, vehiclesRes, customersRes] = await Promise.all([
        apiClient.get('/users?role=driver'),
        apiClient.get('/vehicles'),
        apiClient.get('/customers/locations')
      ]);
      setDrivers(driversRes.data.data || driversRes.data || []);
      setVehicles(vehiclesRes.data.data || vehiclesRes.data || []);
      setCustomers(customersRes.data.data || customersRes.data || []);
    } catch (err) {
      setError('Failed to fetch drivers, vehicles, and customers.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-calculate amounts when unit price changes
    if (name === 'unit_price') {
      const price = parseFloat(value);
      
      if (!isNaN(price)) {
        // Set a default quantity of 1 for calculation
        const total = price;
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
    setSelectedCustomerIds(prev => [...prev, null]);
  };

  const removeUnloadLocation = (index: number) => {
    if (unloadLocations.length > 1) {
      setUnloadLocations(prev => prev.filter((_, i) => i !== index));
      setSelectedCustomerIds(prev => prev.filter((_, i) => i !== index));
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

  const handleAdditionalCustomerChange = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    if (customerId) {
      const selectedCustomer = customers.find((c: Customer) => c.id.toString() === customerId);
      if (selectedCustomer) {
        // Update the location
        setUnloadLocations(prev => {
          const newLocations = [...prev];
          newLocations[index] = selectedCustomer.location;
          return newLocations;
        });

        // Update selected customer IDs
        setSelectedCustomerIds(prev => {
          const newIds = [...prev];
          newIds[index] = selectedCustomer.id;
          return newIds;
        });

        // Keep the main fields in sync with the first location for backward compatibility
        if (index === 0) {
          setFormData(prev => ({
            ...prev,
            customer_name: selectedCustomer.customer_name,
            customer_location: selectedCustomer.location,
            unload_location: selectedCustomer.location
          }));
        }
      }
    } else {
      // Clear the location
      setUnloadLocations(prev => {
        const newLocations = [...prev];
        newLocations[index] = '';
        return newLocations;
      });

      // Clear selected customer ID
      setSelectedCustomerIds(prev => {
        const newIds = [...prev];
        newIds[index] = null;
        return newIds;
      });

      // Keep the main fields in sync with the first location for backward compatibility
      if (index === 0) {
        setFormData(prev => ({
          ...prev,
          customer_name: '',
          customer_location: '',
          unload_location: ''
        }));
      }
    }
  };

  // Get available customers for a specific dropdown (excluding already selected ones)
  const getAvailableCustomers = (currentIndex: number) => {
    return customers.filter((customer) => {
      const isAlreadySelected = selectedCustomerIds.some((id, index) => 
        index !== currentIndex && id === customer.id
      );
      return !isAlreadySelected;
    });
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
        unit: 'kubik', // Force kubik for DOs
        unit_price: parseFloat(formData.unit_price),
        driver_id: parseInt(formData.driver_id),
        vehicle_id: parseInt(formData.vehicle_id),
        load_location: formData.load_location,
        unload_location: formData.unload_location,
        customer_name: formData.customer_name,
        customer_location: formData.customer_location,
        additional_unload_locations: unloadLocations.slice(1).filter(loc => loc.trim() !== ''), // Include only additional locations (excluding first one)
        trip_allowance: parseFloat(formData.trip_allowance),
        gaji: parseFloat(formData.gaji),
        do_name: formData.do_name,
        // Include gas filling data
        gas_volume_m3: formData.gas_volume_m3 ? parseFloat(formData.gas_volume_m3) : null,
        calculation_method: formData.calculation_method,
        jisdor_rate: formData.jisdor_rate ? parseFloat(formData.jisdor_rate) : null,
        gas_filling_cost: formData.gas_filling_cost ? parseFloat(formData.gas_filling_cost) : null
      };

      console.log('🗺️ Creating delivery order with location scraping...');
      const response = await apiClient.post('/delivery-orders', payload);
      
      // Check if background scraping is in progress
      const responseData = response.data.success ? response.data.data : response.data;
      if (responseData.scraping_in_progress) {
        console.log('📍 Location coordinates will be blcraped in the background');
        // You could show a toast notification here if desired
      }
      
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
      unit: 'kubik', // DOs always use kubik
      unit_price: '',
      driver_id: '',
      vehicle_id: '',
      load_location: '',
      unload_location: '',
      customer_name: '',
      customer_location: '',
      trip_allowance: '0',
      gaji: '0',
      do_name: '',
      paid_amount: '0',
      // Reset gas filling fields
      gas_volume_m3: '',
      calculation_method: 'jisdor',
      jisdor_rate: '',
      gas_filling_cost: ''
    });
    // Reset unload locations
    setUnloadLocations(['']);
    setSelectedCustomerIds([null]);
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

            {/* Customer Locations (Unload Locations) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Locations *
              </label>
              <div className="space-y-2">
                {unloadLocations.map((location, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <select
                        value={selectedCustomerIds[index] || ''}
                        onChange={(e) => handleAdditionalCustomerChange(index, e)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={index === 0} // First location is required
                      >
                        <option value="">
                          {index === 0 ? "Select Primary Customer Location" : `Select Additional Customer Location ${index + 1}`}
                        </option>
                        {getAvailableCustomers(index).map((customer: Customer) => (
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
                  Add Customer Location
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select customers from the dropdown. Each customer can only be selected once.
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
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 flex items-center"
          >
            {submitting && (
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {submitting ? 'Creating...' : 'Create Delivery Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryOrderCreatePage;
