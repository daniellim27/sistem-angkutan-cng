import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import './TireManagement.css';

// --- INTERFACES ---
interface Vehicle {
  id: number;
  license_plate: string;
  type: string;
  tire_count: number;
  spare_tire_count: number;
  total_tires: number;
  tire_positions?: string[];
  updatedAt?: string;
  current_mileage?: number;
  driver_name?: string;
  driver_phone?: string;
  driver_status?: string;
}

interface TireData {
  id: number;
  instance_id?: number;
  serial_number?: string;
  current_pressure: number;
  recommended_pressure: number;
  temperature: number;
  tread_depth: number;
  condition: string;
  install_date: string;
  brand: string;
  size: string;
  total_mileage?: number;
  mileage_installed?: number;
  isPressureLow?: boolean;
  isPressureHigh?: boolean;
  isTemperatureHigh?: boolean;
  needsReplacement?: boolean;
  updated_at: string;
  notes?: string;
}

interface TireStatus {
  position: string;
  installed: boolean;
  tire: TireData | null;
}

interface TireInventory {
  id: number;
  tire_brand: string;
  tire_size: string;
  tire_type?: string;
  current_stock: number;
  unit_price?: number;
}

interface TireInstance {
  id: number;
  tire_serial_number: string;
  purchase_date: string;
  tireInventory: {
    tire_brand: string;
    tire_size: string;
    tire_type?: string;
  };
  current_tread_depth: number;
  condition: string;
  status: string;
  total_mileage?: number;
  installations?: Array<{
    vehicle: {
      license_plate: string;
      current_mileage?: number;
    };
    install_date: string;
    remove_date: string;
    mileage_installed?: number;
    mileage_removed?: number;
  }>;
}

interface TireUpdateData {
  current_pressure: number;
  mileage_installed: number;
  tread_depth: number;
  condition: string;
  notes: string;
}

interface InstallData {
  tire_inventory_id: number | null;
  tire_instance_id: number | null;
  position: string;
  recommended_pressure: number;
  mileage_installed: number;
}

// Additional interfaces for TireInventoryTab
interface TireInventoryInstance {
  id: number;
  tire_serial_number: string;
  status: string;
  condition: string;
  purchase_date: string;
  purchase_price: string;
  current_tread_depth: number;
  notes?: string;
  tireInventory: {
    tire_brand: string;
    tire_size: string;
    tire_type: string;
  };
}

interface TireInventoryFilters {
  searchTerm: string;
  conditionFilter: string;
  brandFilter: string;
  sizeFilter: string;
  typeFilter: string;
}

interface EditModalData {
  condition: string;
  notes: string;
}

// TireInventoryTab Component
const TireInventoryTab: React.FC = () => {
  const [tires, setTires] = useState<TireInventoryInstance[]>([]);
  const [filteredTires, setFilteredTires] = useState<TireInventoryInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTire, setSelectedTire] = useState<TireInventoryInstance | null>(null);
  const [editData, setEditData] = useState<EditModalData>({
    condition: '',
    notes: ''
  });

  const [filters, setFilters] = useState<TireInventoryFilters>({
    searchTerm: '',
    conditionFilter: '',
    brandFilter: '',
    sizeFilter: '',
    typeFilter: ''
  });

  const [filterOptions, setFilterOptions] = useState({
    conditions: [] as string[],
    brands: [] as string[],
    sizes: [] as string[],
    types: [] as string[]
  });

  // Condition mapping
  const conditionMapping: { [key: string]: string } = {
    'new': 'Baru',
    'good': 'Baik',
    'fair': 'Cukup',
    'poor': 'Buruk',
    'damaged': 'Rusak',
    'disposed': 'Dibuang',
    'replace': 'Perlu Ganti',
    'meledak': 'Meledak',
    'bocor': 'Bocor',
    'kampasa': 'Kampasa'
  };

  useEffect(() => {
    fetchAvailableTires();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tires, filters]);

  const fetchAvailableTires = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/tires/inventory-instances');
      
      const responseData = response.data;
      const tiresArray = Array.isArray(responseData.data) 
        ? responseData.data 
        : Array.isArray(responseData) 
        ? responseData 
        : [];

      setTires(tiresArray);
      
      // Extract unique filter options
      const conditions = Array.from(new Set(tiresArray.map((tire: TireInventoryInstance) => tire.condition).filter(Boolean)));
      const brands = Array.from(new Set(tiresArray.map((tire: TireInventoryInstance) => tire.tireInventory?.tire_brand).filter(Boolean)));
      const sizes = Array.from(new Set(tiresArray.map((tire: TireInventoryInstance) => tire.tireInventory?.tire_size).filter(Boolean)));
      const types = Array.from(new Set(tiresArray.map((tire: TireInventoryInstance) => tire.tireInventory?.tire_type).filter(Boolean)));

      setFilterOptions({
        conditions: conditions.sort(),
        brands: brands.sort(),
        sizes: sizes.sort(),
        types: types.sort()
      });

    } catch (err) {
      setError('Failed to fetch tire inventory');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = tires;

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(tire =>
        tire.tire_serial_number.toLowerCase().includes(searchLower) ||
        tire.tireInventory?.tire_brand?.toLowerCase().includes(searchLower) ||
        tire.tireInventory?.tire_size?.toLowerCase().includes(searchLower) ||
        tire.notes?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.conditionFilter) {
      filtered = filtered.filter(tire => tire.condition === filters.conditionFilter);
    }

    if (filters.brandFilter) {
      filtered = filtered.filter(tire => tire.tireInventory?.tire_brand === filters.brandFilter);
    }

    if (filters.sizeFilter) {
      filtered = filtered.filter(tire => tire.tireInventory?.tire_size === filters.sizeFilter);
    }

    if (filters.typeFilter) {
      filtered = filtered.filter(tire => tire.tireInventory?.tire_type === filters.typeFilter);
    }

    setFilteredTires(filtered);
  };

  const handleFilterChange = (key: keyof TireInventoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      conditionFilter: '',
      brandFilter: '',
      sizeFilter: '',
      typeFilter: ''
    });
  };

  const handleEdit = (tire: TireInventoryInstance) => {
    setSelectedTire(tire);
    setEditData({
      condition: tire.condition,
      notes: tire.notes || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTire) return;

    try {
      await apiClient.put(`/tires/inventory-instances/${selectedTire.id}`, editData);
      await fetchAvailableTires();
      setEditModalOpen(false);
      setSelectedTire(null);
    } catch (err) {
      console.error('Failed to update tire:', err);
      alert('Failed to update tire');
    }
  };

  const getConditionDisplay = (condition: string): string => {
    return conditionMapping[condition] || condition;
  };

  const getConditionBadge = (condition: string) => {
    const colorMap: { [key: string]: string } = {
      'new': 'bg-green-100 text-green-800',
      'good': 'bg-blue-100 text-blue-800',
      'fair': 'bg-yellow-100 text-yellow-800',
      'poor': 'bg-orange-100 text-orange-800',
      'damaged': 'bg-red-100 text-red-800',
      'disposed': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorMap[condition] || 'bg-gray-100 text-gray-800'}`}>
        {getConditionDisplay(condition)}
      </span>
    );
  };

  const getConditionCount = (condition: string) => {
    return filteredTires.filter(tire => tire.condition === condition).length;
  };

  const totalValue = filteredTires.reduce((sum, tire) => {
    const price = parseFloat(tire.purchase_price);
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  if (loading) return <div className="text-center p-8">Loading tire inventory...</div>;
  if (error) return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Search and Filter Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Search Term */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Serial, brand, size..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              value={filters.conditionFilter}
              onChange={(e) => handleFilterChange('conditionFilter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Conditions</option>
              {filterOptions.conditions.map(condition => (
                <option key={condition} value={condition}>
                  {getConditionDisplay(condition)}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <select
              value={filters.brandFilter}
              onChange={(e) => handleFilterChange('brandFilter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Brands</option>
              {filterOptions.brands.map(brand => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          {/* Size Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size
            </label>
            <select
              value={filters.sizeFilter}
              onChange={(e) => handleFilterChange('sizeFilter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Sizes</option>
              {filterOptions.sizes.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filters.typeFilter}
              onChange={(e) => handleFilterChange('typeFilter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Types</option>
              {filterOptions.types.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredTires.length} of {tires.length} tires
          {filters.searchTerm && ` matching "${filters.searchTerm}"`}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {['new', 'good', 'fair', 'poor', 'damaged', 'disposed'].map(condition => (
          <div key={condition} className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-900">
              {getConditionCount(condition)}
            </div>
            <div className="text-sm text-gray-600 capitalize">
              {getConditionDisplay(condition)}
            </div>
          </div>
        ))}
      </div>

      {/* Total Value */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="text-lg font-semibold text-gray-900">
          Total Inventory Value: Rp {totalValue.toLocaleString('id-ID')}
        </div>
      </div>

      {/* Tire Inventory Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Serial Number
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Brand & Size
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Condition
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Tread Depth
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Purchase Info
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTires.length > 0 ? filteredTires.map((tire) => (
              <tr key={tire.id} className="hover:bg-gray-50">
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <div className="font-medium text-gray-900">{tire.tire_serial_number}</div>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <div>
                    <div className="font-medium text-gray-900">
                      {tire.tireInventory?.tire_brand || 'N/A'}
                    </div>
                    <div className="text-gray-600">
                      {tire.tireInventory?.tire_size || 'N/A'} - {tire.tireInventory?.tire_type || 'N/A'}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {getConditionBadge(tire.condition)}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <div className="text-gray-900">{tire.current_tread_depth}mm</div>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <div>
                    <div className="text-gray-900 font-medium">
                      Rp {parseFloat(tire.purchase_price).toLocaleString('id-ID')}
                    </div>
                    <div className="text-gray-600 text-xs">
                      {new Date(tire.purchase_date).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    tire.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {tire.status}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                  <button
                    onClick={() => handleEdit(tire)}
                    className="text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">
                  No tires found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModalOpen && selectedTire && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Edit Tire: {selectedTire.tire_serial_number}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition
              </label>
              <select
                value={editData.condition}
                onChange={(e) => setEditData({...editData, condition: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(conditionMapping).map(condition => (
                  <option key={condition} value={condition}>
                    {getConditionDisplay(condition)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({...editData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TireManagementPage = () => {
  // Tab state
  const [selectedTab, setSelectedTab] = useState<'management' | 'inventory'>('management');
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [tireStatuses, setTireStatuses] = useState<TireStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedTire, setSelectedTire] = useState<TireData | null>(null);
  const [updateData, setUpdateData] = useState<TireUpdateData>({
    current_pressure: 0,
    mileage_installed: 0,
    tread_depth: 0,
    condition: 'good',
    notes: ''
  });
  
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [availableTires, setAvailableTires] = useState<TireInstance[]>([]);
  const [availableInstances, setAvailableInstances] = useState<TireInstance[]>([]);
  const [installData, setInstallData] = useState<InstallData>({
    tire_inventory_id: null,
    tire_instance_id: null,
    position: '',
    recommended_pressure: 35,
    mileage_installed: 0
  });
  const [useSpecificInstance, setUseSpecificInstance] = useState(false);
  
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  
  const location = useLocation();

  const conditionMapping: { [key: string]: string } = {
    'new': 'Baru',
    'good': 'Baik',
    'fair': 'Cukup',
    'poor': 'Buruk',
    'damaged': 'Rusak',
    'disposed': 'Dibuang',
    'replace': 'Perlu Ganti',
    'meledak': 'Meledak',
    'bocor': 'Bocor',
    'kampasa': 'Kampasa'
  };

  const getConditionDisplay = (condition: string): string => {
    return conditionMapping[condition] || condition;
  };

  const calculateTireKilometers = (tire: TireData) => {
    console.log('Vehicle current_mileage:', selectedVehicle?.current_mileage);
    console.log('Tire mileage_installed:', tire.mileage_installed);
    
    if (!selectedVehicle?.current_mileage) {
      return tire.mileage_installed || 0;
    }
    
    if (tire.mileage_installed !== undefined && tire.mileage_installed !== null) {
      const result = selectedVehicle.current_mileage - tire.mileage_installed;
      console.log('Calculated kilometers:', result);
      return result;
    }
    return 0;
  };

  const generateTirePositions = (tireCount: number, spareTireCount: number): string[] => {
    const positions = [];
    
    positions.push('FL', 'FR');
    
    const rearTireCount = tireCount - 2;
    
    if (rearTireCount === 2) {
      positions.push('RL1', 'RR1');
    } else if (rearTireCount === 4) {
      positions.push('RL1A', 'RL1B', 'RR1A', 'RR1B');
    } else if (rearTireCount === 8) {
      positions.push('RL1A', 'RL1B', 'RR1A', 'RR1B', 'RL2A', 'RL2B', 'RR2A', 'RR2B');
    } else if (rearTireCount >= 6) {
      const axleCount = Math.ceil(rearTireCount / 4);
      for (let axle = 1; axle <= axleCount; axle++) {
        positions.push(`RL${axle}A`, `RL${axle}B`, `RR${axle}A`, `RR${axle}B`);
      }
    }
    
    for (let spare = 1; spare <= spareTireCount; spare++) {
      positions.push(`SPARE${spare}`);
    }
    
    return positions;
  };

  const groupTirePositions = (positions: string[]) => {
    return {
      front: positions.filter(pos => pos.startsWith('F')),
      rear: positions.filter(pos => pos.startsWith('R')),
      spare: positions.filter(pos => pos.startsWith('SPARE'))
    };
  };

  const groupRearTiresByAxle = (rearPositions: string[]) => {
    console.log('=== GROUPING DEBUG ===');
    console.log('Input rear positions:', rearPositions);
    const axles: string[][] = [];
    
    if (rearPositions.length === 0) {
      console.log('No rear positions - returning empty array');
      return axles;
    }
    
    const axleMap = new Map<number, string[]>();
    
    rearPositions.forEach(pos => {
      const axleMatch = pos.match(/(\d+)/);
      const axleNum = axleMatch ? parseInt(axleMatch[0]) : 1;

      console.log(`Position ${pos} -> Axle ${axleNum}`);
      
      if (!axleMap.has(axleNum)) {
        axleMap.set(axleNum, []);
      }
      axleMap.get(axleNum)!.push(pos);
    });

    console.log('Axle map:', Array.from(axleMap.entries()));
    
    Array.from(axleMap.keys()).sort().forEach(axleNum => {
      const axleTires = axleMap.get(axleNum)!;
      
      const sortedTires = axleTires.sort((a: string, b: string) => {
        if (a.includes('L') && b.includes('R')) return -1;
        if (a.includes('R') && b.includes('L')) return 1;
        
        if (a.includes('A') && b.includes('B')) return -1;
        if (a.includes('B') && b.includes('A')) return 1;
        
        return a.localeCompare(b);
      });
      
      console.log(`Axle ${axleNum} sorted tires:`, sortedTires);
      axles.push(sortedTires);
    });
    
    console.log('Final axles result:', axles);
    console.log('===================');
    return axles;
  };

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await apiClient.get('/tires/vehicles');
      setVehicles(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      throw err;
    }
  }, []);

  const fetchVehicleTireStatus = useCallback(async (vehicleId: number) => {
    try {
      const response = await apiClient.get(`/tires/vehicles/${vehicleId}/status`);
      const data = response.data?.data || response.data;
      setTireStatuses(Array.isArray(data.tires) ? data.tires : []);
    } catch (err) {
      console.error('Failed to fetch tire status:', err);
      throw err;
    }
  }, []);

  const fetchAvailableTires = useCallback(async () => {
    try {
      const response = await apiClient.get('/tires/inventory-instances');
      setAvailableTires(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch available tires:', err);
    }
  }, []);

  const fetchAvailableInstances = useCallback(async () => {
    try {
      const response = await apiClient.get('/tires/tire-instances/available?status=removed');
      setAvailableInstances(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch available instances:', err);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchVehicles();
        const params = new URLSearchParams(location.search);
        const vehicleIdFromUrl = params.get('vehicleId');
        if (vehicleIdFromUrl) {
          setSelectedVehicleId(vehicleIdFromUrl);
          await fetchVehicleTireStatus(parseInt(vehicleIdFromUrl, 10));
        }
      } catch (err) {
        console.error("Initialization failed:", err);
        setError("Gagal memuat data. Periksa koneksi atau hubungi administrator.");
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [location.search, fetchVehicles, fetchVehicleTireStatus]);

  const handleVehicleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vehicleIdStr = e.target.value;
    setSelectedVehicleId(vehicleIdStr);
    if (vehicleIdStr) {
      try {
        await fetchVehicleTireStatus(parseInt(vehicleIdStr, 10));
      } catch (err) {
        setError("Gagal memuat status ban kendaraan.");
      }
    } else {
      setTireStatuses([]);
    }
  };

  const selectedVehicle = selectedVehicleId 
    ? vehicles.find(v => v.id === parseInt(selectedVehicleId)) || null 
    : null;

  const handleUpdateClick = (tire: TireData) => {
    setSelectedTire(tire);
    setUpdateData({
      current_pressure: tire.current_pressure,
      mileage_installed: tire.mileage_installed || 0,
      tread_depth: tire.tread_depth,
      condition: tire.condition,
      notes: tire.notes || ''
    });
    setUpdateModalOpen(true);
  };

  const handleUpdateTire = async () => {
    if (!selectedTire || !selectedVehicle) return;
    try {
      await apiClient.put(`/tires/tires/${selectedTire.id}`, updateData);
      setUpdateModalOpen(false);
      await fetchVehicleTireStatus(selectedVehicle.id);
    } catch (error) {
      console.error('Failed to update tire:', error);
      alert('Gagal memperbarui data ban.');
    }
  };

  const handleInstallClick = async (position: string) => {
    setSelectedPosition(position);
    setInstallData({
      tire_inventory_id: null,
      tire_instance_id: null,
      position: position,
      recommended_pressure: 35,
      mileage_installed: selectedVehicle?.current_mileage || 0,
    });
    setUseSpecificInstance(false);
    await fetchAvailableTires();
    await fetchAvailableInstances();
    setInstallModalOpen(true);
  };

  const handleInstallTire = async () => {
    if (!selectedVehicle) return;
    try {
      const endpoint = installData.tire_instance_id 
        ? `/tires/vehicles/${selectedVehicle.id}/install-instance`
        : `/tires/vehicles/${selectedVehicle.id}/install`;
      
      await apiClient.post(endpoint, installData);
      setInstallModalOpen(false);
      await fetchVehicleTireStatus(selectedVehicle.id);
    } catch (error) {
      console.error('Failed to install tire:', error);
      alert('Gagal memasang ban.');
    }
  };

  const handleRemoveTire = (tire: TireData) => {
    setConfirmMessage(`Anda yakin ingin melepas ban S/N: ${tire.serial_number || 'N/A'}?`);
    setConfirmAction(() => async () => {
      if (!selectedVehicle) return;
      try {
        await apiClient.delete(`/tires/tires/${tire.id}`, {
          data: { reason: 'Manual removal', notes: 'Removed via tire management' }
        });
        await fetchVehicleTireStatus(selectedVehicle.id);
      } catch (error) {
        console.error('Failed to remove tire:', error);
        alert('Gagal melepas ban.');
      }
    });
    setConfirmModalOpen(true);
  };

  const renderTire = (tireStatus: TireStatus) => {
    const { position, tire } = tireStatus;
    const isInstalled = tire !== null;
    
    const displayPosition = position.length > 3 ? 
      `${position.slice(0, -1)}\n${position.slice(-1)}` : position;
    
    return (
      <div 
        key={position}
        className={`tire-visual ${isInstalled ? 'installed' : 'empty'} ${
          tire?.isPressureLow ? 'pressure-low' : ''
        } ${tire?.isPressureHigh ? 'pressure-high' : ''} ${
          tire?.isTemperatureHigh ? 'temp-high' : ''
        } ${tire?.needsReplacement ? 'needs-replacement' : ''} ${
          position.includes('A') ? 'outer-tire' : position.includes('B') ? 'inner-tire' : ''
        }`}
        title={isInstalled ? `${tire.brand} ${tire.size} - ${tire.condition}` : 'Empty'}
      >
        <span className="tire-position-text">{displayPosition}</span>
      </div>
    );
  };

  const renderInfoBox = (tireStatus: TireStatus) => {
    const { position, installed, tire } = tireStatus;

    const tireType = position.includes('A') ? 'outer' : position.includes('B') ? 'inner' : 'single';

    if (!installed || !tire) {
      return (
        <div key={position} className={`tire-info-box empty ${tireType}-tire-info`}>
          <div className="tire-position">
            {position}
            {position.includes('A') && <span className="tire-type-label">(Luar)</span>}
            {position.includes('B') && <span className="tire-type-label">(Dalam)</span>}
          </div>
          <button 
            onClick={() => handleInstallClick(position)} 
            className="install-button"
          >
            Pasang
          </button>
        </div>
      );
    }

    return (
      <div key={position} className={`tire-info-box installed ${tireType}-tire-info`}>
        <div className="tire-position">
          {position}
          {position.includes('A') && <span className="tire-type-label">(Luar)</span>}
          {position.includes('B') && <span className="tire-type-label">(Dalam)</span>}
        </div>
        <button 
          onClick={() => handleUpdateClick(tire)} 
          className="update-button"
        >
          Update
        </button>
        <div className="tire-details">
          <div>S/N: {tire.serial_number || 'N/A'}</div>
          <div>Pasang: {new Date(tire.install_date).toLocaleDateString('id-ID')}</div>
          <div>Tekanan: {tire.current_pressure} PSI</div>
          <div>Tapak: {tire.tread_depth} mm</div>
          <div>Kilometer: {calculateTireKilometers(tire).toLocaleString('id-ID')} km</div>
          <div>Kondisi: {getConditionDisplay(tire.condition)}</div>
          <div>Terakhir Update: {tire.updated_at ? new Date(tire.updated_at).toLocaleString('id-ID') : '-'}</div>
          {tire.notes && (
            <div className="tire-notes">
              <strong>Catatan:</strong> {tire.notes}
            </div>
          )}
        </div>
        <button 
          onClick={() => handleRemoveTire(tire)} 
          className="remove-button"
        >
          Lepas
        </button>
      </div>
    );
  };

  const renderVehicleLayout = () => {
    if (!selectedVehicle) return null;

    const expectedPositions = selectedVehicle.tire_positions || 
      generateTirePositions(selectedVehicle.tire_count, selectedVehicle.spare_tire_count);

    const tireStatusMap = new Map<string, TireStatus>();
    tireStatuses.forEach((status: TireStatus) => tireStatusMap.set(status.position, status));

    const getTireByPosition = (pos: string): TireStatus => {
      const tire = tireStatusMap.get(pos);
      return tire || { position: pos, installed: false, tire: null };
    };

    const groupedPositions = groupTirePositions(expectedPositions);
    const rearAxles = groupRearTiresByAxle(groupedPositions.rear);

    const leftFrontPositions = groupedPositions.front.filter(pos => pos.includes('L'));
    const rightFrontPositions = groupedPositions.front.filter(pos => pos.includes('R'));
    
    const leftRearPositions = groupedPositions.rear.filter(pos => pos.startsWith('RL'));
    const rightRearPositions = groupedPositions.rear.filter(pos => pos.startsWith('RR'));

    return (
      <div className="vehicle-layout">
        <div className="vehicle-info">
          <div>PLAT: {selectedVehicle.license_plate}</div>
          <div>TIPE: {selectedVehicle.type}</div>
          <div>BAN: {tireStatuses.filter(t => t.installed).length}/{expectedPositions.length} terpasang</div>
        </div>

        <div className="truck-layout-container">
          <div className="left-info-column">
            {leftFrontPositions.map(pos => renderInfoBox(getTireByPosition(pos)))}
            {leftRearPositions.map(pos => renderInfoBox(getTireByPosition(pos)))}
          </div>

          <div className="truck-visual-container">
            <div className="truck-header">
              <div className="truck-info-line">
                <span>PLAT: {selectedVehicle.license_plate}</span>
              </div>
              <div className="truck-info-line">
                <span>TYPE: {selectedVehicle.type}</span>
              </div>
            </div>

            <div className="truck-body">
              <div className="axle-section front-axle">
                <div className="tire-pair">
                  {leftFrontPositions.map(pos => renderTire(getTireByPosition(pos)))}
                  <div className="axle-line front-line"></div>
                  {rightFrontPositions.map(pos => renderTire(getTireByPosition(pos)))}
                </div>
              </div>

              {groupedPositions.spare.length > 0 && (
                <div className="truck-chassis">
                  <div className="spare-section">
                    <div className="spare-label">SEREP</div>
                    <div className="spare-tires">
                      {groupedPositions.spare.map(pos => 
                        renderTire(getTireByPosition(pos))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {rearAxles.map((axlePositions, axleIndex) => (
                <div key={`axle-${axleIndex}`} className="axle-section rear-axle">
                  <div className="axle-label">As {axleIndex + 1}</div>
                  <div className="tire-pair dual-tire">
                    <div className="dual-tire-group left">
                      <div className="dual-tire-row">
                          {['A', 'B'].map(suffix => {
                          const pos = axlePositions.find(p => p.startsWith('RL') && p.endsWith(suffix));
                          return pos ? renderTire(getTireByPosition(pos)) : <div className="tire-visual empty" key={suffix}></div>;
                          })}
                      </div>
                      </div>
                    
                    <div className="axle-line rear-line"></div>
                    
                      <div className="dual-tire-group right">
                          <div className="dual-tire-row">
                              {['B', 'A'].map(suffix => {
                              const pos = axlePositions.find(
                                  p => p.startsWith('RR') && p.endsWith(suffix)
                              );
                              return pos
                                  ? renderTire(getTireByPosition(pos))
                                  : <div className="tire-visual empty" key={suffix}></div>;
                              })}
                          </div>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="right-info-column">
            {rightFrontPositions.map(pos => renderInfoBox(getTireByPosition(pos)))}
            {rightRearPositions.map(pos => renderInfoBox(getTireByPosition(pos)))}
            {groupedPositions.spare.map(pos => 
              renderInfoBox(getTireByPosition(pos))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Tire Management</h1>
          <div className="flex space-x-2">
            {selectedTab === 'management' ? (
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-md transition duration-200">
                Manage Tires
              </button>
            ) : (
              <Link to="/tire-inventory/create">
                <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow-md transition duration-200">
                  + Add Tire Stock
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
                onClick={() => setSelectedTab('management')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  selectedTab === 'management'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tire Management
              </button>
              <button
                onClick={() => setSelectedTab('inventory')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  selectedTab === 'inventory'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tire Inventory
              </button>
            </nav>
          </div>

          {/* Tab Content - Descriptions */}
          <div className="p-4">
            {selectedTab === 'management' && (
              <div className="text-sm text-gray-600">
                Manage tires for specific vehicles, install and remove tires, monitor tire conditions and pressure.
              </div>
            )}
            {selectedTab === 'inventory' && (
              <div className="text-sm text-gray-600">
                View and manage tire inventory, track tire stock, condition, and purchase information.
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'management' && (
          <div className="tire-management-page">
            {error && (
              <div className="error-message">{error}</div>
            )}

            <div className="vehicle-selector">
              <label>Pilih Kendaraan:</label>
              <select value={selectedVehicleId} onChange={handleVehicleChange}>
                <option value="">-- Pilih Kendaraan --</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.license_plate} ({vehicle.type}) - {vehicle.tire_count + vehicle.spare_tire_count} ban
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="loading">Memuat...</div>
            ) : (
              !loading && selectedVehicle && renderVehicleLayout()
            )}
          </div>
        )}

        {selectedTab === 'inventory' && (
          <TireInventoryTab />
        )}
      </div>

      {confirmModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Konfirmasi Tindakan</h3>
            <p>{confirmMessage}</p>
            <div className="modal-buttons">
              <button 
                onClick={() => setConfirmModalOpen(false)} 
                className="modal-button secondary"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  if (confirmAction) confirmAction();
                  setConfirmModalOpen(false);
                }} 
                className="modal-button primary danger"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ UPDATED INSTALL MODAL */}
      {installModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Pasang Ban di Posisi {selectedPosition}</h3>
            
            <div className="form-group">
              <label>Sumber Ban:</label>
              <div className="radio-group">
                <label>
                  <input 
                    type="radio" 
                    checked={!useSpecificInstance}
                    onChange={() => setUseSpecificInstance(false)}
                  />
                  Dari Inventaris (Ban Baru)
                </label>
                <label>
                  <input 
                    type="radio" 
                    checked={useSpecificInstance}
                    onChange={() => setUseSpecificInstance(true)}
                  />
                  Ban Bekas (Sudah Dilepas)
                </label>
              </div>
            </div>

            {useSpecificInstance ? (
              <div className="form-group">
                <label>Pilih Ban Bekas:</label>
                <div className="tire-selection">
                  {availableInstances.length === 0 ? (
                    <p className="no-data">Tidak ada ban bekas yang tersedia</p>
                  ) : (
                    availableInstances.map((instance) => (
                      <div 
                        key={instance.id}
                        className={`tire-option ${installData.tire_instance_id === instance.id ? 'selected' : ''}`}
                        onClick={() => {
                          // ✅ Get tire's historical mileage
                          let tireMileage = selectedVehicle?.current_mileage || 0;
                          
                          if (instance.installations && instance.installations.length > 0) {
                            const lastInstallation = instance.installations[0];
                            // Use mileage_removed if available, otherwise mileage_installed
                            tireMileage = lastInstallation.mileage_removed || lastInstallation.mileage_installed || tireMileage;
                          }

                          setInstallData(prev => ({ 
                            ...prev, 
                            tire_instance_id: instance.id, 
                            tire_inventory_id: null,
                            mileage_installed: tireMileage // ✅ Use tire's historical mileage
                          }));
                        }}
                      >
                        <div>{instance.tireInventory.tire_brand} {instance.tireInventory.tire_size}</div>
                        <div>S/N: {instance.tire_serial_number} | Tapak: {instance.current_tread_depth}mm</div>
                        <div>Kondisi: {getConditionDisplay(instance.condition)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Pilih Ban dari Inventaris:</label>
                <div className="tire-selection">
                  {availableTires.length === 0 ? (
                    <p className="no-data">Tidak ada ban baru yang tersedia</p>
                  ) : (
                    availableTires.map((tire) => (
                      <div 
                        key={tire.id}
                        className={`tire-option ${installData.tire_instance_id === tire.id ? 'selected' : ''}`}
                        onClick={() => setInstallData(prev => ({ 
                          ...prev, 
                          tire_instance_id: tire.id,
                          tire_inventory_id: null,
                          mileage_installed: selectedVehicle?.current_mileage || 0 // ✅ For new tires, use vehicle mileage
                        }))}
                      >
                        <div><strong>S/N:</strong> {tire.tire_serial_number}</div>
                        <div><strong>Merek:</strong> {tire.tireInventory.tire_brand}</div>
                        <div><strong>Ukuran:</strong> {tire.tireInventory.tire_size}</div>
                        <div><strong>Tgl Beli:</strong> {new Date(tire.purchase_date).toLocaleDateString('id-ID')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Tekanan Direkomendasikan (PSI):</label>
              <input 
                type="number" 
                value={installData.recommended_pressure}
                onChange={(e) => setInstallData(prev => ({ 
                  ...prev, 
                  recommended_pressure: parseFloat(e.target.value) || 35 
                }))}
                min="10"
                max="150"
              />
            </div>

            <div className="form-group">
              <label>Kilometer Saat Pasang:</label>
              <input 
                type="number"
                value={installData.mileage_installed}
                onChange={(e) => setInstallData(prev => ({
                  ...prev, 
                  mileage_installed: parseInt(e.target.value) || 0
                }))}
                min="0"
              />
              {/* ✅ Add helper text */}
              {useSpecificInstance && installData.tire_instance_id && (
                <small className="text-gray-600" style={{fontSize: '12px', color: '#666', marginTop: '4px', display: 'block'}}>
                  * Mileage otomatis diisi berdasarkan riwayat ban yang dipilih
                </small>
              )}
            </div>

            <div className="modal-buttons">
              <button 
                onClick={() => setInstallModalOpen(false)} 
                className="modal-button secondary"
              >
                Batal
              </button>
              <button 
                onClick={handleInstallTire}
                className="modal-button primary"
                disabled={!installData.tire_inventory_id && !installData.tire_instance_id}
              >
                Pasang Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {updateModalOpen && selectedTire && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Update Ban S/N: {selectedTire.serial_number || 'N/A'}</h3>
            
            <div className="form-group">
              <label>Tekanan (PSI):</label>
              <input 
                type="number" 
                step="0.1"
                value={updateData.current_pressure}
                onChange={(e) => setUpdateData(prev => ({
                  ...prev, 
                  current_pressure: parseFloat(e.target.value) || 0
                }))}
                min="0"
                max="200"
              />
            </div>

            <div className="form-group">
              <label>Kedalaman Tapak (mm):</label>
              <input 
                type="number" 
                step="0.1"
                value={updateData.tread_depth}
                onChange={(e) => setUpdateData(prev => ({
                  ...prev, 
                  tread_depth: parseFloat(e.target.value) || 0
                }))}
                min="0"
                max="20"
              />
            </div>

            <div className="form-group">
              <label>Kilometer Saat Pasang:</label>
              <input 
                type="number"
                value={updateData.mileage_installed}
                onChange={(e) => setUpdateData(prev => ({
                  ...prev, 
                  mileage_installed: parseInt(e.target.value) || 0
                }))}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Kondisi:</label>
              <select 
                value={updateData.condition}
                onChange={(e) => setUpdateData(prev => ({
                  ...prev, 
                  condition: e.target.value
                }))}
              >
                <option value="new">Baru</option>
                <option value="good">Baik</option>
                <option value="fair">Cukup</option>
                <option value="poor">Buruk</option>
                <option value="replace">Perlu Ganti</option>
                <option value="damaged">Rusak</option>
                <option value="disposed">Dibuang</option>
                <option value="meledak">Meledak</option>
                <option value="bocor">Bocor</option>
                <option value="kampasa">Kampasa</option>
              </select>
            </div>

            <div className="form-group">
              <label>Catatan:</label>
              <textarea 
                value={updateData.notes}
                onChange={(e) => setUpdateData(prev => ({
                  ...prev, 
                  notes: e.target.value
                }))}
                rows={4}
                maxLength={150}
                placeholder="Tambahkan catatan inspeksi... (max 150 karakter)"
              />
              <div className={`character-count ${
                updateData.notes.length > 125 ? 'near-limit' : ''
              } ${updateData.notes.length >= 150 ? 'at-limit' : ''}`}>
                {updateData.notes.length}/150 karakter
              </div>
            </div>

            <div className="modal-buttons">
              <button 
                onClick={() => setUpdateModalOpen(false)} 
                className="modal-button secondary"
              >
                Batal
              </button>
              <button 
                onClick={handleUpdateTire}
                className="modal-button primary"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TireManagementPage;
