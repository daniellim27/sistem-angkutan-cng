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

interface PurchaseOrder {
  id: number;
  po_number: string;
  customer_name: string;
  item_name: string;
  unit_price: number;
  total_quantity: number;
  unit: string;
  status: string;
}

const DeliveryOrderCreatePage = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Enhanced form data with gas filling fields
  const [formData, setFormData] = useState({
    customer_name: '',
    item_name: '',
    unit_price: '',
    minimal_load_quantity: '',
    actual_load_quantity: '',
    final_amount: '',
    total_amount: '',
    paid_amount: '0',
    payment_status: 'pending',
    // Gas filling fields
    gas_volume_m3: '',
    spbg_location: '',
    calculation_method: 'jisdor' as 'jisdor' | 'fixed',
    jisdor_rate: '',
    gas_filling_cost: ''
  });

  // SPBG locations for selection
  const spbgLocations: { value: string; label: string }[] = [];

  // Gas calculation methods
  const calculationMethods: { value: string; label: string }[] = [];

  useEffect(() => {
    if (poId) {
      fetchPurchaseOrder();
    }
  }, [poId]);

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/purchase-orders/${poId}`);
      const po = response.data.data || response.data;
      setPurchaseOrder(po);
      
      // Pre-fill form with PO data
      setFormData(prev => ({
        ...prev,
        customer_name: po.customer_name || '',
        item_name: po.item_name || '',
        unit_price: po.unit_price?.toString() || '',
        minimal_load_quantity: po.total_quantity?.toString() || '',
        total_amount: (po.unit_price * po.total_quantity)?.toString() || ''
      }));
    } catch (err) {
      setError('Failed to fetch purchase order details.');
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
    
    if (!purchaseOrder) return;

    try {
      setSubmitting(true);
      
      const payload = {
        purchase_order_id: purchaseOrder.id,
        customer_name: formData.customer_name,
        item_name: formData.item_name,
        unit_price: parseFloat(formData.unit_price),
        minimal_load_quantity: parseFloat(formData.minimal_load_quantity),
        actual_load_quantity: parseFloat(formData.actual_load_quantity) || parseFloat(formData.minimal_load_quantity),
        final_amount: parseFloat(formData.final_amount),
        total_amount: parseFloat(formData.total_amount),
        paid_amount: parseFloat(formData.paid_amount),
        payment_status: formData.payment_status,
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
      unit_price: '',
      minimal_load_quantity: '',
      actual_load_quantity: '',
      final_amount: '',
      total_amount: '',
      paid_amount: '0',
      payment_status: 'pending',
      // Reset gas filling fields
      gas_volume_m3: '',
      spbg_location: '',
      calculation_method: 'jisdor',
      jisdor_rate: '',
      gas_filling_cost: ''
    });
  };

  if (loading) return <div className="text-center p-8">Loading purchase order details...</div>;

  if (!purchaseOrder) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">Purchase order not found.</div>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Create Delivery Order</h1>
        <p className="text-gray-600">From Purchase Order: {purchaseOrder.po_number}</p>
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
                Actual Load Quantity
              </label>
              <input
                type="number"
                name="actual_load_quantity"
                value={formData.actual_load_quantity}
                onChange={handleInputChange}
                step="0.01"
                placeholder="Leave empty to use minimal quantity"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Amount (IDR)
              </label>
              <input
                type="number"
                name="total_amount"
                value={formData.total_amount}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Final Amount (IDR)
              </label>
              <input
                type="number"
                name="final_amount"
                value={formData.final_amount}
                onChange={handleInputChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Status
              </label>
              <select
                name="payment_status"
                value={formData.payment_status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
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
