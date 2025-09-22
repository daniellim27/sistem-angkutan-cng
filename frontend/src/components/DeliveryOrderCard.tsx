import React from 'react';
import { Link } from 'react-router-dom';

// Interface for delivery order data
interface DeliveryOrder {
  id: number;
  do_number: string;
  do_name?: string;
  standalone_po_number?: string;
  customer_name?: string;
  item_name?: string;
  minimal_load_quantity?: number;
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
}

interface DeliveryOrderCardProps {
  deliveryOrder: DeliveryOrder;
}

const DeliveryOrderCard: React.FC<DeliveryOrderCardProps> = ({ deliveryOrder }) => {
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

  const orderUnit = getOrderUnit(deliveryOrder);
  const unitDisplay = getUnitDisplay(orderUnit);
  const unitPrice = deliveryOrder.unit_price ? parseFloat(deliveryOrder.unit_price.toString()) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Header with Status */}
      <div className={`px-4 py-3 border-b border-gray-200 ${getStatusColor(deliveryOrder.status).replace('text-', 'bg-').replace('bg-', 'bg-opacity-10 border-l-4 border-')}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getStatusIcon(deliveryOrder.status)}</span>
            <h3 className="text-lg font-semibold text-gray-900">{deliveryOrder.do_number}</h3>
          </div>
          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(deliveryOrder.status)}`}>
            {deliveryOrder.status_text}
          </span>
        </div>
        
        {deliveryOrder.do_name && (
          <p className="text-sm text-gray-600 mt-1">{deliveryOrder.do_name}</p>
        )}
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
            <span className="text-sm font-medium text-gray-900 text-right">{deliveryOrder.customer_name || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-500">Item:</span>
            <span className="text-sm text-gray-700 text-right">{deliveryOrder.item_name || 'N/A'}</span>
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

        {/* Quantity Information - only show if minimal_load_quantity exists */}
        {deliveryOrder.minimal_load_quantity && (
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Target:</span>
              <span className="text-sm font-semibold text-gray-900">
                {parseFloat(deliveryOrder.minimal_load_quantity.toString()).toLocaleString("id-ID")} {unitDisplay}
              </span>
            </div>
            
            {deliveryOrder.actual_load_quantity && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-500">Actual:</span>
                <span className="text-sm font-semibold text-green-600">
                  {parseFloat(deliveryOrder.actual_load_quantity.toString()).toLocaleString("id-ID")} {unitDisplay}
                </span>
              </div>
            )}

            {/* Progress bar - only show if both actual and minimal exist */}
            {deliveryOrder.actual_load_quantity && deliveryOrder.minimal_load_quantity && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>
                    {Math.round((deliveryOrder.actual_load_quantity / deliveryOrder.minimal_load_quantity) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      deliveryOrder.actual_load_quantity >= deliveryOrder.minimal_load_quantity
                        ? "bg-green-500"
                        : "bg-orange-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        (deliveryOrder.actual_load_quantity / deliveryOrder.minimal_load_quantity) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show actual quantity even if no target quantity exists */}
        {!deliveryOrder.minimal_load_quantity && deliveryOrder.actual_load_quantity && (
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Actual:</span>
              <span className="text-sm font-semibold text-green-600">
                {parseFloat(deliveryOrder.actual_load_quantity.toString()).toLocaleString("id-ID")} {unitDisplay}
              </span>
            </div>
          </div>
        )}

        {/* Financial Information */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Total Amount:</span>
            <span className="text-sm font-bold text-green-600">
              Rp {(deliveryOrder.financial_summary.minimal_total_amount || 0).toLocaleString("de-DE")}
            </span>
          </div>
          
          {deliveryOrder.financial_summary.actual_total_amount &&
           deliveryOrder.financial_summary.actual_total_amount !== deliveryOrder.financial_summary.minimal_total_amount && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-gray-500">Actual Amount:</span>
              <span className="text-sm font-bold text-blue-600">
                Rp {deliveryOrder.financial_summary.actual_total_amount.toLocaleString("id-ID")}
              </span>
            </div>
          )}

          {deliveryOrder.unit_price && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-gray-500">Unit Price:</span>
              <span className="text-xs text-gray-600">
                Rp {unitPrice.toLocaleString("de-DE")}/{unitDisplay}
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
        
        <div className="flex space-x-2">
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

          {/* View Details Link */}
          <Link
            to={`/delivery-orders/${deliveryOrder.id}`}
            className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors duration-200"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DeliveryOrderCard;
