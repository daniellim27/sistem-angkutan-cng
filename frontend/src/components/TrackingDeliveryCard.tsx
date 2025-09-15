import React from 'react';
import { useNavigate } from 'react-router-dom';

// Interface for delivery order data
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
    po_number: string;
    unit?: string;
  };
  surat_jalan_photo_url?: string | string[];
  ongkosan?: number;
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
}

interface TrackingDeliveryCardProps {
  deliveryOrder: DeliveryOrder;
}

const TrackingDeliveryCard: React.FC<TrackingDeliveryCardProps> = ({ deliveryOrder }) => {
  const navigate = useNavigate();

  // 🎯 Unit display helper - always show cubic meters
  const getUnitDisplay = (unit: string) => {
    return "m³"; // All units are displayed as cubic meters
  };

  // 🎯 Get unit with fallback
  const getOrderUnit = (order: DeliveryOrder) => {
    return "kubik"; // All delivery orders use cubic meters
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "at_spbu":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "otw_to_unload_location":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "at_unload_location":
        return "bg-orange-100 text-orange-800 border-orange-200";
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
      case "at_spbu":
        return "⛽";
      case "otw_to_unload_location":
        return "🚚";
      case "at_unload_location":
        return "📍";
      case "completed":
        return "✅";
      case "cancelled":
        return "❌";
      default:
        return "📄";
    }
  };

  const handleTrackDelivery = () => {
    navigate(`/track-delivery/${deliveryOrder.id}`);
  };

  const orderUnit = getOrderUnit(deliveryOrder);
  const unitDisplay = getUnitDisplay(orderUnit);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {deliveryOrder.do_number}
          </h3>
          {deliveryOrder.do_name && (
            <p className="text-sm text-gray-600">{deliveryOrder.do_name}</p>
          )}
        </div>

        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(deliveryOrder.status)}`}>
          <span className="mr-1">{getStatusIcon(deliveryOrder.status)}</span>
          {deliveryOrder.status_text}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* PO Number */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">PO Number:</span>
          <span className="text-sm font-medium text-gray-900">
            {deliveryOrder.purchaseOrder?.po_number || 
             deliveryOrder.standalone_po_number || 
             `STANDALONE-${deliveryOrder.id}`}
          </span>
        </div>

        {/* Customer & Item */}
        <div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Customer:</span>
            <span className="text-sm font-medium text-gray-900 text-right">{deliveryOrder.customer_name}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-500">Item:</span>
            <span className="text-sm text-gray-700 text-right">{deliveryOrder.item_name}</span>
          </div>
        </div>

        {/* Driver & Vehicle */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Driver:</span>
            <span className="text-sm font-medium text-gray-900">{deliveryOrder.driver_name}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-500">Vehicle:</span>
            <span className="text-sm text-gray-700">{deliveryOrder.vehicle_info}</span>
          </div>
        </div>

        {/* Quantity Information */}
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Target Quantity:</span>
            <span className="text-sm font-medium text-gray-900">
              {deliveryOrder.minimal_load_quantity.toLocaleString()} {unitDisplay}
            </span>
          </div>
          
          {deliveryOrder.actual_load_quantity && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-gray-500">Actual Quantity:</span>
              <span className={`text-sm font-medium ${
                deliveryOrder.actual_load_quantity >= deliveryOrder.minimal_load_quantity 
                  ? 'text-green-600' 
                  : 'text-orange-600'
              }`}>
                {deliveryOrder.actual_load_quantity.toLocaleString()} {unitDisplay}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {new Date(deliveryOrder.created_at).toLocaleDateString('id-ID')}
        </div>
        
        <div className="flex space-x-2 items-center">
          {/* Document indicator */}
          {Array.isArray(deliveryOrder.surat_jalan_photo_url) && 
           deliveryOrder.surat_jalan_photo_url.length > 0 && (
            <div className="inline-flex items-center text-blue-600 text-xs">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Doc
            </div>
          )}

          {/* Track Button */}
          <button
            onClick={handleTrackDelivery}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Track
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrackingDeliveryCard;

