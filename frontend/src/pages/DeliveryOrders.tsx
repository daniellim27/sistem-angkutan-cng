// src/pages/DeliveryOrders.tsx
import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";
import { formatDeliveryOrdersForExport, exportToExcel, exportToCSV } from "../utils/exportUtils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

interface DeliveryOrder {
  id: number;
  do_number: string;
  do_name?: string; // Add the new field
  standalone_po_number?: string; // ✅ ADD this line
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
  // Location fields
  load_location?: string; // SPBU location
  unload_location?: string; // Customer location
  additional_unload_locations?: Array<{location: string, latitude?: number, longitude?: number}>; // Additional customer locations
  spbg_location?: string; // Gas filling location
  // Gas filling fields
  gas_volume_m3?: number;
  calculation_method?: 'jisdor' | 'fixed';
  jisdor_rate?: number;
  gas_filling_cost?: number;
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
  surat_jalan_photo_url?: string;
  nota_photo_url?: string[];
  ongkosan?: number;
}

// Removed PurchaseOrder interface - DOs are now standalone

const DeliveryOrdersPage = () => {
  const [searchParams] = useSearchParams();
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>(""); // Add search state
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false); // Export dropdown state
  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  // Removed purchaseOrders state - DOs are now standalone
  // Removed PO dropdown state - DOs are now standalone
  const navigate = useNavigate();
  // Removed dropdownRef - no longer needed

  const poId = searchParams.get("po_id");

  // 🎯 Unit display helper - always show cubic meters
  const getUnitDisplay = (unit: string) => {
    return "m³"; // All units are displayed as cubic meters
  };

  // 🎯 Get unit with fallback - DOs are always kubik
  const getOrderUnit = (order: DeliveryOrder) => {
    return "kubik"; // DOs always use kubik
  };

  useEffect(() => {
    fetchDeliveryOrders();
  }, [statusFilter, poId || "", searchQuery, currentPage, itemsPerPage]); // Add pagination dependencies with consistent array size

  // Handle clicking outside export dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (exportDropdownOpen && !target.closest('.export-dropdown')) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [exportDropdownOpen]);

  // Removed fetchPurchaseOrders - DOs are now standalone

  const handleAddDeliveryOrder = () => {
    // Navigate directly to standalone DO creation
    navigate('/delivery-orders/create');
  };

  // Export functions
  const handleExportExcel = () => {
    if (deliveryOrders.length === 0) {
      alert('No delivery orders to export');
      return;
    }
    const exportData = formatDeliveryOrdersForExport(deliveryOrders);
    exportToExcel(exportData, `delivery_orders_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportCSV = () => {
    if (deliveryOrders.length === 0) {
      alert('No delivery orders to export');
      return;
    }
    const exportData = formatDeliveryOrdersForExport(deliveryOrders);
    exportToCSV(exportData, `delivery_orders_${new Date().toISOString().split('T')[0]}`);
  };


  const fetchDeliveryOrders = async () => {
    try {
      setLoading(true);
      let url = "/delivery-orders"; // Use the web endpoint that supports pagination
      const params = new URLSearchParams();

      // Add pagination parameters
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (poId) {
        params.append("po_id", poId);
      }

      if (searchQuery) {
        params.append("search", searchQuery); // Add search parameter
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await apiClient.get(url);

      // Handle paginated response format
      const orders = response.data.success
        ? response.data.data
        : response.data || [];
      const stats = response.data.success ? response.data.stats : null;
      const pagination = response.data.success ? response.data.pagination : null;

      // Ensure unit field exists with fallback - DOs are always kubik
      const processedOrders = orders.map((order: DeliveryOrder) => ({
        ...order,
        unit: "kubik", // DOs always use kubik
      }));

      setDeliveryOrders(processedOrders);

      // Update pagination state
      if (pagination) {
        setTotalPages(pagination.totalPages);
        setTotalItems(pagination.total);
      }

      // Use extracted stats
      if (stats) {
        setStats(stats);
      }
    } catch (err) {
      setError("Failed to fetch delivery orders.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Reset pagination when filters change
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1); // Reset to first page
    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'search') {
      setSearchQuery(value);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "at_spbu":
        return "bg-purple-100 text-purple-800";
      case "otw_to_unload_location":
        return "bg-blue-100 text-blue-800";
      case "at_unload_location":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading)
    return <div className="text-center p-8">Loading delivery orders...</div>;
  if (error)
    return <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Delivery Orders</h1>
          {poId && (
            <p className="text-gray-600 mt-1">
              Filtered by Purchase Order ID: {poId}
              <Link
                to="/delivery-orders"
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                {/* (Clear filter) */}
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Export Dropdown */}
          <div className="relative export-dropdown">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleExportExcel();
                      setExportDropdownOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to Excel
                  </button>
                  <button
                    onClick={() => {
                      handleExportCSV();
                      setExportDropdownOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                  >
                    <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to CSV
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Add Delivery Order Button - Direct Creation */}
          <button
            onClick={handleAddDeliveryOrder}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <span className="mr-2">+</span>
            Add Delivery Order
          </button>
        </div>
      </div>

      {/* Search and Status Filter */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:space-x-4">
        <div className="flex-1 mb-4 sm:mb-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search delivery orders by DO number, name, customer, or item..."
            className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="otw_to_load_location">On Way to SPBU</option>
            <option value="at_load_location">At SPBU Location</option>
            <option value="otw_to_unload_location">On Way to Unload</option>
            <option value="at_unload_location">At Customer</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Items per page:
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Assigned</h3>
          <p className="text-2xl font-bold text-yellow-600">{stats.assigned}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">In Progress</h3>
          <p className="text-2xl font-bold text-blue-600">
            {stats.in_progress}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Completed</h3>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Cancelled</h3>
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
        </div>
      </div>

      {/* Delivery Orders Table */}
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                DO Number
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Driver
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                SPBU Location
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Customer Locations
              </th>
              <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Quantity & Unit
              </th>
              <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="w-12 px-2 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                Doc
              </th>
              <th className="w-16 px-2 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deliveryOrders.length > 0 ? (
              deliveryOrders.map((dOrder, index) => {
                const orderUnit = getOrderUnit(dOrder);
                const unitDisplay = getUnitDisplay(orderUnit);
                const unitPrice = dOrder.unit_price
                  ? parseFloat(dOrder.unit_price.toString())
                  : 0;

                return (
                  <tr
                    key={dOrder.id}
                    className={`hover:bg-gray-50 transition-colors duration-150 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-25"
                    }`}
                  >
                    {/* DO Number */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {dOrder.do_number}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {dOrder.do_name || "N/A"}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 leading-tight">
                          {dOrder.customer_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {dOrder.item_name}
                        </div>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {dOrder.driver_name}
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {dOrder.vehicle_info}
                      </div>
                    </td>

                    {/* SPBU Location */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700">
                        {dOrder.load_location || dOrder.spbg_location || "N/A"}
                      </div>
                    </td>

                     {/* Customer Locations */}
                     <td className="px-4 py-4">
                       <div className="space-y-1">
                         {/* Check if we have any locations at all */}
                         {(() => {
                           const hasPrimaryLocation = dOrder.unload_location && dOrder.unload_location.trim() !== '';
                           const hasAdditionalLocations = dOrder.additional_unload_locations && dOrder.additional_unload_locations.length > 0;
                           
                           if (!hasPrimaryLocation && !hasAdditionalLocations) {
                             return <div className="text-sm text-gray-400">N/A</div>;
                           }
                           
                           // If we only have primary location and no additional locations, show just the primary
                           if (hasPrimaryLocation && !hasAdditionalLocations) {
                             return (
                               <div className="text-sm text-gray-700">
                                 {dOrder.unload_location}
                               </div>
                             );
                           }
                           
                           // If we only have additional locations and no primary, show them without the "+" prefix
                           if (!hasPrimaryLocation && hasAdditionalLocations) {
                             const validLocations = dOrder.additional_unload_locations
                               ?.filter((location: any) => location && location.location && location.location.trim() !== '') || [];
                             
                             if (validLocations.length === 0) {
                               return <div className="text-sm text-gray-400">N/A</div>;
                             }
                             
                             return (
                               <div className="space-y-1">
                                 {validLocations.map((location, idx) => (
                                   <div key={idx} className="text-sm text-gray-700">
                                     {location.location}
                                   </div>
                                 ))}
                               </div>
                             );
                           }
                           
                           // If we have both primary and additional locations
                           const validAdditionalLocations = dOrder.additional_unload_locations
                             ?.filter((location: any) => location && location.location && location.location.trim() !== '') || [];
                           
                           if (validAdditionalLocations.length === 0) {
                             return (
                               <div className="text-sm text-gray-700">
                                 {dOrder.unload_location}
                               </div>
                             );
                           }
                           
                           return (
                             <div className="space-y-1">
                               {/* Primary customer location */}
                               <div className="text-sm text-gray-700">
                                 {dOrder.unload_location}
                               </div>
                               
                               {/* Additional customer locations - only show "+" if there are multiple */}
                               {validAdditionalLocations.map((location, idx) => (
                                 <div key={idx} className="text-xs text-gray-500">
                                   {validAdditionalLocations.length === 1 ? location.location : `+ ${location.location}`}
                                 </div>
                               ))}
                             </div>
                           );
                         })()}
                       </div>
                     </td>

                    {/* Quantity & Unit Column */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {/* Target quantity */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Target:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {parseFloat(
                              dOrder.minimal_load_quantity.toString()
                            ).toLocaleString("id-ID")}{" "}
                            {unitDisplay}
                          </span>
                        </div>

                        {/* Actual quantity */}
                        {dOrder.actual_load_quantity && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              Actual:
                            </span>
                            <span className="text-sm font-medium text-green-600">
                              {parseFloat(
                                dOrder.actual_load_quantity.toString()
                              ).toLocaleString("id-ID")}{" "}
                              {unitDisplay}
                            </span>
                          </div>
                        )}

                        {/* Unit badge and progress */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-1">
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {unitDisplay}
                            </span>
                            <span className="text-xs text-gray-400">
                              (Vol)
                            </span>
                          </div>

                          {/* Progress indicator */}
                          {dOrder.actual_load_quantity && (
                            <span
                              className={`text-xs font-medium ${
                                dOrder.actual_load_quantity >=
                                dOrder.minimal_load_quantity
                                  ? "text-green-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {Math.round(
                                (dOrder.actual_load_quantity /
                                  dOrder.minimal_load_quantity) *
                                  100
                              )}
                              %
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        {dOrder.actual_load_quantity && (
                          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                            <div
                              className={`h-1 rounded-full transition-all duration-300 ${
                                dOrder.actual_load_quantity >=
                                dOrder.minimal_load_quantity
                                  ? "bg-green-500"
                                  : "bg-orange-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  (dOrder.actual_load_quantity /
                                    dOrder.minimal_load_quantity) *
                                    100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          dOrder.status
                        )}`}
                      >
                        {dOrder.status_text}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-4 text-right">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Rp{" "}
                          {(
                            dOrder.financial_summary.minimal_total_amount || 0
                          ).toLocaleString("de-DE")}
                        </div>

                        {/* Actual amount if different */}
                        {dOrder.financial_summary.actual_total_amount &&
                          dOrder.financial_summary.actual_total_amount !==
                            dOrder.financial_summary.minimal_total_amount && (
                            <div className="text-xs text-green-600 mt-0.5">
                              Actual: Rp{" "}
                              {dOrder.financial_summary.actual_total_amount.toLocaleString(
                                "id-ID"
                              )}
                            </div>
                          )}

                        {/* Unit price info */}
                        {dOrder.unit_price && (
                          <div className="text-xs text-gray-500 mt-1">
                            @Rp {unitPrice.toLocaleString("de-DE")}/
                            {unitDisplay}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Document Column */}
                    <td className="w-12 px-2 py-4 text-center">
                      {((Array.isArray(dOrder.surat_jalan_photo_url) && dOrder.surat_jalan_photo_url.length > 0) ||
                        (Array.isArray(dOrder.nota_photo_url) && dOrder.nota_photo_url.length > 0)) ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {/* Surat Jalan Documents */}
                          {Array.isArray(dOrder.surat_jalan_photo_url) && dOrder.surat_jalan_photo_url.map((url, idx) => (
                            <a
                              key={`sj-${idx}`}
                              href={`${BACKEND_URL}/${url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-all duration-200"
                              title={`View Surat Jalan #${idx + 1}`}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </a>
                          ))}
                          {/* Nota Documents */}
                          {Array.isArray(dOrder.nota_photo_url) && dOrder.nota_photo_url.map((url, idx) => (
                            <a
                              key={`nota-${idx}`}
                              href={`${BACKEND_URL}/${url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-md transition-all duration-200"
                              title={`View Nota #${idx + 1}`}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center justify-center w-7 h-7 text-gray-300"
                          title="No document"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                        </div>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="w-16 px-2 py-4">
                      <div className="flex items-center justify-center space-x-1">
                        {/* View Details */}
                        <Link
                          to={`/delivery-orders/${dOrder.id}`}
                          className="inline-flex items-center justify-center w-7 h-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-all duration-200"
                          title="View Details"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>

                        {/* Quick Edit */}
                        {dOrder.status !== "completed" &&
                          dOrder.status !== "cancelled" && (
                            <button
                              onClick={() => {
                                navigate(`/delivery-orders/${dOrder.id}/edit`);
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-all duration-200"
                              title="Edit Delivery Order"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={12} // Updated to account for added SPBU Location and Customer Locations columns
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <svg
                      className="w-12 h-12 text-gray-300 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-lg font-medium">
                      No delivery orders found
                    </p>
                    <p className="text-sm">
                      Try adjusting your filters or search to see more results.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span>
                {' '}to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
                {' '}of{' '}
                <span className="font-medium">{totalItems}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page Numbers */}
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  if (endPage - startPage < maxVisiblePages - 1) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          i === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Unit Summary Stats */}
      {deliveryOrders.length > 0 && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Unit Distribution
          </h3>
          <div className="grid grid-cols-1 gap-4 text-sm">
            {(() => {
              // Since all DOs are kubik, show only kubik statistics
              const unit = "kubik";
              const unitOrders = deliveryOrders; // All orders are kubik
              const unitDisplay = getUnitDisplay(unit);

              return (
                <div key={unit} className="bg-gray-50 p-3 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{unitDisplay} Orders:</span>
                    <span className="text-blue-600 font-bold">
                      {unitOrders.length}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Total:{" "}
                    {unitOrders
                      .reduce(
                        (sum, order) =>
                          sum +
                          (parseFloat(String(order.actual_load_quantity)) ||
                            parseFloat(String(order.minimal_load_quantity))),
                        0
                      )
                      .toLocaleString("id-ID")}{" "}
                    {unitDisplay}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrdersPage;
