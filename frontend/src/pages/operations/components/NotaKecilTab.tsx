// src/pages/operations/components/NotaKecilTab.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { authClient } from '../../../api/axiosConfig';
import { exportNotaKecilsToExcel, exportSummaryReport } from '../../../utils/excelExport';
import { NotaKecil } from '../../../types/notaKecil';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

interface DeliveryOrderGroup {
  id: number | null; // null for notas without DO
  do_number: string | null; // null for notas without DO
  key: string; // Unique key for expansion tracking (string representation of id or special key for null)
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
  const [exporting, setExporting] = useState(false);
  
  // Expand/collapse states
  const [expandedDOs, setExpandedDOs] = useState<Set<string>>(new Set());
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
      
      const grouped = groupNotaKecilsByDOAndCustomer(notaKecilsData);
      setDeliveryOrderGroups(grouped);
      
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
    const doMap = new Map<number | string, DeliveryOrderGroup>();

    notaKecilsData.forEach((nota) => {
      // Handle null delivery orders - use a special key for them
      const doId = nota.deliveryOrder?.id ?? null;
      const doNumber = nota.deliveryOrder?.do_number ?? null;
      const mapKey = doId ?? `no-do-${nota.customer_name}-${nota.customer_location_index}`;
      
      if (!doMap.has(mapKey)) {
        doMap.set(mapKey, {
          id: doId,
          do_number: doNumber ?? `No DO - ${nota.customer_name}`,
          key: mapKey.toString(), // Store the key for expansion tracking
          customers: [],
          totalV: 0,
          notaCount: 0,
        });
      }

      const doGroup = doMap.get(mapKey)!;
      
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

    const sortedGroups = Array.from(doMap.values()).sort((a, b) => {
      // Sort null IDs (no DO) to the end
      if (a.id === null) return 1;
      if (b.id === null) return -1;
      return (b.id ?? 0) - (a.id ?? 0);
    });
    
    sortedGroups.forEach(doGroup => {
      doGroup.customers.sort((a, b) => a.customer_location_index - b.customer_location_index);
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

  // Export handlers
  const handleExportAllToExcel = async () => {
    try {
      setExporting(true);
      const success = exportNotaKecilsToExcel(notaKecils, 'all_nota_kecils');
      if (!success) alert('Failed to export to Excel');
    } catch (err) {
      console.error('Export error:', err);
      alert('Error exporting to Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSummary = () => {
    try {
      setExporting(true);
      exportSummaryReport(deliveryOrderGroups);
    } catch (err) {
      console.error('Summary export error:', err);
      alert('Error exporting summary');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSelectedDO = (doGroup: DeliveryOrderGroup) => {
    try {
      setExporting(true);
      const doNotaKecils = doGroup.customers.flatMap(customer => customer.notaKecils);
      exportNotaKecilsToExcel(doNotaKecils, `nota_kecils_${doGroup.do_number}`);
    } catch (err) {
      console.error('DO export error:', err);
      alert('Error exporting delivery order data');
    } finally {
      setExporting(false);
    }
  };

  const toggleDO = (doKey: string) => {
    setExpandedDOs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(doKey)) newSet.delete(doKey);
      else newSet.add(doKey);
      return newSet;
    });
  };

  const toggleCustomer = (doKey: string, customerKey: string) => {
    const key = `${doKey}_${customerKey}`;
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
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

  const getOcrStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig = {
      'insufficient_data': { bg: 'from-yellow-400 to-amber-500', text: 'text-yellow-900', label: 'Insufficient Data' },
      'invalid_data': { bg: 'from-orange-400 to-red-500', text: 'text-white', label: 'Invalid Data' }
    };

    const match = status.match(/^(\d+)_failed$/);
    if (match) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm">
          {match[1]} Failed
        </span>
      );
    }

    const config = statusConfig[status as keyof typeof statusConfig];
    if (config) {
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${config.bg} ${config.text} shadow-sm`}>
          {config.label}
        </span>
      );
    }

    return null;
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
      case 'pressure_bar': title = 'Pressure Inlet Photos'; break;
      case 'temperature': title = 'Temperature Photos'; break;
      case 'stan_awal': title = 'Stan Awal Photos'; break;
      case 'stan_akhir': title = 'Current Stan Photos'; break;
    }

    if (realPhotos.length > 0) {
      setSelectedPhotos(realPhotos);
      setPhotoModalTitle(title);
      setShowPhotoModal(true);
    }
  };

  const renderPhotoButton = (notaKecil: NotaKecil, photoType: 'pressure_bar' | 'temperature' | 'stan_awal' | 'stan_akhir') => {
    const realPhotos = getRealPhotoUrls(notaKecil, photoType);
    const hasRealPhotos = realPhotos.length > 0;
    
    const icons = {
      pressure_bar: '📊',
      temperature: '🌡️',
      stan_awal: '⏮️',
      stan_akhir: '⏭️'
    };

    return (
      <button
        onClick={() => viewPhotos(notaKecil, photoType)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm
          ${hasRealPhotos 
            ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 hover:shadow-md hover:scale-105' 
            : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white/80 cursor-not-allowed opacity-60'
          }`}
        disabled={!hasRealPhotos}
        title={hasRealPhotos ? `View ${realPhotos.length} photo(s)` : 'No photos available'}
      >
        <span className="text-sm">{icons[photoType]}</span>
        <span>{hasRealPhotos ? realPhotos.length : '0'}</span>
      </button>
    );
  };

  const handleNotaKecilCheckboxChange = (notaKecilId: number, checked: boolean) => {
    setSelectedNotaKecils(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(notaKecilId);
      else newSet.delete(notaKecilId);
      return newSet;
    });
  };

  const handleStartSelection = (doKey: string) => {
    setIsSelectionMode(true);
    setSelectedNotaKecils(new Set());
    setExpandedDOs(prev => new Set(prev).add(doKey));
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedNotaKecils(new Set());
  };

  const handleCreateNotaBesar = async (doId: number | null) => {
    if (selectedNotaKecils.size === 0) {
      alert('Please select at least one nota kecil');
      return;
    }

    if (!doId) {
      alert('Cannot create nota besar for notas without a delivery order');
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
      <div className="flex items-center justify-center py-16 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 rounded-2xl">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent"></div>
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 blur opacity-30 animate-pulse"></div>
          </div>
          <p className="mt-6 text-xl font-semibold text-gray-700">Loading Nota Kecils...</p>
          <p className="mt-2 text-gray-500">Fetching delivery orders & customer data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchAllNotaKecils}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold"
            >
              🔄 Retry
            </button>
            <button
              onClick={() => navigate('/operations/nota-besar')}
              className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg font-semibold"
            >
              ← View Nota Besar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (deliveryOrderGroups.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg p-16 text-center border border-dashed border-gray-300">
        <div className="mx-auto h-24 w-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mb-6">
          <svg className="h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-3">No Nota Kecils Yet</h3>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Drivers will upload nota kecils here after delivery. Check back later or view existing nota besars.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/operations/nota-besar')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            👀 View Nota Besar
          </button>
          <button
            onClick={() => navigate('/delivery-orders')}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-lg font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            🚚 Delivery Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Export Buttons */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white">
              📊
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Export Data</h3>
              <p className="text-sm text-blue-700">Download nota kecils in Excel format</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportAllToExcel}
              disabled={exporting || notaKecils.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg font-semibold text-sm"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <span>📥</span>
                  Export All ({notaKecils.length})
                </>
              )}
            </button>
            
            <button
              onClick={handleExportSummary}
              disabled={exporting || deliveryOrderGroups.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg font-semibold text-sm"
            >
              <span>📋</span>
              Summary Report
            </button>
          </div>
        </div>
      </div>
      {/* Selection Mode Info */}
      {isSelectionMode && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {selectedNotaKecils.size}
              </div>
              <div>
                <p className="text-lg font-semibold text-blue-900">
                  {selectedNotaKecils.size > 0 
                    ? `${selectedNotaKecils.size} nota kecil${selectedNotaKecils.size > 1 ? 's' : ''} selected` 
                    : 'Select nota kecils to create nota besar'
                  }
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Check the boxes next to nota kecils you want to group into a nota besar
                </p>
              </div>
            </div>
            <button
              onClick={handleCancelSelection}
              className="px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg font-semibold transform hover:-translate-y-0.5"
            >
              ❌ Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Delivery Order Groups */}
      <div className="space-y-6">
        {deliveryOrderGroups.map((doGroup) => {
          const isExpanded = expandedDOs.has(doGroup.key);
          
          return (
            <div key={doGroup.key} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/50">
              {/* DO Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-blue-700 to-cyan-800 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => toggleDO(doGroup.key)}
                      className="group/chevron p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg 
                        className={`w-5 h-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                      🚚
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold tracking-tight">{doGroup.do_number}</h3>
                      <div className="flex flex-wrap items-center gap-6 mt-2 text-sm opacity-90">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                            {doGroup.notaCount}
                          </span>
                          <span>Nota Kecil</span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">
                            {doGroup.customers.length}
                          </span>
                          <span>Customers</span>
                        </span>
                        <span className="font-mono text-lg">
                          {doGroup.totalV.toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    {/* Export DO Button */}
                    <button
                      onClick={() => handleExportSelectedDO(doGroup)}
                      disabled={exporting}
                      className="group flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all font-semibold border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
                      title="Export this delivery order to Excel"
                    >
                      {exporting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <span>📥</span>
                      )}
                      Export DO
                    </button>
                    {!isSelectionMode && doGroup.id !== null && (
                      <button
                        onClick={() => handleStartSelection(doGroup.key)}
                        className="group flex items-center gap-3 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all font-semibold border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Nota Besar
                      </button>
                    )}
                    {isSelectionMode && selectedNotaKecils.size > 0 && doGroup.id !== null && (
                      <button
                        onClick={() => handleCreateNotaBesar(doGroup.id)}
                        disabled={calculatingNotaBesar}
                        className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg hover:shadow-xl font-semibold transform hover:scale-105 disabled:transform-none"
                      >
                        {calculatingNotaBesar ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Create ({selectedNotaKecils.size})
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Animated Collapse/Expand */}
              <div 
                className={`
                  overflow-hidden transition-all duration-700 ease-in-out
                  ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}
                `}
              >
                <div className="divide-y divide-gray-100">
                  {doGroup.customers.map((customerGroup) => {
                    const customerKey = `${customerGroup.customer_name}_${customerGroup.customer_location_index}`;
                    const isCustomerExpanded = expandedCustomers.has(`${doGroup.key}_${customerKey}`);
                    const customerInfo = getCustomerInfo(customerGroup.notaKecils[0]);
                    
                    return (
                      <div key={customerKey} className="bg-gradient-to-r from-gray-50 to-blue-50/30">
                        {/* Customer Header */}
                        <div className="p-6 hover:bg-gray-100/50 transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <button
                                onClick={() => toggleCustomer(doGroup.key, customerKey)}
                                className="group/chevron p-3 bg-white/30 backdrop-blur-sm rounded-xl hover:bg-white/50 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                              >
                                <svg 
                                  className={`w-5 h-5 transition-transform duration-500 ${isCustomerExpanded ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                🏪
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-lg text-gray-900">
                                  {customerInfo.customer_name}
                                </h4>
                                <div className="flex items-center gap-4 mt-2 text-sm">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    📍 Location {customerGroup.customer_location_index}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <span className="font-mono">{customerGroup.notaKecils.length}</span>
                                    <span className="text-gray-600">nota kecil</span>
                                  </span>
                                  <span className="font-mono text-purple-600">
                                    {customerGroup.totalV.toLocaleString('id-ID', { minimumFractionDigits: 3 })} m³
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Nota Kecil Cards - 2 Column Grid */}
                        {isCustomerExpanded && (
                          <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                            {customerGroup.notaKecils.map((notaKecil) => {
                              const stanAwal = parseFloat(notaKecil.stan_awal || '0');
                              const currentStan = parseFloat(notaKecil.current_stan || '0');
                              const selisih = currentStan - stanAwal;
                              const isSelected = selectedNotaKecils.has(notaKecil.id);
                              
                              return (
                                <div 
                                  key={notaKecil.id}
                                  className={`
                                    group/card bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-sm border border-gray-200
                                    hover:shadow-xl hover:border-blue-300 hover:-translate-y-2 transition-all duration-500
                                    ${isSelected ? 'border-2 border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200/50' : ''}
                                    relative overflow-hidden cursor-pointer
                                  `}
                                  onClick={() => isSelectionMode && handleNotaKecilCheckboxChange(notaKecil.id, !isSelected)}
                                >
                                  {/* Selection Ring */}
                                  {isSelectionMode && (
                                    <div className="absolute inset-0 bg-blue-500/10 rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                                  )}
                                  
                                  {/* Checkbox */}
                                  {isSelectionMode && (
                                    <div className="absolute top-4 right-4 z-10">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => handleNotaKecilCheckboxChange(notaKecil.id, e.target.checked)}
                                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-2 border-gray-300 rounded-lg flex-shrink-0 shadow-sm"
                                      />
                                    </div>
                                  )}

                                  {/* NK Badge */}
                                  <div className="absolute top-4 left-4 z-10">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                      NK
                                    </div>
                                  </div>

                                  {/* ✅ NEW: Screenshot Preview (from guide) */}
                                  {notaKecil.representative_screenshot_url && (
                                    <div className="relative group/screenshot mb-4">
                                      <img
                                        src={notaKecil.representative_screenshot_url}
                                        alt={`Screenshot for ${notaKecil.customer_name}`}
                                        className="w-full h-32 object-cover rounded-xl border border-gray-200 cursor-pointer"
                                        onClick={() => window.open(notaKecil.representative_screenshot_url, '_blank')}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover/screenshot:bg-black/20 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover/screenshot:opacity-100">
                                        <span className="text-white text-sm font-semibold bg-black/50 px-3 py-1 rounded-lg">
                                          📸 View Full Size
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Content */}
                                  <div className="relative z-10 space-y-4">
                                    {/* Time & OCR Status */}
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-gray-500 font-mono bg-gray-100 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                                        {formatDate(notaKecil.created_at)}
                                        {getOcrStatusBadge(notaKecil.ocr_processing_status)}
                                      </div>
                                    </div>

                                    {/* Stand Meter */}
                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
                                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Stand Meter</p>
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="font-mono text-gray-600">Awal</span>
                                        <span className="font-mono font-bold text-purple-600">{stanAwal.toFixed(3)}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="font-mono font-bold text-indigo-600">{currentStan.toFixed(3)}</span>
                                        <span className="text-gray-400">=</span>
                                        <span className="font-mono font-bold text-blue-600">{selisih.toFixed(3)}</span>
                                      </div>
                                    </div>

                                    {/* Measurements Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl text-center">
                                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Pressure Inlet</p>
                                        <p className="text-sm font-mono font-bold text-blue-800">
                                          {notaKecil.pressure_inlet ? parseFloat(notaKecil.pressure_inlet).toFixed(2) : 'N/A'} bar
                                        </p>
                                      </div>
                                      <div className="p-3 bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl text-center">
                                        <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">Pressure Outlet</p>
                                        <p className="text-sm font-mono font-bold text-cyan-800">
                                          {notaKecil.pressure_outlet ? parseFloat(notaKecil.pressure_outlet).toFixed(2) : 'N/A'} bar
                                        </p>
                                      </div>
                                      <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl text-center">
                                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Temperature</p>
                                        <p className="text-sm font-mono font-bold text-emerald-800">
                                          {notaKecil.temperature ? parseFloat(notaKecil.temperature).toFixed(1) : 'N/A'} °C
                                        </p>
                                      </div>
                                      <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl text-center">
                                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Correction (k)</p>
                                        <p className="text-sm font-mono font-bold text-purple-800">
                                          {notaKecil.k ? parseFloat(notaKecil.k).toFixed(6) : '1.000000'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Usage Display */}
                                    <div className="pt-4 border-t border-gray-200">
                                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Final Usage</p>
                                      <div className={`
                                        flex items-center justify-center gap-2 p-4 rounded-xl text-white
                                        ${parseFloat(notaKecil.volume_delta || '0') > 0 
                                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg' 
                                          : 'bg-gradient-to-r from-red-500 to-rose-600 shadow-lg'
                                        }
                                      `}>
                                        <span className="text-2xl font-bold font-mono">
                                          {notaKecil.volume_delta ? parseFloat(notaKecil.volume_delta).toFixed(3) : '0.000'}
                                        </span>
                                        <span className="text-sm">m³</span>
                                      </div>
                                      {parseFloat(notaKecil.V || '0') === 0 && (
                                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                          <p className="text-xs text-yellow-700 text-center">
                                            ⚠️ Check: Stan Awal={notaKecil.stan_awal}, Current={notaKecil.current_stan}, Vt={notaKecil.Vt}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Photo Buttons */}
                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                                      {renderPhotoButton(notaKecil, 'pressure_bar')}
                                      {renderPhotoButton(notaKecil, 'temperature')}
                                      {renderPhotoButton(notaKecil, 'stan_awal')}
                                      {renderPhotoButton(notaKecil, 'stan_akhir')}
                                    </div>
                                  </div>

                                  {/* Hover Sparkle */}
                                  <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-all duration-700 delay-300">
                                    <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur animate-pulse"></div>
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl max-w-7xl max-h-[95vh] w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                  📸
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{photoModalTitle}</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {selectedPhotos.length} photos
                </span>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-2xl transition-all group"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {selectedPhotos.map((photoUrl, index) => (
                  <div 
                    key={index} 
                    className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                  >
                    <div className="relative h-64 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/5 to-purple-500/5">
                      <img
                        src={photoUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onClick={() => window.open(photoUrl, '_blank')}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button 
                          onClick={() => window.open(photoUrl, '_blank')} 
                          className="w-full bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-xl font-semibold hover:bg-white hover:shadow-md transition-all text-sm"
                        >
                          🔗 Open Full Size
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm font-medium text-gray-900">Photo {index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedPhotos.length === 0 && (
                <div className="text-center py-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg text-gray-500 font-medium">No photos available</p>
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