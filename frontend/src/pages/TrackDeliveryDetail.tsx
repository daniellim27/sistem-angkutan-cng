import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import LiveTrackingMap from '../components/LiveTrackingMap';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

interface DeliveryOrder {
  id: number;
  do_number: string;
  do_name?: string;
  standalone_po_number?: string;
  customer_name: string;
  item_name: string;
  minimal_load_quantity: number;
  actual_load_quantity?: number;
  unit: string;
  unit_price?: number;
  status: string;
  status_text: string;
  driver_name: string;
  vehicle_info: string;
  created_at: string;
  updated_at: string;
  load_location?: string;
  unload_location?: string;
  financial_summary: {
    trip_allowance: number;
    gaji: number;
    total_for_driver: number;
    minimal_total_amount: number;
    actual_total_amount?: number;
    ongkosan: number;
    net_profit: number;
    unit: string;
    unit_display: string;
  };
  purchaseOrder?: {
    id: number;
    po_number: string;
    unit?: string;
  };
  vehicle?: {
    id: number;
    license_plate: string;
    type: string;
  };
  driver?: {
    id: number;
    username: string;
    driverProfile?: {
      full_name: string;
      phone: string;
    };
  };
  surat_jalan_photo_url?: string | string[];
  nota_photo_url?: string | string[];
  ongkosan?: number;
}

const TrackDeliveryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'tracking'>('details');

  // Fetch delivery order details
  const fetchDeliveryOrder = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/delivery-orders/${id}`);
      
      // Handle response format (same as DeliveryOrderDetail page)
      const orderData = response.data.data || response.data;
      
      if (orderData) {
        setDeliveryOrder(orderData);
      } else {
        setError('Delivery order not found');
      }
    } catch (err: any) {
      console.error('Error fetching delivery order:', err);
      setError(err.response?.data?.message || 'Failed to fetch delivery order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOrder();
  }, [id]);

  // Unit display helper
  const getUnitDisplay = (unit: string) => {
    const unitMap = {
      kilogram: "kg",
      ton: "ton",
      kubik: "m³",
    };
    return unitMap[unit as keyof typeof unitMap] || unit;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "otw_to_load_location":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "at_load_location":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "otw_to_unload_location":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "at_unload_location":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "otw_to_base":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "assigned":
        return "📋";
      case "otw_to_load_location":
        return "🚛";
      case "at_load_location":
        return "📦";
      case "otw_to_unload_location":
        return "🚚";
      case "at_unload_location":
        return "📍";
      case "otw_to_base":
        return "🏠";
      case "completed":
        return "✅";
      case "cancelled":
        return "❌";
      default:
        return "📄";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (error || !deliveryOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Delivery Details</div>
          <div className="text-red-500 mb-4">{error || 'Delivery order not found'}</div>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/live-tracking')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Back to Tracking
            </button>
            <button
              onClick={fetchDeliveryOrder}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unitDisplay = getUnitDisplay(deliveryOrder.unit || 'ton');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/live-tracking')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{deliveryOrder.do_number}</h1>
                {deliveryOrder.do_name && (
                  <p className="text-gray-600">{deliveryOrder.do_name}</p>
                )}
              </div>
            </div>
            
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(deliveryOrder.status)}`}>
              <span className="mr-2">{getStatusIcon(deliveryOrder.status)}</span>
              {deliveryOrder.status_text}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Delivery Details
              </button>
              <button
                onClick={() => setActiveTab('tracking')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'tracking'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Live Tracking
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">PO Number:</dt>
                  <dd className="text-sm text-gray-900">
                    {deliveryOrder.purchaseOrder?.po_number || 
                     deliveryOrder.standalone_po_number || 
                     `STANDALONE-${deliveryOrder.id}`}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Customer:</dt>
                  <dd className="text-sm text-gray-900">{deliveryOrder.customer_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Item:</dt>
                  <dd className="text-sm text-gray-900">{deliveryOrder.item_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Target Quantity:</dt>
                  <dd className="text-sm text-gray-900">
                    {deliveryOrder.minimal_load_quantity.toLocaleString()} {unitDisplay}
                  </dd>
                </div>
                {deliveryOrder.actual_load_quantity && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Actual Quantity:</dt>
                    <dd className={`text-sm ${
                      deliveryOrder.actual_load_quantity >= deliveryOrder.minimal_load_quantity 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                    }`}>
                      {deliveryOrder.actual_load_quantity.toLocaleString()} {unitDisplay}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Created:</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(deliveryOrder.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Driver & Vehicle Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Driver & Vehicle</h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Driver:</dt>
                  <dd className="text-sm text-gray-900">{deliveryOrder.driver_name}</dd>
                </div>
                {deliveryOrder.driver?.driverProfile?.phone && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Phone:</dt>
                    <dd className="text-sm text-gray-900">{deliveryOrder.driver.driverProfile.phone}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Vehicle:</dt>
                  <dd className="text-sm text-gray-900">{deliveryOrder.vehicle_info}</dd>
                </div>
                {deliveryOrder.vehicle?.license_plate && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">License Plate:</dt>
                    <dd className="text-sm text-gray-900 font-mono">{deliveryOrder.vehicle.license_plate}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Location Information */}
            {(deliveryOrder.load_location || deliveryOrder.unload_location) && (
              <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Locations</h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deliveryOrder.load_location && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">SPBU Location:</dt>
                      <dd className="text-sm text-gray-900 mt-1">{deliveryOrder.load_location}</dd>
                    </div>
                  )}
                  {deliveryOrder.unload_location && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Unload Location:</dt>
                      <dd className="text-sm text-gray-900 mt-1">{deliveryOrder.unload_location}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Documents Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📄 Documents</h2>
              
              {/* Surat Jalan Documents */}
              {Array.isArray(deliveryOrder.surat_jalan_photo_url) && deliveryOrder.surat_jalan_photo_url.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-medium text-gray-800 mb-3">Surat Jalan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {deliveryOrder.surat_jalan_photo_url.map((photoUrl, index) => (
                      <div key={index} className="relative group">
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-center justify-center space-x-2 mb-3">
                            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">
                              Document {(deliveryOrder.surat_jalan_photo_url?.length || 0) > 1 ? `#${index + 1}` : ''}
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <img
                              src={`${BACKEND_URL}/${photoUrl}`}
                              alt={`Surat Jalan ${index + 1}`}
                              className="w-full h-28 object-cover rounded-md border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          
                          <div className="text-center">
                            <a
                              href={`${BACKEND_URL}/${photoUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              View Full Size
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">
                        {deliveryOrder.surat_jalan_photo_url?.length || 0} document{(deliveryOrder.surat_jalan_photo_url?.length || 0) > 1 ? 's' : ''} uploaded
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Nota Documents */}
              {Array.isArray(deliveryOrder.nota_photo_url) && deliveryOrder.nota_photo_url.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-medium text-gray-800 mb-3">Nota (Receipt)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {deliveryOrder.nota_photo_url.map((photoUrl, index) => (
                      <div key={index} className="relative group">
                        <div className="bg-gray-50 border-2 border-dashed border-orange-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
                          <div className="flex items-center justify-center space-x-2 mb-3">
                            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">
                              Nota {(deliveryOrder.nota_photo_url?.length || 0) > 1 ? `#${index + 1}` : ''}
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <img
                              src={`${BACKEND_URL}/${photoUrl}`}
                              alt={`Nota ${index + 1}`}
                              className="w-full h-28 object-cover rounded-md border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          
                          <div className="text-center">
                            <a
                              href={`${BACKEND_URL}/${photoUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              View Full Size
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show message when no documents are available */}
              {((!deliveryOrder.surat_jalan_photo_url || (Array.isArray(deliveryOrder.surat_jalan_photo_url) && deliveryOrder.surat_jalan_photo_url.length === 0)) &&
                (!deliveryOrder.nota_photo_url || (Array.isArray(deliveryOrder.nota_photo_url) && deliveryOrder.nota_photo_url.length === 0))) && (
                <div className="text-center py-6">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No documents uploaded yet</p>
                  <p className="text-gray-400 text-sm mt-1">Surat jalan and nota documents will appear here once uploaded by the driver</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Vehicle Tracking</h2>
            <div className="text-sm text-gray-600 mb-4">
              Tracking vehicle {deliveryOrder.vehicle?.license_plate || deliveryOrder.vehicle_info} 
              assigned to delivery order {deliveryOrder.do_number}
            </div>
            <LiveTrackingMap
              deliveryOrderId={deliveryOrder.id}
              autoRefresh={true}
              refreshInterval={30000}
              className="h-[600px]"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackDeliveryDetail;
