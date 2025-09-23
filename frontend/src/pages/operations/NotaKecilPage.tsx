// src/pages/operations/NotaKecilPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { authClient } from '../../api/axiosConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTachometerAlt, 
  faThermometerHalf, 
  faPlay, 
  faSquare,
  faEye,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

interface NotaKecil {
  id: number;
  customer_name: string;
  customer_address?: string;
  customer_location_index: number;
  stan_awal: string;
  stan_akhir: string;
  tekanan_operasi: string;
  temperatur_operasi: string;
  Vt: string;
  k: string;
  V: string;
  created_at: string;
  deliveryOrder: {
    id: number;
    do_number: string;
  };
  driver_notes?: string;
  // Local storage photos (legacy)
  pressure_bar_photos?: string[];
  temperature_photos?: string[];
  stan_awal_photos?: string[];
  stan_akhir_photos?: string[];
  // Google Drive photos (new)
  pressure_bar_photos_urls?: Array<{
    url: string;
    filename: string;
    fileId: string;
    uploadedAt: string;
  }>;
  temperature_photos_urls?: Array<{
    url: string;
    filename: string;
    fileId: string;
    uploadedAt: string;
  }>;
  stan_awal_photos_urls?: Array<{
    url: string;
    filename: string;
    fileId: string;
    uploadedAt: string;
  }>;
  stan_akhir_photos_urls?: Array<{
    url: string;
    filename: string;
    fileId: string;
    uploadedAt: string;
  }>;
  // New optimized photo format
  photos?: {
    pressure_bar: string[];
    temperature: string[];
    stan_awal: string[];
    stan_akhir: string[];
  };
}

const NotaKecilPage: React.FC = () => {
  const navigate = useNavigate();
  const [notaKecils, setNotaKecils] = useState<NotaKecil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotaKecils, setSelectedNotaKecils] = useState<Set<number>>(new Set());
  const [calculatingNotaBesar, setCalculatingNotaBesar] = useState(false);
  const [gasPricePerM3, setGasPricePerM3] = useState<number>(15000);
  const [filterDO, setFilterDO] = useState<string>('');
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [availableDOs, setAvailableDOs] = useState<{id: number, do_number: string}[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Photo modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoModalTitle, setPhotoModalTitle] = useState('');

  useEffect(() => {
    fetchAllNotaKecils();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDO, filterCustomer, filterLocation]);

  // Reset customer and location filters when DO changes
  useEffect(() => {
    setFilterCustomer('');
    setFilterLocation('');
  }, [filterDO]);

  const fetchAllNotaKecils = async () => {
    try {
      setLoading(true);
      const response = await authClient.get('/web/nota-kecils');
      const notaKecilsData = response.data.data || [];
      setNotaKecils(notaKecilsData);
      
      // Extract unique DOs from the nota kecils with creation date
      const doMap = new Map<number, {id: number, do_number: string, created_at: string}>();
      notaKecilsData.forEach((nota: NotaKecil) => {
        if (!doMap.has(nota.deliveryOrder.id)) {
          doMap.set(nota.deliveryOrder.id, {
            id: nota.deliveryOrder.id,
            do_number: nota.deliveryOrder.do_number,
            created_at: nota.created_at
          });
        }
      });
      const uniqueDOs: {id: number, do_number: string, created_at: string}[] = Array.from(doMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setAvailableDOs(uniqueDOs);
      
      // Auto-select the newest delivery order if none is selected
      if (uniqueDOs.length > 0 && !filterDO) {
        setFilterDO(uniqueDOs[0].id.toString());
      }
      
      console.log('Fetched all nota kecils:', response.data);
      console.log('Available DOs:', uniqueDOs);
    } catch (error) {
      console.error('Error fetching nota kecils:', error);
      setError('Failed to fetch nota kecils');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get Google Drive thumbnail URL
  const getThumbnailUrl = (fileId: string) => {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w100-h100`;
  };

  // Helper function to get real photo URLs (filter out fake example URLs)
  const getRealPhotoUrls = (notaKecil: NotaKecil, photoType: 'pressure_bar' | 'temperature' | 'stan_awal' | 'stan_akhir'): string[] => {
    let photos: string[] = [];

    // Try new optimized format first
    if (notaKecil.photos && notaKecil.photos[photoType]) {
      photos = notaKecil.photos[photoType];
    } else {
      // Fallback to old formats
      const gdriveField = `${photoType}_photos_urls` as keyof NotaKecil;
      const localField = `${photoType}_photos` as keyof NotaKecil;
      
      const gdriveUrls = notaKecil[gdriveField] as Array<{url: string, fileId: string, filename: string}> | undefined;
      const localUrls = notaKecil[localField] as string[] | undefined;
      
      if (gdriveUrls && gdriveUrls.length > 0) {
        photos = gdriveUrls.map(item => item.url);
      } else if (localUrls && localUrls.length > 0) {
        photos = localUrls;
      }
    }

    // Filter out fake example URLs and return only real photos
    return photos.filter(url => 
      url && 
      !url.includes('example.com') && 
      !url.includes('placeholder') &&
      (url.includes('cloudinary.com') || url.includes('res.cloudinary.com') || url.includes('googleapis.com'))
    );
  };

  // Helper function to get image URLs with metadata (for thumbnails)
  const getImageUrls = (notaKecil: NotaKecil, photoType: 'pressure_bar' | 'temperature' | 'stan_awal' | 'stan_akhir') => {
    const gdriveField = `${photoType}_photos_urls` as keyof NotaKecil;
    const localField = `${photoType}_photos` as keyof NotaKecil;
    
    const gdriveUrls = notaKecil[gdriveField] as Array<{url: string, fileId: string, filename: string}> | undefined;
    const localUrls = notaKecil[localField] as string[] | undefined;
    
    // Return Google Drive URLs if available, otherwise local URLs
    if (gdriveUrls && gdriveUrls.length > 0) {
      return gdriveUrls.map(item => ({
        url: item.url,
        thumbnail: getThumbnailUrl(item.fileId),
        filename: item.filename || 'Unknown',
        isGDrive: true
      }));
    } else if (localUrls && localUrls.length > 0) {
      return localUrls.map(url => ({
        url: url,
        thumbnail: url,
        filename: url.split('/').pop() || 'Unknown',
        isGDrive: false
      }));
    }
    
    return [];
  };

  // Function to view photos in modal
  const viewPhotos = (notaKecil: NotaKecil, photoType: 'pressure_bar' | 'temperature' | 'stan_awal' | 'stan_akhir') => {
    const realPhotos = getRealPhotoUrls(notaKecil, photoType);
    let title = '';

    switch (photoType) {
      case 'pressure_bar':
        title = 'Pressure Bar Photos';
        break;
      case 'temperature':
        title = 'Temperature Photos';
        break;
      case 'stan_awal':
        title = 'Stan Awal Photos';
        break;
      case 'stan_akhir':
        title = 'Stan Akhir Photos';
        break;
    }

    if (realPhotos.length > 0) {
      setSelectedPhotos(realPhotos);
      setPhotoModalTitle(title);
      setShowPhotoModal(true);
    } else {
      alert(`No real ${photoType} photos available for this nota kecil.`);
    }
  };

  // Helper function to get icon for photo type
  const getPhotoIcon = (photoType: 'pressure_bar' | 'temperature' | 'stan_awal' | 'stan_akhir') => {
    switch (photoType) {
      case 'pressure_bar':
        return faTachometerAlt;
      case 'temperature':
        return faThermometerHalf;
      case 'stan_awal':
        return faPlay;
      case 'stan_akhir':
        return faSquare;
      default:
        return faEye;
    }
  };

  // Helper function to render photo button with icon
  const renderPhotoButton = (notaKecil: NotaKecil, photoType: 'pressure_bar' | 'temperature' | 'stan_awal' | 'stan_akhir') => {
    const realPhotos = getRealPhotoUrls(notaKecil, photoType);
    const hasRealPhotos = realPhotos.length > 0;
    
    return (
      <button
        onClick={() => viewPhotos(notaKecil, photoType)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          hasRealPhotos 
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
        }`}
        disabled={!hasRealPhotos}
        title={hasRealPhotos ? `View ${realPhotos.length} photo(s)` : 'No real photos available'}
      >
        <FontAwesomeIcon 
          icon={getPhotoIcon(photoType)} 
          className="w-3 h-3" 
        />
        <span>{hasRealPhotos ? realPhotos.length : '0'}</span>
      </button>
    );
  };

  const handleNotaKecilCheckboxChange = (notaKecilId: number, checked: boolean) => {
    setSelectedNotaKecils(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(notaKecilId);
      } else {
        newSet.delete(notaKecilId);
      }
      return newSet;
    });
  };

  const handleStartSelection = () => {
    setIsSelectionMode(true);
    setSelectedNotaKecils(new Set()); // Clear any previous selections
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedNotaKecils(new Set()); // Clear selections
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedNotaKecils.map(nota => nota.id);
      setSelectedNotaKecils(prev => {
        const newSet = new Set(prev);
        allIds.forEach(id => newSet.add(id));
        return newSet;
      });
    } else {
      const allIds = paginatedNotaKecils.map(nota => nota.id);
      setSelectedNotaKecils(prev => {
        const newSet = new Set(prev);
        allIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleCreateNotaBesar = async () => {
    if (selectedNotaKecils.size === 0) {
      alert('Please select at least one nota kecil');
      return;
    }

    try {
      setCalculatingNotaBesar(true);
      
      // Get the first selected nota kecil's delivery order ID
      const firstSelectedNota = notaKecils.find(nota => selectedNotaKecils.has(nota.id));
      if (!firstSelectedNota) {
        alert('Invalid selection');
        return;
      }

      const response = await authClient.post(`/delivery-orders/${firstSelectedNota.deliveryOrder.id}/nota-besar/calculate`, {
        notaKecilIds: Array.from(selectedNotaKecils),
        gasPricePerM3: gasPricePerM3 // Keep the existing gas price state for nota besar creation
      });

      console.log('Nota besar created:', response.data);
      
      // Clear selection
      setSelectedNotaKecils(new Set());
      
      alert('Nota besar created successfully!');
      
      // Navigate to nota besar page
      navigate('/operations/nota-besar');
    } catch (error: any) {
      console.error('Error creating nota besar:', error);
      alert('Failed to create nota besar: ' + (error.response?.data?.message || error.message));
    } finally {
      setCalculatingNotaBesar(false);
    }
  };

  // Get customers for the selected DO
  const getCustomersForSelectedDO = () => {
    if (!filterDO) return [];
    
    const customersInDO = notaKecils
      .filter(nota => nota.deliveryOrder.id.toString() === filterDO)
      .map(nota => ({
        customer_name: nota.customer_name,
        customer_address: nota.customer_address || ''
      }));
    
    // Remove duplicates and sort
    const uniqueCustomers = Array.from(
      new Map(customersInDO.map(customer => [customer.customer_name, customer])).values()
    ).sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    
    return uniqueCustomers;
  };

  // Get locations for the selected DO
  const getLocationsForSelectedDO = () => {
    if (!filterDO) return [];
    
    const locationsInDO = notaKecils
      .filter(nota => nota.deliveryOrder.id.toString() === filterDO)
      .map(nota => nota.customer_address || '')
      .filter(address => address.trim() !== '');
    
    // Remove duplicates and sort
    const uniqueLocations = Array.from(new Set(locationsInDO))
      .sort((a, b) => a.localeCompare(b));
    
    return uniqueLocations;
  };

  // Filter nota kecils based on search criteria
  const filteredNotaKecils = notaKecils.filter(nota => {
    const matchesDO = !filterDO || nota.deliveryOrder.id.toString() === filterDO;
    const matchesCustomer = !filterCustomer || nota.customer_name === filterCustomer;
    const matchesLocation = !filterLocation || (nota.customer_address || '') === filterLocation;
    return matchesDO && matchesCustomer && matchesLocation;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredNotaKecils.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotaKecils = filteredNotaKecils.slice(startIndex, endIndex);

  const isAllSelected = paginatedNotaKecils.length > 0 && selectedNotaKecils.size === paginatedNotaKecils.length;
  const isIndeterminate = selectedNotaKecils.size > 0 && selectedNotaKecils.size < paginatedNotaKecils.length;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading nota kecils...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchAllNotaKecils}
          className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Nota Kecil Management</h1>
          <p className="text-gray-600">Manage all nota kecils across delivery orders</p>
        </div>
        {/* <button
          onClick={() => navigate('/delivery-orders')}
          className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          ← Back to Delivery Orders
        </button> */}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Delivery Order</label>
            <select
              value={filterDO}
              onChange={(e) => setFilterDO(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableDOs.map(deliveryOrder => (
                <option key={deliveryOrder.id} value={deliveryOrder.id.toString()}>
                  {deliveryOrder.do_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Customer</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!filterDO}
            >
              <option value="">All Customers</option>
              {getCustomersForSelectedDO().map((customer, index) => (
                <option key={index} value={customer.customer_name}>
                  {customer.customer_name} {customer.customer_address ? `- ${customer.customer_address}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!filterDO}
            >
              <option value="">All Locations</option>
              {getLocationsForSelectedDO().map((location, index) => (
                <option key={index} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selection Mode Interface */}
      {isSelectionMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                {selectedNotaKecils.size > 0 
                  ? `${selectedNotaKecils.size} nota kecil${selectedNotaKecils.size > 1 ? 's' : ''} selected`
                  : 'Select nota kecils to create nota besar'
                }
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {selectedNotaKecils.size > 0 
                  ? 'Click "Create Nota Besar" to proceed with billing calculation'
                  : 'Use checkboxes to select the nota kecils you want to include (across all pages)'
                }
              </p>
            </div>
            <div className="flex space-x-2">
              {selectedNotaKecils.size > 0 && (
                <button
                  onClick={handleCreateNotaBesar}
                  disabled={calculatingNotaBesar}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
                >
                  {calculatingNotaBesar ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Create Nota Besar
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleCancelSelection}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* No DO Selected Message */}
      {!filterDO && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-yellow-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Select a Delivery Order</h3>
          <p className="text-yellow-700">
            Please select a delivery order from the dropdown above to view and manage nota kecils.
          </p>
        </div>
      )}

      {/* Nota Kecils Table */}
      {filterDO && paginatedNotaKecils.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          {/* Table Header with Create Button */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Nota Kecils</h3>
              {filterDO && (
                <p className="text-sm text-gray-600 mt-1">
                  Delivery Order: {availableDOs.find(deliveryOrder => deliveryOrder.id.toString() === filterDO)?.do_number}
                </p>
              )}
            </div>
            {!isSelectionMode && (
              <button
                onClick={handleStartSelection}
                disabled={!filterDO}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center ${
                  filterDO 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Create Nota Besar
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isSelectionMode && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                   <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                     Stand Meter
                   </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tekanan (Bar)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Suhu (°C)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faktor Koreksi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pemakaian (m³)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Images
                  </th>
                </tr>
                <tr>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    <div className="grid grid-cols-3 gap-3 min-w-[180px]">
                      <span className="min-w-[50px]">Awal</span>
                      <span className="min-w-[50px]">Akhir</span>
                      <span className="min-w-[60px]">Selisih</span>
                    </div>
                  </th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedNotaKecils.map((notaKecil, index) => {
                  const createdDate = new Date(notaKecil.created_at);
                  const time = createdDate.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  });
                  const date = createdDate.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric'
                  });
                  
                  // Calculate Selisih (difference between stan_akhir and stan_awal)
                  const stanAwal = parseFloat(notaKecil.stan_awal || '0');
                  const stanAkhir = parseFloat(notaKecil.stan_akhir || '0');
                  const selisih = stanAkhir - stanAwal;
                  const isSelected = selectedNotaKecils.has(notaKecil.id);
                  
                  return (
                    <tr 
                      key={notaKecil.id || index}
                      className={`transition-colors duration-200 ${
                        isSelected 
                          ? 'bg-blue-200' 
                          : 'hover:bg-blue-50'
                      }`}
                    >
                      {isSelectionMode && (
                        <td 
                          className="px-4 py-4 whitespace-nowrap"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleNotaKecilCheckboxChange(notaKecil.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {notaKecil.deliveryOrder.do_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{notaKecil.customer_name}</div>
                          <div className="text-xs text-gray-500">{notaKecil.customer_address}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[200px]">
                        <div className="grid grid-cols-3 gap-3 min-w-[180px]">
                          <span className="text-right min-w-[50px]">{stanAwal.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</span>
                          <span className="text-right min-w-[50px]">{stanAkhir.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</span>
                          <span className="text-right font-semibold text-blue-600 min-w-[60px]">{selisih.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {notaKecil.tekanan_operasi ? parseFloat(notaKecil.tekanan_operasi).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {notaKecil.temperatur_operasi ? parseFloat(notaKecil.temperatur_operasi).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {notaKecil.k ? parseFloat(notaKecil.k).toFixed(6) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                        {notaKecil.V ? parseFloat(notaKecil.V).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16">Pressure:</span>
                            {renderPhotoButton(notaKecil, 'pressure_bar')}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16">Temp:</span>
                            {renderPhotoButton(notaKecil, 'temperature')}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16">Stan Awal:</span>
                            {renderPhotoButton(notaKecil, 'stan_awal')}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-16">Stan Akhir:</span>
                            {renderPhotoButton(notaKecil, 'stan_akhir')}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {selectedNotaKecils.size > 0 && (
                      <span className="text-blue-600">
                        {selectedNotaKecils.size} selected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" colSpan={4}>
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    <div className="grid grid-cols-3 gap-2">
                      <span></span>
                      <span></span>
                      <span className="text-right text-blue-600">
                        {filteredNotaKecils.reduce((sum, nota) => {
                          const stanAwal = parseFloat(nota.stan_awal || '0');
                          const stanAkhir = parseFloat(nota.stan_akhir || '0');
                          return sum + (stanAkhir - stanAwal);
                        }, 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">
                    {filteredNotaKecils.reduce((sum, nota) => {
                      return sum + parseFloat(nota.V || '0');
                    }, 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    -
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">{startIndex + 1}</span>
                      {' '}to{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredNotaKecils.length)}</span>
                      {' '}of{' '}
                      <span className="font-medium">{filteredNotaKecils.length}</span>
                      {' '}results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current page
                        const shouldShow = page === 1 || page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1);
                        
                        if (!shouldShow) {
                          // Show ellipsis for gaps
                          if (page === 2 && currentPage > 4) {
                            return (
                              <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            );
                          }
                          if (page === totalPages - 1 && currentPage < totalPages - 3) {
                            return (
                              <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            );
                          }
                          return null;
                        }
                        
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      ) : filterDO ? (
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg">No nota kecils found for this delivery order</p>
          <p className="text-gray-400 text-sm mt-2">
            {filterCustomer ? 'Try adjusting your customer filter' : 'Nota kecils will appear here once drivers upload them for this delivery order'}
          </p>
        </div>
      ) : null}

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{photoModalTitle}</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPhotos.map((photoUrl, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photoUrl}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => window.open(photoUrl, '_blank')}
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
              {selectedPhotos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No photos available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotaKecilPage;
