// src/pages/operations/components/NotaKecilTab.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { authClient } from '../../../api/axiosConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTachometerAlt, 
  faThermometerHalf, 
  faPlay, 
  faSquare,
  faEye,
  faTimes,
  faChevronDown,
  faChevronRight,
  faTruck,
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

interface NotaKecil {
  id: number;
  customer_name: string;
  customer_address?: string;
  customer_location_index: number;
  ocr_processing_status?: string;
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
  pressure_bar_photos?: string[];
  temperature_photos?: string[];
  stan_awal_photos?: string[];
  stan_akhir_photos?: string[];
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
  photos?: {
    pressure_bar: string[];
    temperature: string[];
    stan_awal: string[];
    stan_akhir: string[];
  };
}

interface DeliveryOrderGroup {
  id: number;
  do_number: string;
  customers: CustomerGroup[];
  totalV: number;
  notaCount: number;
}

interface CustomerGroup {
  customer_name: string;
  customer_location_index: number;
  notaKecils: NotaKecil[];
  totalV: number;
}

interface Customer {
  id: number;
  customer_name: string;
  location: string;
  display_name: string;
}

const NotaKecilTab: React.FC = () => {
  const navigate = useNavigate();
  const [notaKecils, setNotaKecils] = useState<NotaKecil[]>([]);
  const [deliveryOrderGroups, setDeliveryOrderGroups] = useState<DeliveryOrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotaKecils, setSelectedNotaKecils] = useState<Set<number>>(new Set());
  const [calculatingNotaBesar, setCalculatingNotaBesar] = useState(false);
  const [gasPricePerM3, setGasPricePerM3] = useState<number>(15000);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Expand/collapse states
  const [expandedDOs, setExpandedDOs] = useState<Set<number>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  
  // Photo modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoModalTitle, setPhotoModalTitle] = useState('');

  useEffect(() => {
    fetchAllNotaKecils();
    fetchCustomers();
  }, []);

  const fetchAllNotaKecils = async () => {
    try {
      setLoading(true);
      const response = await authClient.get('/web/nota-kecils');
      const notaKecilsData = response.data.data || [];
      setNotaKecils(notaKecilsData);
      
      // Group by DO and Customer
      const grouped = groupNotaKecilsByDOAndCustomer(notaKecilsData);
      setDeliveryOrderGroups(grouped);
      
      // Keep all DOs closed by default
      setExpandedDOs(new Set());
      
      console.log('Fetched and grouped nota kecils:', grouped);
    } catch (error) {
      console.error('Error fetching nota kecils:', error);
      setError('Failed to fetch nota kecils');
    } finally {
      setLoading(false);
    }
  };

  const groupNotaKecilsByDOAndCustomer = (notaKecilsData: NotaKecil[]): DeliveryOrderGroup[] => {
    const doMap = new Map<number, DeliveryOrderGroup>();

    notaKecilsData.forEach((nota) => {
      const doId = nota.deliveryOrder.id;
      const doNumber = nota.deliveryOrder.do_number;
      
      if (!doMap.has(doId)) {
        doMap.set(doId, {
          id: doId,
          do_number: doNumber,
          customers: [],
          totalV: 0,
          notaCount: 0,
        });
      }

      const doGroup = doMap.get(doId)!;
      
      // Find or create customer group
      const customerKey = `${nota.customer_name}_${nota.customer_location_index}`;
      let customerGroup = doGroup.customers.find(
        c => c.customer_name === nota.customer_name && c.customer_location_index === nota.customer_location_index
      );

      if (!customerGroup) {
        customerGroup = {
          customer_name: nota.customer_name,
          customer_location_index: nota.customer_location_index,
          notaKecils: [],
          totalV: 0,
        };
        doGroup.customers.push(customerGroup);
      }

      customerGroup.notaKecils.push(nota);
      const notaV = parseFloat(nota.V || '0');
      customerGroup.totalV += notaV;
      doGroup.totalV += notaV;
      doGroup.notaCount += 1;
    });

    // Sort by DO ID (newest first)
    const sortedGroups = Array.from(doMap.values()).sort((a, b) => b.id - a.id);
    
    // Sort customers within each DO
    sortedGroups.forEach(doGroup => {
      doGroup.customers.sort((a, b) => a.customer_location_index - b.customer_location_index);
      // Sort nota kecils by created_at
      doGroup.customers.forEach(customer => {
        customer.notaKecils.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    });

    return sortedGroups;
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/customers/locations');
      setCustomers(response.data.data || response.data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const toggleDO = (doId: number) => {
    setExpandedDOs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(doId)) {
        newSet.delete(doId);
      } else {
        newSet.add(doId);
      }
      return newSet;
    });
  };

  const toggleCustomer = (doId: number, customerKey: string) => {
    const key = `${doId}_${customerKey}`;
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
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

  const getThumbnailUrl = (fileId: string) => {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w100-h100`;
  };

  const getRealPhotoUrls = (notaKecil: NotaKecil, photoType: 'pressure_bar' | 'temperature' | 'stan_awal' | 'stan_akhir'): string[] => {
    let photos: string[] = [];

    if (notaKecil.photos && notaKecil.photos[photoType]) {
      photos = notaKecil.photos[photoType];
    } else {
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

    return photos.filter(url => 
      url && 
      !url.includes('example.com') && 
      !url.includes('placeholder') &&
      (url.includes('cloudinary.com') || url.includes('res.cloudinary.com') || url.includes('googleapis.com'))
    );
  };

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

  const handleStartSelection = (doId: number) => {
    setIsSelectionMode(true);
    setSelectedNotaKecils(new Set());
    // Expand the DO automatically
    setExpandedDOs(prev => new Set(prev).add(doId));
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedNotaKecils(new Set());
  };

  const handleCreateNotaBesar = async (doId: number) => {
    if (selectedNotaKecils.size === 0) {
      alert('Please select at least one nota kecil');
      return;
    }

    try {
      setCalculatingNotaBesar(true);

      const response = await authClient.post(`/delivery-orders/${doId}/nota-besar/calculate`, {
        notaKecilIds: Array.from(selectedNotaKecils),
        gasPricePerM3: gasPricePerM3
      });

      console.log('Nota besar created:', response.data);
      
      setSelectedNotaKecils(new Set());
      setIsSelectionMode(false);
      
      alert('Nota besar created successfully!');
      
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating nota besar:', error);
      alert('Failed to create nota besar: ' + (error.response?.data?.message || error.message));
    } finally {
      setCalculatingNotaBesar(false);
    }
  };

  const getCustomerInfo = (notaKecil: NotaKecil) => {
    const customerNameOrLocation = notaKecil.customer_name || 'Unknown Customer';
    
    let matchedCustomer = customers.find(c => c.customer_name === customerNameOrLocation);
    
    if (!matchedCustomer) {
      matchedCustomer = customers.find(c => c.location === customerNameOrLocation);
    }
    
    if (matchedCustomer) {
      return {
        customer_name: matchedCustomer.customer_name,
        customer_location: matchedCustomer.location
      };
    } else {
      return {
        customer_name: customerNameOrLocation,
        customer_location: notaKecil.customer_address || ''
      };
    }
  };

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

  if (deliveryOrderGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-lg">No nota kecils found</p>
        <p className="text-gray-400 text-sm mt-2">Nota kecils will appear here once drivers upload them</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection Mode Info */}
      {isSelectionMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                {selectedNotaKecils.size > 0 
                  ? `${selectedNotaKecils.size} nota kecil${selectedNotaKecils.size > 1 ? 's' : ''} selected`
                  : 'Select nota kecils to create nota besar'
                }
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Check the boxes next to nota kecils you want to include in the nota besar
              </p>
            </div>
            <button
              onClick={handleCancelSelection}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Delivery Order Groups */}
      {deliveryOrderGroups.map((doGroup) => {
        const isExpanded = expandedDOs.has(doGroup.id);
        
        return (
          <div key={doGroup.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* DO Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleDO(doGroup.id)}
                    className="hover:bg-blue-400 p-2 rounded transition-colors"
                  >
                    <FontAwesomeIcon 
                      icon={isExpanded ? faChevronDown : faChevronRight} 
                      className="w-4 h-4"
                    />
                  </button>
                  <FontAwesomeIcon icon={faTruck} className="w-5 h-5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{doGroup.do_number}</h3>
                    <p className="text-sm text-blue-100">
                      {doGroup.notaCount} nota kecil{doGroup.notaCount > 1 ? 's' : ''} • {doGroup.customers.length} customer{doGroup.customers.length > 1 ? 's' : ''} • Total: {doGroup.totalV.toLocaleString('id-ID', { minimumFractionDigits: 2 })} m³
                    </p>
                  </div>
                </div>
                {!isSelectionMode && (
                  <button
                    onClick={() => handleStartSelection(doGroup.id)}
                    className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Create Nota Besar
                  </button>
                )}
                {isSelectionMode && selectedNotaKecils.size > 0 && (
                  <button
                    onClick={() => handleCreateNotaBesar(doGroup.id)}
                    disabled={calculatingNotaBesar}
                    className="bg-white text-blue-600 hover:bg-blue-50 disabled:bg-blue-200 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {calculatingNotaBesar ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Create with {selectedNotaKecils.size} selected
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Customer Groups (Collapsible) */}
            {isExpanded && (
              <div className="divide-y divide-gray-200">
                {doGroup.customers.map((customerGroup) => {
                  const customerKey = `${customerGroup.customer_name}_${customerGroup.customer_location_index}`;
                  const isCustomerExpanded = expandedCustomers.has(`${doGroup.id}_${customerKey}`);
                  const customerInfo = getCustomerInfo(customerGroup.notaKecils[0]);
                  
                  return (
                    <div key={customerKey} className="bg-gray-50">
                      {/* Customer Header */}
                      <div className="p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => toggleCustomer(doGroup.id, customerKey)}
                              className="hover:bg-gray-200 p-2 rounded transition-colors"
                            >
                              <FontAwesomeIcon 
                                icon={isCustomerExpanded ? faChevronDown : faChevronRight} 
                                className="w-4 h-4 text-gray-600"
                              />
                            </button>
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 text-gray-500" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {customerInfo.customer_name}
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  Location {customerGroup.customer_location_index}
                                </span>
                              </h4>
                              <p className="text-sm text-gray-600">
                                {customerInfo.customer_location || 'Location not available'} • 
                                {customerGroup.notaKecils.length} nota kecil{customerGroup.notaKecils.length > 1 ? 's' : ''} • 
                                Total: {customerGroup.totalV.toLocaleString('id-ID', { minimumFractionDigits: 2 })} m³
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Nota Kecils List (Collapsible) - 2 Column Grid */}
                      {isCustomerExpanded && (
                        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {customerGroup.notaKecils.map((notaKecil) => {
                            const stanAwal = parseFloat(notaKecil.stan_awal || '0');
                            const stanAkhir = parseFloat(notaKecil.stan_akhir || '0');
                            const selisih = stanAkhir - stanAwal;
                            const isSelected = selectedNotaKecils.has(notaKecil.id);
                            
                            return (
                              <div 
                                key={notaKecil.id}
                                className={`bg-white border-2 rounded-lg p-3 transition-all ${
                                  isSelected 
                                    ? 'border-blue-500 shadow-md' 
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {/* Checkbox */}
                                  {isSelectionMode && (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => handleNotaKecilCheckboxChange(notaKecil.id, e.target.checked)}
                                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                                    />
                                  )}

                                  {/* Content */}
                                  <div className="flex-1 space-y-2">
                                    {/* Time & Date */}
                                    <div className="text-xs text-gray-500">
                              {formatDate(notaKecil.created_at)}
                              {/* Label for imperfect nota kecil (>=10 failed OCRs) */}
                              {(() => {
                                const status = notaKecil.ocr_processing_status || '';
                                const match = status.match(/^(\d+)_failed$/);
                                if (match) {
                                  const failedNum = match[1];
                                  return (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                                      {failedNum} failed
                                    </span>
                                  );
                                }
                                if (status === 'invalid_data') {
                                  return (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                                      invalid data
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                                    </div>

                                    {/* Stand Meter - Compact */}
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Stand Meter (m³)</p>
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="font-medium">{stanAwal.toFixed(2)}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="font-medium">{stanAkhir.toFixed(2)}</span>
                                        <span className="text-gray-400">=</span>
                                        <span className="font-bold text-blue-600">{selisih.toFixed(2)}</span>
                                      </div>
                                    </div>

                                    {/* Tekanan & Suhu - Side by Side */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <p className="text-xs text-gray-500">Tekanan</p>
                                        <p className="text-sm font-medium">
                                          {notaKecil.tekanan_operasi ? parseFloat(notaKecil.tekanan_operasi).toFixed(2) : 'N/A'} bar
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Suhu</p>
                                        <p className="text-sm font-medium">
                                          {notaKecil.temperatur_operasi ? parseFloat(notaKecil.temperatur_operasi).toFixed(2) : 'N/A'} °C
                                        </p>
                                      </div>
                                    </div>

                                    {/* Faktor Koreksi */}
                                    <div>
                                      <p className="text-xs text-gray-500">Faktor Koreksi (k)</p>
                                      <p className="text-sm font-medium">
                                        {notaKecil.k ? parseFloat(notaKecil.k).toFixed(6) : 'N/A'}
                                      </p>
                                    </div>

                                    {/* Pemakaian - Highlighted */}
                                    <div className="pt-2 border-t border-gray-100">
                                      <p className="text-xs text-gray-500">Pemakaian</p>
                                      <p className="text-lg font-bold text-purple-600">
                                        {notaKecil.V ? parseFloat(notaKecil.V).toFixed(2) : 'N/A'} m³
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

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

export default NotaKecilTab;
