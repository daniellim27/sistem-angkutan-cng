// src/pages/InfrastructureManagement.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";

const IconEdit = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const IconDelete = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

interface InfrastructureItem {
  id: number;
  item_code: string;
  item_name: string;
  supplier: string;
  unit: string;
  current_quantity: number;
  min_quantity: number;
  average_unit_price: number;
  total_value: number;
  quantity_status: string;
  expired_date?: string;
  category?: { category_name: string };
  location?: { location_name: string };
  is_low_quantity?: boolean;
  is_expired?: boolean;
  is_expiring_soon?: boolean;
}

interface SearchFilters {
  searchTerm: string;
  categoryFilter: string;
  locationFilter: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
}

const InfrastructureManagementPage = () => {
  const [infrastructureItems, setInfrastructureItems] = useState<InfrastructureItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InfrastructureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: "",
    categoryFilter: "",
    locationFilter: "",
    statusFilter: "",
    startDate: "",
    endDate: "",
  });

  const [filterOptions, setFilterOptions] = useState({
    categories: [] as string[],
    locations: [] as string[],
    statuses: [] as string[],
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const navigate = useNavigate();

  const fetchInfrastructureItems = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      const response = await apiClient.get(`/infrastructure?${params.toString()}`);
      const responseData = response.data?.data || [];
      const paginationData = response.data?.pagination || {};

      setInfrastructureItems(responseData);
      setTotalPages(paginationData.totalPages || 0);
      setTotalItems(paginationData.totalItems || 0);
      setCurrentPage(paginationData.currentPage || 1);

      extractFilterOptions(responseData);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Gagal memuat data infrastruktur");
      setInfrastructureItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const extractFilterOptions = (items: InfrastructureItem[]) => {
    const categories = Array.from(new Set(items.map(item => item.category?.category_name).filter((name): name is string => Boolean(name))));
    const locations = Array.from(new Set(items.map(item => item.location?.location_name).filter((name): name is string => Boolean(name))));
    const statuses = Array.from(new Set(items.map(item => item.quantity_status)));

    setFilterOptions({
      categories,
      locations,
      statuses,
    });
  };

  useEffect(() => {
    fetchInfrastructureItems();
  }, [fetchInfrastructureItems]);

  useEffect(() => {
    let filtered = [...infrastructureItems];

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_name.toLowerCase().includes(searchLower) ||
          item.item_code?.toLowerCase().includes(searchLower) ||
          item.supplier?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.categoryFilter) {
      filtered = filtered.filter(
        (item) => item.category?.category_name === filters.categoryFilter
      );
    }

    if (filters.locationFilter) {
      filtered = filtered.filter(
        (item) => item.location?.location_name === filters.locationFilter
      );
    }

    if (filters.statusFilter) {
      filtered = filtered.filter(
        (item) => item.quantity_status === filters.statusFilter
      );
    }

    setFilteredItems(filtered);
  }, [infrastructureItems, filters]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus item infrastruktur ini?")) {
      return;
    }

    try {
      await apiClient.delete(`/infrastructure/${id}`);
      setInfrastructureItems(prev => prev.filter(item => item.id !== id));
      setFilteredItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Gagal menghapus item infrastruktur");
    }
  };

  const getStatusBadge = (status: string, isExpired?: boolean, isExpiringSoon?: boolean) => {
    if (isExpired) {
      return <span className="px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded-full">Expired</span>;
    }
    if (isExpiringSoon) {
      return <span className="px-2 py-1 text-xs font-semibold text-white bg-yellow-600 rounded-full">Expiring Soon</span>;
    }
    switch (status) {
      case "out_of_stock":
        return <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">Out of Stock</span>;
      case "low_quantity":
        return <span className="px-2 py-1 text-xs font-semibold text-white bg-yellow-500 rounded-full">Low Quantity</span>;
      case "adequate":
        return <span className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">Adequate</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded-full">{status}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Infrastructure Inventory</h1>
        <Link
          to="/infrastructure/create"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
        >
          + Add Infrastructure Item
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search items..."
              value={filters.searchTerm}
              onChange={(e) =>
                setFilters({ ...filters, searchTerm: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filters.categoryFilter}
              onChange={(e) =>
                setFilters({ ...filters, categoryFilter: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {filterOptions.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={filters.locationFilter}
              onChange={(e) =>
                setFilters({ ...filters, locationFilter: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Locations</option>
              {filterOptions.locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.statusFilter}
              onChange={(e) =>
                setFilters({ ...filters, statusFilter: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              {filterOptions.statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expired Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.item_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.item_code || "No Code"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.supplier || "No Supplier"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.category?.category_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.location?.location_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.current_quantity} {item.unit}
                    </div>
                    <div className="text-sm text-gray-500">
                      Min: {item.min_quantity} {item.unit}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(item.average_unit_price)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Total: {formatCurrency(item.total_value)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(item.expired_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(item.quantity_status, item.is_expired, item.is_expiring_soon)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      to={`/infrastructure/edit/${item.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <IconEdit />
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <IconDelete />
                    </button>
                    <Link
                      to={`/infrastructure/${item.id}/history`}
                      className="text-green-600 hover:text-green-900 text-sm"
                    >
                      History
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchInfrastructureItems(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchInfrastructureItems(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * 10 + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, totalItems)}
                  </span>{" "}
                  of <span className="font-medium">{totalItems}</span> results
                </p>
              </div>
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => fetchInfrastructureItems(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchInfrastructureItems(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfrastructureManagementPage;
