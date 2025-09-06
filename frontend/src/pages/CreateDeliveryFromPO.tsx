import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import apiClient from "../api/axiosConfig";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css";

const DefaultIcon = L.Icon.Default as any;
DefaultIcon.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const loadIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const unloadIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface PODetails {
  id: number;
  po_number: string;
  customer_name: string;
  item_name: string;
  unit: string;
  unit_price?: number; // Made optional since incoming removes this from PO
  total_quantity: number;
  delivered_quantity: number;
  remaining_quantity: number;
  load_location: string;
  unload_location: string;
  load_latitude?: number;
  load_longitude?: number;
  unload_latitude?: number;
  unload_longitude?: number;
  deposit_group_id?: number;
  deposit_group?: {
    id: number;
    name: string;
    status: string;
    remaining_quantity: number;
    target_quantity: number;
  };
  is_deposit_linked?: boolean;
}

interface DepositGroupDetails {
  id: number;
  group_name: string;
  balance: string;
  deposited_amount: string;
  target_quantity: string;
  remaining_quantity: string;
  unit: string;
  status: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  customer_name: string;
  item_name: string;
  total_quantity: number;
  unit: string;
  unit_price: string;
  total_amount: string;
  status: string;
  deposit_group_id?: number;
  created_at: string;
}

interface Vehicle {
  id: number;
  license_plate: string;
  type: string;
  capacity: string;
  status: string;
  driver_id: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_status: string | null;
}

interface DOFormData {
  do_name: string;
  item_name: string; // Added from incoming - for item selection
  vehicle_id: string;
  minimal_load_quantity: string;
  unit_price: string; // Added from incoming - user can set price per DO
  trip_allowance: string;
  gaji: string;
  ongkosan: string;
  load_location: string;
  unload_location: string;
  load_latitude: string;
  load_longitude: string;
  unload_latitude: string;
  unload_longitude: string;
  // Enhanced with gas filling fields
  gas_volume_m3: string;
  spbg_location: string;
  calculation_method: 'jisdor' | 'fixed';
  jisdor_rate: string;
  fixed_rate: string; // Added for fixed rate input
  gas_filling_cost: string;
  showGasFilling: boolean; // Added for toggle
}

interface MarkerType {
  lat: number;
  lng: number;
  title: string;
  type: "load" | "unload";
}

const SearchControlComponent = ({
  onLocationFound,
}: {
  onLocationFound: (lat: number, lng: number, label: string) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();
    const searchControl = new (GeoSearchControl as any)({
      provider: provider,
      style: "bar",
      showMarker: false,
      autoClose: true,
      keepResult: true,
    });

    const onShowLocation = (e: any) => {
      onLocationFound(e.location.y, e.location.x, e.location.label);
    };

    map.addControl(searchControl);
    map.on("geosearch/showlocation", onShowLocation);

    return () => {
      map.removeControl(searchControl);
      map.off("geosearch/showlocation", onShowLocation);
    };
  }, [map, onLocationFound]);

  return null;
};

const MapClickHandler: React.FC<{
  selectedLocationType: "load" | "unload" | null;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  onClearSelection: () => void;
}> = ({ selectedLocationType, onLocationSelect, onClearSelection }) => {
  const map = useMap();

  useEffect(() => {
    const onClick = (e: L.LeafletMouseEvent) => {
      if (selectedLocationType) {
        const { lat, lng } = e.latlng;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            const address = data.display_name || `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
            onLocationSelect(lat, lng, address);
            onClearSelection();
          })
          .catch(() => {
            const address = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
            onLocationSelect(lat, lng, address);
            onClearSelection();
          });
      }
    };

    map.on('click', onClick);

    return () => {
      map.off('click', onClick);
    };
  }, [map, selectedLocationType, onLocationSelect, onClearSelection]);

  return null;
};

const CreateDeliveryFromPO: React.FC = () => {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const [poDetails, setPODetails] = useState<PODetails | null>(null);
  const [poItems, setPoItems] = useState<string[]>([]); // Added from incoming - for multi-item support
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]); // Changed to array for multiple errors
  const [depositGroupDetails, setDepositGroupDetails] = useState<DepositGroupDetails | null>(null);
  const [depositGroupLoading, setDepositGroupLoading] = useState(false);
  const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loadingAllPOs, setLoadingAllPOs] = useState(false);
  
  // JISDOR rate fetching states
  const [currentJisdorRate, setCurrentJisdorRate] = useState<number | null>(16364.42); // Set default rate
  const [jisdorLoading, setJisdorLoading] = useState(false);
  const [jisdorLastUpdated, setJisdorLastUpdated] = useState<string | null>(new Date().toISOString());
  
  const [formDataList, setFormDataList] = useState<DOFormData[]>([
    {
      do_name: "",
      item_name: "", // Added from incoming
      vehicle_id: "",
      minimal_load_quantity: "",
      unit_price: "", // Added from incoming
      trip_allowance: "",
      gaji: "",
      ongkosan: "",
      load_location: "",
      unload_location: "",
      load_latitude: "",
      load_longitude: "",
      unload_latitude: "",
      unload_longitude: "",
              // Initialize gas filling fields
        gas_volume_m3: "",
        spbg_location: "",
        calculation_method: 'jisdor',
        jisdor_rate: currentJisdorRate ? currentJisdorRate.toString() : "",
        fixed_rate: "7800", // Default fixed rate
        gas_filling_cost: "",
        showGasFilling: false // Added for toggle
    },
  ]);
  
  // Map-related states
  const [selectedLocationType, setSelectedLocationType] = useState<"load" | "unload" | null>(null);
  const [showMap, setShowMap] = useState<boolean>(true);
  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const [currentFormIndex, setCurrentFormIndex] = useState<number>(0);
  const [linkProcessing, setLinkProcessing] = useState<{
    load: boolean;
    unload: boolean;
  }>({ load: false, unload: false });

  // SPBG locations for selection
  const spbgLocations = [
    { value: 'jakarta', label: 'Jakarta' },
    { value: 'bandung', label: 'Bandung' },
    { value: 'surabaya', label: 'Surabaya' },
    { value: 'semarang', label: 'Semarang' },
    { value: 'yogyakarta', label: 'Yogyakarta' },
    { value: 'medan', label: 'Medan' },
    { value: 'palembang', label: 'Palembang' },
    { value: 'makassar', label: 'Makassar' }
  ];

  // Gas calculation methods
  const calculationMethods = [
    { value: 'jisdor', label: 'JISDOR Rate (Dynamic)' },
    { value: 'fixed', label: 'Fixed Rate (Standard)' }
  ];

  // Default map center
  const defaultCenter = { lat: -6.2088, lng: 106.8456 };

  // Fetch current JISDOR rate from API
  const fetchJisdorRate = async () => {
    try {
      setJisdorLoading(true);
      console.log('🔄 Fetching current JISDOR rate...');
      
      const response = await apiClient.get('/exchange-rates/current');
      
      if (response.data.success) {
        const rate = response.data.data.rate;
        const lastScraped = response.data.data.last_scraped_at;
        
        setCurrentJisdorRate(rate);
        setJisdorLastUpdated(lastScraped);
        
        // Auto-fill all forms with JISDOR calculation method with the fetched rate
        setFormDataList(prev => prev.map((form, index) => {
          if (form.calculation_method === 'jisdor') {
            const updatedForm = { 
              ...form, 
              jisdor_rate: rate.toString()
            };
            // Recalculate gas filling cost if volume is already set
            if (form.gas_volume_m3) {
              const volume = parseFloat(form.gas_volume_m3);
              const cost = Math.round((volume / 27.27) * 12.7 * rate * 100) / 100;
              updatedForm.gas_filling_cost = cost.toString();
              console.log(`🔄 Auto-calculating gas filling cost for form ${index}: (${volume}/27.27) × 12.7 × ${rate} = ${cost}`);
            }
            return updatedForm;
          }
          return form;
        }));
        
        console.log(`✅ JISDOR rate fetched: ${rate} (updated: ${lastScraped})`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch JISDOR rate:', error);
      setErrors(prev => [...prev, 'Failed to fetch current JISDOR rate from server']);
    } finally {
      setJisdorLoading(false);
    }
  };

  const getUnitDisplay = (unit: string) => {
    const unitMap = {
      kilogram: "kg",
      ton: "ton",
      kubik: "m³",
    };
    return unitMap[unit as keyof typeof unitMap] || unit;
  };

  // Updated to use user-entered unit price instead of PO unit price
  const calculateTotalAmount = (
    quantity: number,
    unitPrice: number,
    unit: string
  ) => {
    // Direct calculation: quantity * unitPrice per unit
    return quantity * unitPrice;
  };

  // Updated to use user-entered unit price
  const calculateOngkosan = (formData: DOFormData, poUnit?: string): number => {
    if (!formData.unit_price || !poUnit || !formData.minimal_load_quantity)
      return 0;
    const quantity = parseFloat(formData.minimal_load_quantity);
    const unitPrice = parseFloat(formData.unit_price);
    const totalRevenue = calculateTotalAmount(quantity, unitPrice, poUnit);
    const operationalCosts =
      (parseFloat(formData.trip_allowance) || 0) +
      (parseFloat(formData.gaji) || 0);
    
    // Include gas filling cost in the calculation
    let gasFillingCost = parseFloat(formData.gas_filling_cost) || 0;
    
    // If gas filling cost is not calculated but we have volume and JISDOR method, calculate it
    if (!gasFillingCost && formData.gas_volume_m3 && formData.calculation_method === 'jisdor') {
      const volume = parseFloat(formData.gas_volume_m3);
      const jisdorRate = parseFloat(formData.jisdor_rate) || currentJisdorRate;
      if (volume && jisdorRate) {
        gasFillingCost = Math.round((volume / 27.27) * 12.7 * jisdorRate * 100) / 100;
      }
    }
    
    return totalRevenue - operationalCosts - gasFillingCost;
  };

  // Calculate total amount for all delivery orders
  const calculateTotalDOAmount = (): number => {
    return formDataList.reduce((total, formData) => {
      if (!formData.unit_price || !formData.minimal_load_quantity) return total;
      const quantity = parseFloat(formData.minimal_load_quantity);
      const unitPrice = parseFloat(formData.unit_price);
      return total + calculateTotalAmount(quantity, unitPrice, poDetails?.unit || "ton");
    }, 0);
  };

  // Calculate available balance (deposited_amount - sum of existing POs)
  const getAvailableDepositBalance = (): number => {
    if (!depositGroupDetails || !poDetails?.is_deposit_linked) return 0;
    
    const depositedAmount = parseFloat(depositGroupDetails.deposited_amount);
    
    // Filter POs that belong to this deposit group
    const groupPOs = allPurchaseOrders.filter(po => po.deposit_group_id === depositGroupDetails.id);
    console.log(`🔍 Deposit Group ${depositGroupDetails.id}: Found ${groupPOs.length} existing POs`, groupPOs.map(po => ({ id: po.id, total_amount: po.total_amount })));
    
    // Sum up all existing PO amounts
    const totalExistingPOAmount = groupPOs.reduce((sum, po) => sum + parseFloat(po.total_amount), 0);
    console.log(`🔍 Total existing PO amount: ${totalExistingPOAmount}, Deposited amount: ${depositedAmount}`);
    
    // Calculate available balance
    const availableBalance = depositedAmount - totalExistingPOAmount;
    console.log(`🔍 Available balance: ${availableBalance}`);
    
    return availableBalance;
  };

  // Check if total DO amount exceeds deposit group balance
  const isDOAmountExceedingBalance = (): boolean => {
    if (!depositGroupDetails || !poDetails?.is_deposit_linked) return false;
    const totalDOAmount = calculateTotalDOAmount();
    const availableBalance = getAvailableDepositBalance();
    return totalDOAmount > availableBalance;
  };

  // Get remaining deposit balance after DOs
  const getRemainingDepositBalance = (): number => {
    if (!depositGroupDetails || !poDetails?.is_deposit_linked) return 0;
    const totalDOAmount = calculateTotalDOAmount();
    const availableBalance = getAvailableDepositBalance();
    return availableBalance - totalDOAmount;
  };

  // Location setting function
  const setLocationWithType = (lat: number, lng: number, address: string, type: "load" | "unload") => {
    const newFormDataList = [...formDataList];
    if (type === "load") {
      newFormDataList[currentFormIndex] = {
        ...newFormDataList[currentFormIndex],
        load_location: address,
        load_latitude: lat.toString(),
        load_longitude: lng.toString(),
      };
    } else {
      newFormDataList[currentFormIndex] = {
        ...newFormDataList[currentFormIndex],
        unload_location: address,
        unload_latitude: lat.toString(),
        unload_longitude: lng.toString(),
      };
    }
    setFormDataList(newFormDataList);

    // Update markers
    setMarkers(prev => {
      const filtered = prev.filter(m => m.type !== type);
      return [...filtered, {
        lat,
        lng,
        title: type === "load" ? "Load Location" : "Unload Location",
        type
      }];
    });

    setSelectedLocationType(null);
  };

  // Search select handler
  const handleSearchSelect = (lat: number, lng: number, label: string) => {
    if (selectedLocationType) {
      setLocationWithType(lat, lng, label, selectedLocationType);
    }
  };

  useEffect(() => {
    if (poId) {
      fetchPODetails();
      fetchAvailableVehicles();
    }
  }, [poId]);

  // Auto-fetch JISDOR rate when component mounts
  useEffect(() => {
    fetchJisdorRate();
  }, []);

  // Recalculate gas filling costs when JISDOR rate changes
  useEffect(() => {
    if (currentJisdorRate) {
      setFormDataList(prev => prev.map((form, index) => {
        if (form.calculation_method === 'jisdor' && form.gas_volume_m3) {
          const volume = parseFloat(form.gas_volume_m3);
          const cost = Math.round((volume / 27.27) * 12.7 * currentJisdorRate * 100) / 100;
          console.log(`🔄 Recalculating gas filling cost for form ${index}: (${volume}/27.27) × 12.7 × ${currentJisdorRate} = ${cost}`);
          return { ...form, gas_filling_cost: cost.toString() };
        }
        return form;
      }));
    }
  }, [currentJisdorRate]);

  const fetchAllPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
    try {
      setLoadingAllPOs(true);
      console.log('🔍 Fetching all purchase orders for balance calculation...');
      const response = await apiClient.get('/purchase-orders?page=1&limit=20');
      const allPos = response.data?.data || response.data || [];
      console.log('🔍 Fetched POs:', allPos.length, allPos.map((po: PurchaseOrder) => ({ id: po.id, deposit_group_id: po.deposit_group_id })));
      setAllPurchaseOrders(allPos);
      return allPos;
    } catch (err) {
      console.error('Failed to fetch purchase orders:', err);
      setErrors(prev => [...prev, 'Failed to fetch purchase orders for balance calculation.']);
      setAllPurchaseOrders([]);
      return [];
    } finally {
      setLoadingAllPOs(false);
    }
  };

  const fetchDepositGroupDetails = async (depositGroupId: number): Promise<void> => {
    try {
      setDepositGroupLoading(true);
      const response = await apiClient.get(`/deposit-groups/${depositGroupId}`);
      setDepositGroupDetails(response.data);
    } catch (err) {
      console.error("Error fetching deposit group details:", err);
      setErrors(prev => [...prev, "Failed to fetch deposit group details."]);
    } finally {
      setDepositGroupLoading(false);
    }
  };

  const fetchPODetails = async (): Promise<void> => {
    try {
      const response = await apiClient.get(`/purchase-orders/${poId}`);
      const details = response.data.data || response.data;

      if (!details.unit) {
        console.warn('PO data missing unit field, defaulting to "ton"');
        details.unit = "ton";
      }

      setPODetails(details);

      // Fetch deposit group details and all POs if PO is linked to a deposit group
      if (details.deposit_group_id) {
        await Promise.all([
          fetchDepositGroupDetails(details.deposit_group_id),
          fetchAllPurchaseOrders()
        ]);
      }

      // Multi-item support from incoming
      const items = details.item_name
        ? details.item_name.split(",").map((i: string) => i.trim())
        : [];
      setPoItems(items);

      const initialFormData = {
        do_name: "",
        item_name: items.length === 1 ? items[0] : "", // Preselect if only one item
        vehicle_id: "",
        minimal_load_quantity: "",
        unit_price: "", // User will enter this
        trip_allowance: "",
        gaji: "",
        ongkosan: "",
        load_location: details.load_location || "",
        unload_location: details.unload_location || "",
        load_latitude: details.load_latitude?.toString() || "",
        load_longitude: details.load_longitude?.toString() || "",
        unload_latitude: details.unload_latitude?.toString() || "",
        unload_longitude: details.unload_longitude?.toString() || "",
        // Initialize gas filling fields
        gas_volume_m3: "",
        spbg_location: "",
        calculation_method: 'jisdor' as 'jisdor' | 'fixed',
        jisdor_rate: currentJisdorRate ? currentJisdorRate.toString() : "16364.42",
        fixed_rate: "7800", // Default fixed rate
        gas_filling_cost: "",
        showGasFilling: false // Added for toggle
      };
      setFormDataList([initialFormData]);
      
      // Always calculate gas filling cost if we have volume and rate
      if (currentJisdorRate) {
        setTimeout(() => {
          setFormDataList(prev => prev.map((form, idx) => {
            if (form.calculation_method === 'jisdor' && form.gas_volume_m3) {
              const volume = parseFloat(form.gas_volume_m3);
              const cost = Math.round((volume / 27.27) * 12.7 * currentJisdorRate * 100) / 100;
              console.log(`🔄 Initial calculation for form ${idx}: (${volume}/27.27) × 12.7 × ${currentJisdorRate} = ${cost}`);
              return { ...form, gas_filling_cost: cost.toString() };
            }
            return form;
          }));
        }, 100);
      }

      // Initialize markers if coordinates exist
      const initialMarkers: MarkerType[] = [];
      if (details.load_latitude && details.load_longitude) {
        initialMarkers.push({
          lat: details.load_latitude,
          lng: details.load_longitude,
          title: "Load Location",
          type: "load"
        });
      }
      if (details.unload_latitude && details.unload_longitude) {
        initialMarkers.push({
          lat: details.unload_latitude,
          lng: details.unload_longitude,
          title: "Unload Location",
          type: "unload"
        });
      }
      setMarkers(initialMarkers);
    } catch (err) {
      console.error("Error fetching PO details:", err);
      setErrors(prev => [...prev, "Failed to fetch purchase order details."]);
    }
  };

  const fetchAvailableVehicles = async (): Promise<void> => {
    try {
      const response = await apiClient.get("/vehicles");
      const vehiclesData = response.data.data || response.data || [];
      setVehicles(
        vehiclesData.filter(
          (v: Vehicle) =>
            v.driver_id &&
            v.driver_status === "available" &&
            v.status === "available"
        )
      );
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setErrors(prev => [...prev, "Failed to fetch available vehicles."]);
    }
  };

  // Auto-calculate gas filling cost when volume changes
  const calculateGasFillingCost = (formData: DOFormData, index: number): void => {
    const volume = parseFloat(formData.gas_volume_m3);
    if (!volume) {
      const newFormDataList = [...formDataList];
      newFormDataList[index] = { ...formData, gas_filling_cost: '' };
      setFormDataList(newFormDataList);
      return;
    }

    let cost = 0;
    if (formData.calculation_method === 'jisdor') {
      // Use form JISDOR rate if available, otherwise use current rate from API
      const jisdorRate = parseFloat(formData.jisdor_rate) || currentJisdorRate;
      if (jisdorRate && !isNaN(jisdorRate)) {
        // Formula: (volume/27.27) * 12.7 * jisdor_rate
        // Round to 2 decimal places to avoid precision issues
        cost = Math.round((volume / 27.27) * 12.7 * jisdorRate * 100) / 100;
        console.log(`🔢 Gas filling cost calculation: (${volume}/27.27) × 12.7 × ${jisdorRate} = ${cost}`);
      } else {
        console.log('⚠️ JISDOR rate not available for calculation');
      }
    } else if (formData.calculation_method === 'fixed') {
      // Fixed rate: use user input or default 7800 IDR per m³
      const fixedRate = parseFloat(formData.fixed_rate) || 7800;
      cost = Math.round(volume * fixedRate * 100) / 100;
      console.log(`🔢 Fixed rate gas filling cost: ${volume} × ${fixedRate} = ${cost}`);
    }

    const newFormDataList = [...formDataList];
    newFormDataList[index] = { 
      ...formData, 
      gas_filling_cost: cost > 0 ? cost.toString() : ''
    };
    setFormDataList(newFormDataList);
    
    console.log(`✅ Gas filling cost updated for form ${index}: ${cost > 0 ? cost.toString() : 'empty'}`);
  };

  const handleInputChange = (
    index: number,
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ): void => {
    const newFormDataList = [...formDataList];
    newFormDataList[index] = {
      ...newFormDataList[index],
      [e.target.name]: e.target.value,
    };
    setFormDataList(newFormDataList);

    // Recalculate ongkosan if relevant fields change
    if (
      e.target.name === "minimal_load_quantity" ||
      e.target.name === "unit_price" || // Added from incoming
      e.target.name === "trip_allowance" ||
      e.target.name === "gaji"
    ) {
      newFormDataList[index].ongkosan = calculateOngkosan(
        newFormDataList[index],
        poDetails?.unit
      ).toString();
      setFormDataList([...newFormDataList]);
    }

    // Auto-calculate gas filling cost when gas-related fields change
    if (
      e.target.name === 'gas_volume_m3' || 
      e.target.name === 'calculation_method' || 
      e.target.name === 'jisdor_rate' ||
      e.target.name === 'fixed_rate'
    ) {
      // Auto-set JISDOR rate when calculation method changes to 'jisdor'
      if (e.target.name === 'calculation_method' && e.target.value === 'jisdor' && currentJisdorRate) {
        newFormDataList[index].jisdor_rate = currentJisdorRate.toString();
      }
      // Auto-set fixed rate when calculation method changes to 'fixed'
      if (e.target.name === 'calculation_method' && e.target.value === 'fixed') {
        newFormDataList[index].fixed_rate = '7800';
      }
      calculateGasFillingCost(newFormDataList[index], index);
    }
  };

  const addForm = () => {
    setFormDataList([
      ...formDataList,
      {
        do_name: "",
        item_name: poItems.length === 1 ? poItems[0] : "", // Preselect if only one item
        vehicle_id: "",
        minimal_load_quantity: "",
        unit_price: "",
        trip_allowance: "",
        gaji: "",
        ongkosan: "",
        load_location: poDetails?.load_location || "",
        unload_location: poDetails?.unload_location || "",
        load_latitude: poDetails?.load_latitude?.toString() || "",
        load_longitude: poDetails?.load_longitude?.toString() || "",
        unload_latitude: poDetails?.unload_latitude?.toString() || "",
        unload_longitude: poDetails?.unload_longitude?.toString() || "",
        // Initialize gas filling fields
        gas_volume_m3: "",
        spbg_location: "",
        calculation_method: 'jisdor',
        jisdor_rate: currentJisdorRate ? currentJisdorRate.toString() : "16364.42",
        fixed_rate: "7800", // Default fixed rate
        gas_filling_cost: "",
        showGasFilling: false // Added for toggle
      },
    ]);
  };

  const duplicateForm = (index: number) => {
    const currentForm = formDataList[index];
    const newForm: DOFormData = {
      ...currentForm,
      do_name: `${currentForm.do_name} - Copy`, // Auto-append " - Copy" to DO Name
    };
    setFormDataList([...formDataList, newForm]);
  };

  const removeForm = (index: number) => {
    setFormDataList(formDataList.filter((_, i) => i !== index));
  };

  const getSelectedVehicle = (vehicleId: string): Vehicle | undefined =>
    vehicles.find((v) => v.id.toString() === vehicleId);

  const handleProcessLocationLink = async (
    type: "load" | "unload",
    input: string
  ) => {
    if (!input) return;
    setLinkProcessing((prev) => ({ ...prev, [type]: true }));
    setErrors([]); // Clear previous errors

    try {
      const backendUrl = process.env.REACT_APP_API_URL || "";
      const resp = await fetch(`${backendUrl}/utils/resolve-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await resp.json();

      if (data.lat && data.lng) {
        setLocationWithType(data.lat, data.lng, `${data.lat},${data.lng}`, type);
      } else {
        setErrors(prev => [
          ...prev,
          data.message ||
            "Could not determine coordinates. Please check the input or enter coordinates manually.",
        ]);
      }
    } catch (error) {
      setErrors(prev => [
        ...prev,
        "Could not process the location link. Please try again or enter coordinates manually.",
      ]);
    } finally {
      setLinkProcessing((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    const newErrors: string[] = [];

    try {
      if (!poDetails || poDetails.remaining_quantity === undefined) {
        newErrors.push(
          "Purchase order details are incomplete. Cannot create delivery orders."
        );
        return;
      }

      // Check deposit group balance validation
      if (poDetails.is_deposit_linked && isDOAmountExceedingBalance()) {
        const totalDOAmount = calculateTotalDOAmount();
        const availableBalance = getAvailableDepositBalance();
        const errorMessage = `Total delivery order amount (Rp ${totalDOAmount.toLocaleString('id-ID')}) exceeds available deposit balance (Rp ${availableBalance.toLocaleString('id-ID')}). Please reduce quantities or unit prices.`;
        
        // Show alert
        alert(errorMessage);
        
        newErrors.push(errorMessage);
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      for (let index = 0; index < formDataList.length; index++) {
        const formData = formDataList[index];
        const unitPrice = parseFloat(formData.unit_price);
        if (isNaN(unitPrice) || unitPrice <= 0) {
          throw new Error(
            `Invalid unit price (${unitPrice}) for DO ${
              formData.do_name || index + 1
            }. Must be a positive number.`
          );
        }

        const selectedVehicle = getSelectedVehicle(formData.vehicle_id);
        if (!selectedVehicle || !selectedVehicle.driver_id) {
          throw new Error(
            `Invalid vehicle selection for DO ${
              formData.do_name || index + 1
            }`
          );
        }

        if (!formData.item_name) {
          throw new Error(
            `Item name is required for DO ${formData.do_name || index + 1}`
          );
        }

        const quantity = parseFloat(formData.minimal_load_quantity);
        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(
            `Invalid quantity (${quantity}) for DO ${
              formData.do_name || index + 1
            }. Must be a positive number.`
          );
        }
        if (quantity > poDetails.remaining_quantity) {
          throw new Error(
            `Invalid quantity (${quantity}) for DO ${
              formData.do_name || index + 1
            }. Must not exceed remaining ${
              poDetails.remaining_quantity
            } ${getUnitDisplay(poDetails.unit || "ton")}.`
          );
        }

        const totalAmount = calculateTotalAmount(
          quantity,
          unitPrice,
          poDetails.unit
        );

        const payload = {
          purchase_order_id: poDetails.id,
          vehicle_id: parseInt(formData.vehicle_id),
          driver_id: selectedVehicle.driver_id,
          do_name: formData.do_name,
          customer_name: poDetails.customer_name,
          item_name: formData.item_name, // Use selected item
          minimal_load_quantity: quantity,
          unit: poDetails.unit,
          unit_price: unitPrice, // User-entered unit price
          total_amount: totalAmount,
          trip_allowance: parseFloat(formData.trip_allowance),
          gaji: parseFloat(formData.gaji),
          ongkosan: parseFloat(formData.ongkosan),
          load_location: formData.load_location || poDetails.load_location,
          unload_location:
            formData.unload_location || poDetails.unload_location,
          load_latitude: formData.load_latitude
            ? parseFloat(formData.load_latitude)
            : null,
          load_longitude: formData.load_longitude
            ? parseFloat(formData.load_longitude)
            : null,
          unload_latitude: formData.unload_latitude
            ? parseFloat(formData.unload_latitude)
            : null,
          unload_longitude: formData.unload_longitude
            ? parseFloat(formData.unload_longitude)
            : null,
          payment_status: "proses_tagihan",
          status: "assigned",
          // Include gas filling data
          gas_volume_m3: formData.gas_volume_m3 ? parseFloat(formData.gas_volume_m3) : null,
          spbg_location: formData.spbg_location || null,
          calculation_method: formData.calculation_method,
          jisdor_rate: formData.jisdor_rate ? parseFloat(formData.jisdor_rate) : null,
          gas_filling_cost: formData.gas_filling_cost ? parseFloat(formData.gas_filling_cost) : null
        };

        console.log(`Creating DO with payload:`, payload);
        await apiClient.post("/delivery-orders", payload);
      }

      if (newErrors.length === 0) {
        navigate("/delivery-orders");
      }
    } catch (err: any) {
      newErrors.push(
        err.response?.data?.message ||
          err.message ||
          `Failed to create one or more delivery orders.`
      );
    } finally {
      setErrors(newErrors);
      setLoading(false);
    }
  };

  if (!poDetails)
    return (
      <div className="text-center p-8">Loading purchase order details...</div>
    );

  const unitDisplay = getUnitDisplay(poDetails.unit);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Create Delivery Order
        </h1>
        <button
          onClick={() => navigate(`/trips/po/${poId}`)}
          className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          ← Back
        </button>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-6">
          {errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Purchase Order Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm text-gray-600">PO Number</label>
            <p className="font-medium">{poDetails.po_number}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Customer</label>
            <p className="font-medium">{poDetails.customer_name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Items</label>
            <p className="font-medium">{poItems.join(", ")}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Remaining Qty</label>
            <p className="font-medium text-green-600">
              {poDetails.remaining_quantity?.toLocaleString("id-ID")}{" "}
              {unitDisplay}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Unit</label>
            <p className="font-medium">
              <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                {unitDisplay}
              </span>
            </p>
          </div>
        </div>

        {poDetails.unit_price && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">PO Unit Price (Reference)</label>
                <p className="font-medium text-blue-700">
                  Rp {poDetails.unit_price.toLocaleString("id-ID")}/
                  {unitDisplay}
                  {poDetails.unit === "ton" && (
                    <span className="text-xs text-blue-600 block">
                      (Rp{" "}
                      {(poDetails.unit_price / 1000).toLocaleString("id-ID")}
                      /kg)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">
                  Pricing Strategy
                </label>
                <p className="text-sm text-blue-600">
                  {poDetails.unit === "kubik"
                    ? "Volume-based pricing"
                    : "Weight-based pricing"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Group Information - Simplified */}
        {poDetails.is_deposit_linked && depositGroupDetails && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Deposit Group Name</label>
                <p className="font-medium text-blue-700">{depositGroupDetails.group_name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Remaining Balance</label>
                <p className="font-medium text-green-600">
                  Rp {getAvailableDepositBalance().toLocaleString("id-ID")}
                </p>
              </div>
            </div>
            
            {/* Current DO Amount Calculation
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                📊 Current Delivery Order Summary
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-yellow-700">Total DO Amount:</span>
                  <span className="ml-2 font-medium text-yellow-900">
                    Rp {calculateTotalDOAmount().toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-yellow-700">Remaining Balance:</span>
                  <span className={`ml-2 font-medium ${
                    getRemainingDepositBalance() >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Rp {getRemainingDepositBalance().toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-yellow-700">Status:</span>
                  <span className={`ml-2 font-medium ${
                    isDOAmountExceedingBalance() ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {isDOAmountExceedingBalance() ? '⚠️ Exceeds Balance' : '✅ Within Balance'}
                  </span>
                </div>
              </div>
              {isDOAmountExceedingBalance() && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  ⚠️ Warning: The total amount of delivery orders exceeds the available deposit balance. 
                  Please reduce quantities or unit prices to proceed.
                </div>
              )}
            </div> */}
          </div>
        )}

        {(depositGroupLoading || loadingAllPOs) && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="text-center text-blue-600">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2">
                {depositGroupLoading ? 'Loading deposit group details...' : 'Loading purchase orders...'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {formDataList.map((formData, index) => (
              <div key={index} className="bg-white border rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Delivery Order {index + 1}</h3>
                  <div className="flex space-x-2">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeForm(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => duplicateForm(index)}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      Duplicate
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Order Name *
                  </label>
                  <input
                    type="text"
                    name="do_name"
                    value={formData.do_name}
                    onChange={(e) => handleInputChange(index, e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Pengiriman Pasir ke Proyek XYZ"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Give a descriptive name for this delivery order
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <select
                    name="item_name"
                    value={formData.item_name}
                    onChange={(e) => handleInputChange(index, e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Item</option>
                    {poItems.map((item, i) => (
                      <option key={i} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {poItems.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      No items available in this PO.
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimal Load Quantity ({unitDisplay}) *
                  </label>
                  <input
                    type="number"
                    name="minimal_load_quantity"
                    step="0.01"
                    max={poDetails?.remaining_quantity}
                    value={formData.minimal_load_quantity}
                    onChange={(e) => handleInputChange(index, e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={`Maximum: ${poDetails?.remaining_quantity} ${unitDisplay}`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {poDetails?.unit === "ton" &&
                      "💡 Enter in tons (price per ton)"}
                    {poDetails?.unit === "kubik" &&
                      "💡 Enter in cubic meters (volume-based)"}
                    {poDetails?.unit === "kilogram" &&
                      "💡 Enter in kilograms (weight-based)"}
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Price (Rp/{unitDisplay}) *
                  </label>
                  <input
                    type="number"
                    name="unit_price"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => handleInputChange(index, e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={`Enter price per ${unitDisplay}`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Set the negotiated price per {unitDisplay} for this delivery
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle with Assigned Driver *
                  </label>
                  <select
                    name="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={(e) => handleInputChange(index, e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.license_plate} - {v.type}{" "}
                        {v.driver_name && `- Driver: ${v.driver_name}`}
                      </option>
                    ))}
                  </select>
                  {vehicles.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      No available vehicles.
                    </p>
                  )}
                  {formData.vehicle_id && (
                    <div className="bg-gray-50 p-4 rounded-md mt-2">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Selected:
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Vehicle:</span>
                          <p className="font-medium">
                            {
                              getSelectedVehicle(formData.vehicle_id)
                                ?.license_plate
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Driver:</span>
                          <p className="font-medium">
                            {
                              getSelectedVehicle(formData.vehicle_id)
                                ?.driver_name
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trip Allowance (Rp) *
                    </label>
                    <input
                      type="number"
                      name="trip_allowance"
                      value={formData.trip_allowance}
                      onChange={(e) => handleInputChange(index, e)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Salary (Rp) *
                    </label>
                    <input
                      type="number"
                      name="gaji"
                      value={formData.gaji}
                      onChange={(e) => handleInputChange(index, e)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profit (Rp)
                    </label>
                    <input
                      type="number"
                      name="ongkosan"
                      value={formData.ongkosan}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      readOnly
                    />
                  </div>
                </div>

                {/* Gas Filling Information Section - Toggleable */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const newFormDataList = [...formDataList];
                      newFormDataList[index] = {
                        ...newFormDataList[index],
                        showGasFilling: !newFormDataList[index].showGasFilling
                      };
                      setFormDataList(newFormDataList);
                      
                      // If expanding and we have the data, calculate gas filling cost immediately
                      if (!formData.showGasFilling && formData.gas_volume_m3 && 
                          (formData.calculation_method === 'jisdor' || formData.calculation_method === 'fixed')) {
                        setTimeout(() => calculateGasFillingCost(newFormDataList[index], index), 100);
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                  >
                    {formData.showGasFilling ? '🔽 Hide' : '⛽ Add'} Gas Filling Details
                  </button>
                  
                  {formData.showGasFilling && (
                    <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">
                        ⛽ Gas Filling Information
                      </h4>
                      {currentJisdorRate && (
                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                          💡 Current JISDOR Rate: Rp {currentJisdorRate.toLocaleString('id-ID')} (automatically fetched from Bank Indonesia)
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gas Volume (m³)
                          </label>
                          <input
                            type="number"
                            name="gas_volume_m3"
                            value={formData.gas_volume_m3}
                            onChange={(e) => handleInputChange(index, e)}
                            step="0.01"
                            placeholder="100.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            SPBG Location
                          </label>
                          <select
                            name="spbg_location"
                            value={formData.spbg_location}
                            onChange={(e) => handleInputChange(index, e)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select SPBG Location</option>
                            {spbgLocations.map(location => (
                              <option key={location.value} value={location.value}>
                                {location.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Calculation Method
                          </label>
                          <select
                            name="calculation_method"
                            value={formData.calculation_method}
                            onChange={(e) => handleInputChange(index, e)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {calculationMethods.map(method => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* JISDOR Rate Input - Show only when JISDOR method is selected */}
                        {formData.calculation_method === 'jisdor' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              JISDOR Rate (IDR)
                              {jisdorLastUpdated && (
                                <span className="text-xs text-gray-500 ml-2">
                                  (Updated: {new Date(jisdorLastUpdated).toLocaleDateString()})
                                </span>
                              )}
                            </label>
                            <div className="flex gap-2">
                              <div className="flex-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-medium">
                                {currentJisdorRate ? (
                                  `Rp ${currentJisdorRate.toLocaleString('id-ID')}`
                                ) : (
                                  `Rp 16,364.42`
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={fetchJisdorRate}
                                disabled={jisdorLoading}
                                className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 ${
                                  jisdorLoading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title="Refresh JISDOR rate from Bank Indonesia"
                              >
                                {jisdorLoading ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            {currentJisdorRate && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Current rate from Bank Indonesia: Rp {currentJisdorRate.toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Fixed Rate Input - Show only when Fixed method is selected */}
                        {formData.calculation_method === 'fixed' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Fixed Rate (IDR per m³)
                            </label>
                            <input
                              type="number"
                              name="fixed_rate"
                              value={formData.fixed_rate}
                              onChange={(e) => handleInputChange(index, e)}
                              step="0.01"
                              min="0"
                              placeholder="7800"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter the fixed rate per cubic meter (m³)
                            </p>
                          </div>
                        )}

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Calculated Gas Filling Cost (IDR)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              name="gas_filling_cost"
                              value={formData.gas_filling_cost}
                              onChange={(e) => handleInputChange(index, e)}
                              step="0.01"
                              min="0"
                              max="999999999"
                              placeholder="Will be calculated automatically"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-blue-100 font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => calculateGasFillingCost(formData, index)}
                              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                              title="Recalculate gas filling cost"
                            >
                              🔄
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formData.calculation_method === 'jisdor' 
                              ? `Formula: (Volume/27.27) × 12.7 × JISDOR Rate${currentJisdorRate ? ` (Current: Rp ${currentJisdorRate.toLocaleString('id-ID')})` : ''}`
                              : `Fixed Rate: ${formData.fixed_rate || '7,800'} IDR per m³`
                            }
                          </p>
                        </div>
                      </div>

                      {/* Gas Filling Summary */}
                      {formData.gas_volume_m3 && formData.spbg_location && (
                        <div className="mt-3 p-3 bg-blue-100 rounded-lg border border-blue-300">
                          <h5 className="text-sm font-medium text-blue-900 mb-2">Gas Filling Summary</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-blue-700">Volume:</span>
                              <span className="ml-1 text-blue-900 font-medium">{formData.gas_volume_m3} m³</span>
                            </div>
                            <div>
                              <span className="text-blue-700">Location:</span>
                              <span className="ml-1 text-blue-900 font-medium">
                                {spbgLocations.find(loc => loc.value === formData.spbg_location)?.label}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-700">Method:</span>
                              <span className="ml-1 text-blue-900 font-medium capitalize">
                                {formData.calculation_method}
                                {formData.calculation_method === 'jisdor' && currentJisdorRate && (
                                  <span className="text-xs text-blue-600 ml-1">
                                    (Rp {currentJisdorRate.toLocaleString('id-ID')})
                                  </span>
                                )}
                                {formData.calculation_method === 'fixed' && formData.fixed_rate && (
                                  <span className="text-xs text-blue-600 ml-1">
                                    (Rp {parseFloat(formData.fixed_rate).toLocaleString('id-ID')}/m³)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-700">Cost:</span>
                              <span className="ml-1 text-blue-900 font-medium">
                                {formData.gas_filling_cost ? `Rp ${parseFloat(formData.gas_filling_cost).toLocaleString('id-ID')}` : 'Calculating...'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Debug Information */}
                          {formData.gas_volume_m3 && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                              <div>🔍 Debug: Volume: {formData.gas_volume_m3} m³</div>
                              {formData.calculation_method === 'jisdor' ? (
                                <>
                                  <div>JISDOR Rate: {formData.jisdor_rate || currentJisdorRate || 'Not set'} IDR</div>
                                  <div>Formula: ({formData.gas_volume_m3}/27.27) × 12.7 × {formData.jisdor_rate || currentJisdorRate || '?'}</div>
                                  <div>Expected Cost: {(() => {
                                    const volume = parseFloat(formData.gas_volume_m3);
                                    const rate = parseFloat(formData.jisdor_rate) || currentJisdorRate;
                                    if (volume && rate) {
                                      return `Rp ${Math.round((volume / 27.27) * 12.7 * rate * 100) / 100}`;
                                    }
                                    return 'Cannot calculate';
                                  })()}</div>
                                </>
                              ) : (
                                <>
                                  <div>Fixed Rate: {formData.fixed_rate || '7,800'} IDR per m³</div>
                                  <div>Formula: {formData.gas_volume_m3} × {formData.fixed_rate || '7,800'}</div>
                                  <div>Expected Cost: {(() => {
                                    const volume = parseFloat(formData.gas_volume_m3);
                                    const rate = parseFloat(formData.fixed_rate) || 7800;
                                    if (volume && rate) {
                                      return `Rp ${Math.round(volume * rate * 100) / 100}`;
                                    }
                                    return 'Cannot calculate';
                                  })()}</div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {formData.minimal_load_quantity && formData.unit_price && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Revenue Calculation
                    </h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span>
                          {formData.minimal_load_quantity} {unitDisplay}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unit Price:</span>
                        <span>
                          Rp{" "}
                          {parseFloat(formData.unit_price).toLocaleString(
                            "id-ID"
                          )}
                          /{unitDisplay}
                        </span>
                      </div>
                      <div className="flex justify-between text-blue-600">
                        <span>Calculation:</span>
                        <span>
                          {formData.minimal_load_quantity} {unitDisplay} × Rp{" "}
                          {parseFloat(formData.unit_price).toLocaleString(
                            "id-ID"
                          )}
                          /{unitDisplay}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Total Revenue:</span>
                        <span>
                          Rp{" "}
                          {calculateTotalAmount(
                            parseFloat(formData.minimal_load_quantity) || 0,
                            parseFloat(formData.unit_price) || 0,
                            poDetails?.unit || "ton"
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      
                      {/* Gas Filling Cost in Revenue Calculation */}
                      {formData.gas_filling_cost && parseFloat(formData.gas_filling_cost) > 0 && (
                        <div className="flex justify-between text-red-600 border-t pt-1">
                          <span>Gas Filling Cost:</span>
                          <span>
                            - Rp {parseFloat(formData.gas_filling_cost).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Net Profit:</span>
                        <span>
                          Rp{" "}
                          {calculateOngkosan(
                            formData,
                            poDetails?.unit
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Load Location *
                  </label>
                  <textarea
                    name="load_location"
                    value={formData.load_location}
                    onChange={(e) => handleInputChange(index, e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    required
                    placeholder="Enter or select on map"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleProcessLocationLink(
                          "load",
                          formData.load_location
                        )
                      }
                      disabled={linkProcessing.load}
                      className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded w-full"
                    >
                      {linkProcessing.load
                        ? "Processing..."
                        : "📌 Extract from Google Maps Link"}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Paste Google Maps link or address. Shortened links will
                      open in browser.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFormIndex(index);
                      setSelectedLocationType("load");
                    }}
                    className={`mt-2 px-3 py-1 rounded text-sm w-full ${
                      selectedLocationType === "load" && currentFormIndex === index
                        ? "bg-blue-500 text-white animate-pulse"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    {showMap &&
                      (selectedLocationType === "load" && currentFormIndex === index
                        ? "Click on map..."
                        : "Set Load Location")}
                  </button>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unload Location *
                  </label>
                  <textarea
                    name="unload_location"
                    value={formData.unload_location}
                    onChange={(e) => handleInputChange(index, e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    required
                    placeholder="Enter or select on map"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleProcessLocationLink(
                          "unload",
                          formData.unload_location
                        )
                      }
                      disabled={linkProcessing.unload}
                      className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded w-full"
                    >
                      {linkProcessing.unload
                        ? "Processing..."
                        : "📌 Extract from Google Maps Link"}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Paste Google Maps link or address. Shortened links will
                      open in browser.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFormIndex(index);
                      setSelectedLocationType("unload");
                    }}
                    className={`mt-2 px-3 py-1 rounded text-sm w-full ${
                      selectedLocationType === "unload" && currentFormIndex === index
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    {showMap &&
                      (selectedLocationType === "unload" && currentFormIndex === index
                        ? "Click on map..."
                        : "Set Unload Location")}
                  </button>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addForm}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              + Add Another Delivery Order
            </button>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(`/trips/po/${poId}`)}
                className="px-6 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  formDataList.some(
                    (f) => !f.vehicle_id || !f.item_name || !f.unit_price
                  )
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? "Creating..." : "Create Order"}
              </button>
            </div>
          </form>
        </div>

        {showMap && (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Location Map</h3>
            <div className="h-96 w-full">
              <MapContainer
                center={
                  markers.length > 0
                    ? [
                        markers[markers.length - 1].lat,
                        markers[markers.length - 1].lng,
                      ]
                    : [defaultCenter.lat, defaultCenter.lng]
                }
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                <SearchControlComponent onLocationFound={handleSearchSelect} />
                <MapClickHandler 
                  selectedLocationType={selectedLocationType}
                  onLocationSelect={(lat, lng, address) => {
                    if (selectedLocationType) {
                      setLocationWithType(lat, lng, address, selectedLocationType);
                    }
                  }}
                  onClearSelection={() => setSelectedLocationType(null)}
                />
                {markers.map((m: MarkerType, i: number) => (
                  <Marker
                    key={i}
                    position={[m.lat, m.lng]}
                    icon={m.type === "load" ? loadIcon : unloadIcon}
                  >
                    <Popup>{m.title}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p className="font-semibold">
                💡 Click a "Set Location" button, then use the search bar or
                click the map.
              </p>
              {selectedLocationType && (
                <p className="text-blue-600 mt-2">
                  🎯 Ready to set {selectedLocationType} location for form {currentFormIndex + 1}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateDeliveryFromPO;