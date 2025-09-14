import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import AssignDriverModal from '../components/AssignDriverModal';

// Interface for Tire Stats
interface TireStats {
  total_installed: number;
  total_expected: number;
  needs_attention: number;
  good_condition: number;
}

// Interface for Vehicle
interface Vehicle {
  id: number;
  license_plate: string;
  type: string;
  capacity: string;
  tire_count: number;
  spare_tire_count: number;
  driver_id: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_status: string | null;
  stnk_expired_date: string;
  tax_due_date: string;
  kir_expiry_date: string;
  status: 'available' | 'in_use' | 'maintenance';
  tire_stats: TireStats;
  last_service_date: string;
  next_service_due: string;
  // GPS Tracking fields
  device_id: string | null;
  has_gps_tracking: boolean;
  gps_last_update: string | null;
  tracked_plate: string | null;
}

// Interface for Service History
interface ServiceRecord {
  id: number;
  service_date: string;
  description: string;
  total_cost: number;
  status: 'completed' | 'cancelled';
  service_number: string;
  vehicle_id: number;
  vehicle_license_plate: string;
}

// ServiceHistoryTab Component
const ServiceHistoryTab: React.FC = () => {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch all services
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/services');
      console.log('Services API Response:', response.data);
      
      // Handle different response formats
      let servicesData = [];
      if (response.data.success && response.data.data) {
        servicesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        servicesData = response.data;
      }
      
      setServices(servicesData);
    } catch (err) {
      setError('Failed to fetch service history. Please try again later.');
      console.error('Fetch services error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Filter services
  const filteredServices = useMemo(() => {
    let filtered = services;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => service.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(service =>
        service.vehicle_license_plate?.toLowerCase().includes(searchLower) ||
        service.description.toLowerCase().includes(searchLower) ||
        service.service_number.toLowerCase().includes(searchLower)
      );
    }

    return filtered.sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime());
  }, [services, statusFilter, searchTerm]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      services: filteredServices.slice(startIndex, endIndex),
      totalItems: filteredServices.length,
      totalPages: Math.ceil(filteredServices.length / itemsPerPage),
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, filteredServices.length)
    };
  }, [filteredServices, currentPage]);

  // Event handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('id-ID');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // Pagination component
  const renderPagination = () => {
    const { totalPages, totalItems } = paginatedData;
    
    if (totalPages <= 1) return null;

    const pages = [];
    const showPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    let endPage = Math.min(totalPages, startPage + showPages - 1);

    if (endPage - startPage < showPages - 1) {
      startPage = Math.max(1, endPage - showPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg shadow">
        <div className="text-sm text-gray-600">
          Showing {paginatedData.startIndex} to {paginatedData.endIndex} of {totalItems} services
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              >
                1
              </button>
              {startPage > 2 && (
                <span className="px-3 py-2 text-sm font-medium text-gray-500">...</span>
              )}
            </>
          )}
          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-2 text-sm font-medium border ${
                currentPage === page
                  ? 'text-white bg-blue-600 border-blue-600'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className="px-3 py-2 text-sm font-medium text-gray-500">...</span>
              )}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center p-8">Loading service history...</div>;
  if (error) return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>;

  return (
    <>
      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Services
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by vehicle license plate, service description, or service number..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          {filteredServices.length === services.length 
            ? `Showing all ${services.length} service records`
            : `Found ${filteredServices.length} of ${services.length} service records`
          }
          {searchTerm && ` matching "${searchTerm}"`}
          {statusFilter !== 'all' && ` with status "${statusFilter}"`}
        </div>
      </div>

      {/* Service History Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Service No.
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Description
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.services.length > 0 ? paginatedData.services.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm font-medium">
                  {service.service_number}
                </td>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                  <div className="font-medium text-gray-900">{service.vehicle_license_plate}</div>
                </td>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                  {formatDate(service.service_date)}
                </td>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm max-w-sm">
                  <div className="truncate" title={service.description}>
                    {service.description}
                  </div>
                </td>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm text-right font-medium">
                  Rp {formatCurrency(service.total_cost)}
                </td>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    service.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {service.status}
                  </span>
                </td>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm text-center">
                  <Link 
                    to={`/services/${service.id}`} 
                    className="text-indigo-600 hover:text-indigo-900 font-semibold"
                  >
                    View Detail
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">
                  {filteredServices.length === 0 && services.length > 0
                    ? 'No service records found matching your search criteria'
                    : 'No service records available.'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </>
  );
};

const VehiclesPage = () => {
  // Tab state
  const [selectedTab, setSelectedTab] = useState<'fleet' | 'service-history'>('fleet');
  
  // Data states
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]); // All vehicles from API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPlateNumber, setSelectedPlateNumber] = useState('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch all vehicles from API
  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/vehicles');
      console.log('API Response:', response.data);
      
      // Handle different response formats
      let vehiclesData = [];
      if (response.data.success && response.data.data) {
        vehiclesData = response.data.data;
      } else if (response.data.records) {
        vehiclesData = response.data.records;
      } else if (Array.isArray(response.data)) {
        vehiclesData = response.data;
      }
      
      console.log('Vehicles loaded:', vehiclesData.length);
      setAllVehicles(vehiclesData);
    } catch (err) {
      setError('Failed to fetch vehicles. Please try again later.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    
    // Set up periodic refresh every 30 seconds to sync with mobile app updates
    const interval = setInterval(() => {
      fetchVehicles();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  // Client-side filtering and search
  const filteredVehicles = useMemo(() => {
    let filtered = allVehicles;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.status === statusFilter);
    }

    // Apply plate number filter
    if (selectedPlateNumber !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.license_plate === selectedPlateNumber);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(vehicle =>
        vehicle.license_plate.toLowerCase().includes(searchLower) ||
        vehicle.type.toLowerCase().includes(searchLower) ||
        (vehicle.capacity && vehicle.capacity.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [allVehicles, statusFilter, selectedPlateNumber, searchTerm]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      vehicles: filteredVehicles.slice(startIndex, endIndex),
      totalItems: filteredVehicles.length,
      totalPages: Math.ceil(filteredVehicles.length / itemsPerPage),
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, filteredVehicles.length)
    };
  }, [filteredVehicles, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedPlateNumber]);

  // Event handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handlePlateNumberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPlateNumber(e.target.value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await apiClient.delete(`/vehicles/${id}`);
        fetchVehicles(); // Refresh data
      } catch (err) {
        alert('Failed to delete vehicle.');
      }
    }
  };
  
  const handleOpenModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedVehicle(null);
    setIsModalOpen(false);
  };

  const handleAssignmentSuccess = () => {
    fetchVehicles(); // Refresh data
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getDateColor = (dateString: string) => {
    if (!dateString) return 'text-gray-500';
    const date = new Date(dateString);
    const today = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(today.getMonth() + 3);

    if (date < today) return 'text-red-600 font-bold';
    if (date < threeMonths) return 'text-yellow-600';
    return 'text-gray-800';
  };



  // Pagination component
  const renderPagination = () => {
    const { totalPages, totalItems } = paginatedData;
    
    if (totalPages <= 1) return null;

    const pages = [];
    const showPages = 5; // Show max 5 page numbers
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    let endPage = Math.min(totalPages, startPage + showPages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage < showPages - 1) {
      startPage = Math.max(1, endPage - showPages + 1);
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg shadow">
        {/* Page info */}
        <div className="text-sm text-gray-600">
          Showing {paginatedData.startIndex} to {paginatedData.endIndex} of {totalItems} vehicles
        </div>

        {/* Pagination controls */}
        <div className="flex items-center space-x-1">
          {/* Previous button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {/* First page + ellipsis */}
          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              >
                1
              </button>
              {startPage > 2 && (
                <span className="px-3 py-2 text-sm font-medium text-gray-500">...</span>
              )}
            </>
          )}

          {/* Page numbers */}
          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-2 text-sm font-medium border ${
                currentPage === page
                  ? 'text-white bg-blue-600 border-blue-600'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}

          {/* Last page + ellipsis */}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className="px-3 py-2 text-sm font-medium text-gray-500">...</span>
              )}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          {/* Next button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center p-8">Loading vehicles...</div>;
  if (error) return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Fleet Management</h1>
        <div className="flex space-x-2">
          {selectedTab === 'fleet' ? (
            <Link to="/vehicles/create">
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-md transition duration-200">
                + Add Vehicle
              </button>
            </Link>
          ) : (
            <Link to="/services/create">
              <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-md transition duration-200">
                + Add Service
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setSelectedTab('fleet')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                selectedTab === 'fleet'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fleet Overview
            </button>
            <button
              onClick={() => setSelectedTab('service-history')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                selectedTab === 'service-history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Service History
            </button>
          </nav>
        </div>

        {/* Tab Content - Descriptions */}
        <div className="p-4">
          {selectedTab === 'fleet' && (
            <div className="text-sm text-gray-600">
              Manage your vehicle fleet, assign drivers, and monitor vehicle status and maintenance schedules.
            </div>
          )}
          {selectedTab === 'service-history' && (
            <div className="text-sm text-gray-600">
              View comprehensive service history for all vehicles. Track maintenance records, costs, and service schedules.
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'fleet' && (
        <>
          {/* Search and Filter */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-1 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Vehicles
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search vehicles by license plate, type, or capacity..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Plate Number Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Vehicle
                </label>
                <select
                  value={selectedPlateNumber}
                  onChange={handlePlateNumberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Vehicles</option>
                  {allVehicles
                    .sort((a, b) => a.license_plate.localeCompare(b.license_plate))
                    .map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.license_plate}>
                        {vehicle.license_plate}
                      </option>
                    ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="mt-3 text-sm text-gray-600">
              {filteredVehicles.length === allVehicles.length 
                ? `Showing all ${allVehicles.length} vehicles`
                : `Found ${filteredVehicles.length} of ${allVehicles.length} vehicles`
              }
              {searchTerm && ` matching "${searchTerm}"`}
              {selectedPlateNumber !== 'all' && ` for vehicle "${selectedPlateNumber}"`}
              {statusFilter !== 'all' && ` with status "${statusFilter}"`}
            </div>
          </div>

          {/* Vehicle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedData.vehicles.length > 0 ? (
              paginatedData.vehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col transition-transform transform hover:scale-105">
                  <div className="p-5 flex-grow">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-bold text-gray-800">{vehicle.license_plate}</h2>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        vehicle.status === 'available' ? 'bg-green-100 text-green-800' : 
                        vehicle.status === 'in_use' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {vehicle.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{vehicle.type} - {vehicle.capacity ? parseInt(vehicle.capacity).toLocaleString('id-ID') : '-'} kg</p>

                    <hr className="my-4"/>

                    <div className="mb-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-gray-700 mb-2">Driver Information</h3>
                        <button 
                          onClick={() => handleOpenModal(vehicle)}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded"
                        >
                          Assign / Change
                        </button>
                      </div>
                      {vehicle.driver_name ? (
                        <div className="flex items-center space-x-3 mt-2">
                          <div className="flex-shrink-0">
                            <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${vehicle.driver_name}&background=random`} alt="" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{vehicle.driver_name}</p>
                            <p className="text-xs text-gray-500">{vehicle.driver_phone}</p>
                          </div>
                          <span className={`ml-auto inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            vehicle.driver_status === 'available' ? 'bg-green-100 text-green-800' : 
                            vehicle.driver_status === 'busy' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {vehicle.driver_status}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic mt-2">No driver assigned</p>
                      )}
                    </div>

                    <div className="mt-4">
                      <h3 className="font-semibold text-gray-700 mb-2">Service & Documents</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Service:</span>
                          <span className="font-medium text-gray-800">{formatDate(vehicle.last_service_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Next Service Due:</span>
                          <span className={`font-medium ${getDateColor(vehicle.next_service_due)}`}>{formatDate(vehicle.next_service_due)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">STNK Expired:</span>
                          <span className={`font-medium ${getDateColor(vehicle.stnk_expired_date)}`}>{formatDate(vehicle.stnk_expired_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax Due:</span>
                          <span className={`font-medium ${getDateColor(vehicle.tax_due_date)}`}>{formatDate(vehicle.tax_due_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">KIR Expired:</span>
                          <span className={`font-medium ${getDateColor(vehicle.kir_expiry_date)}`}>{formatDate(vehicle.kir_expiry_date)}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Card Footer Actions */}
                  <div className="bg-gray-50 px-5 py-3 flex justify-end items-center space-x-3 flex-wrap">
                    <Link 
                      to={`/services/create?vehicleId=${vehicle.id}`} 
                      className="text-sm text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Add Service
                    </Link>
                    <Link 
                      to={`/vehicles/tires?vehicleId=${vehicle.id}`} 
                      className="text-sm text-purple-600 hover:text-purple-900 font-medium" 
                      title="Manage Tires"
                    >
                      Tires
                    </Link>
                    <Link 
                      to={`/vehicles/edit/${vehicle.id}`} 
                      className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(vehicle.id)} className="text-sm text-red-600 hover:text-red-900 font-medium">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-10 text-gray-500">
                {filteredVehicles.length === 0 && allVehicles.length > 0
                  ? 'No vehicles found matching your search criteria'
                  : 'No vehicles available.'
                }
              </div>
            )}
          </div>

          {/* Pagination */}
          {renderPagination()}
        </>
      )}

      {selectedTab === 'service-history' && (
        <ServiceHistoryTab />
      )}

      {/* Assign Driver Modal */}
      <AssignDriverModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        vehicle={selectedVehicle}
        onSuccess={() => {
          handleCloseModal();
          handleAssignmentSuccess();
        }}
      />
    </div>
  );
};

export default VehiclesPage;
