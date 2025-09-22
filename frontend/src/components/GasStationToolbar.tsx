import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { GasStationApi, CreateGasStationRequest, GasStation } from '../api/gasStationApi';
import toast from 'react-hot-toast';

interface GasStationToolbarProps {
  onGasStationsUpdate?: (gasStations: GasStation[]) => void;
  onMarkerAdded?: (gasStation: GasStation) => void;
  onMarkerDeleted?: (gasStationId: number) => void;
  gasStations: GasStation[];
  editMode: boolean;
  onEditModeChange: (editMode: boolean) => void;
}

interface GasStationFormData {
  name: string;
  address: string;
  phone: string;
  operating_hours: string;
  notes: string;
}

const GasStationToolbar: React.FC<GasStationToolbarProps> = ({
  onGasStationsUpdate,
  onMarkerAdded,
  onMarkerDeleted,
  gasStations,
  editMode,
  onEditModeChange
}) => {
  const map = useMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [formData, setFormData] = useState<GasStationFormData>({
    name: '',
    address: '',
    phone: '',
    operating_hours: '24/7',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create gas station icon
  const createGasStationIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          width: 32px; 
          height: 32px; 
          background: #FF6B6B; 
          border: 2px solid white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          font-size: 16px;
        ">
          ⛽
        </div>
      `,
      className: 'gas-station-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  useEffect(() => {
    if (!map || !map.getContainer()) return;

    try {
      // Initialize drawn items layer
      if (!drawnItemsRef.current) {
        drawnItemsRef.current = new L.FeatureGroup();
        map.addLayer(drawnItemsRef.current);
      }

      // Only create draw control if in edit mode
      if (editMode && !drawControlRef.current) {
        const drawControl = new L.Control.Draw({
          position: 'topright',
          draw: {
            polyline: false,
            polygon: false,
            circle: false,
            rectangle: false,
            circlemarker: false,
            marker: {
              icon: createGasStationIcon()
            }
          },
          edit: {
            featureGroup: drawnItemsRef.current!,
            remove: true
          }
        });

        drawControlRef.current = drawControl;
        map.addControl(drawControl);
      } else if (!editMode && drawControlRef.current) {
        // Remove draw control when not in edit mode
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }

      // Handle draw events
      const handleDrawCreated = (e: any) => {
        const { layer } = e;
        const { lat, lng } = layer.getLatLng();
        
        // Store the pending location and show form
        setPendingLocation({ lat, lng });
        setShowForm(true);
      };

      const handleDrawDeleted = async (e: any) => {
        const layers = e.layers;
        layers.eachLayer(async (layer: any) => {
          const gasStationId = layer.gasStationId;
          if (gasStationId) {
            try {
              await GasStationApi.deleteGasStation(gasStationId);
              toast.success('Gas station deleted successfully');
              
              if (onMarkerDeleted) {
                onMarkerDeleted(gasStationId);
              }
              
              // Refresh gas stations list
              await refreshGasStations();
            } catch (error) {
              console.error('Error deleting gas station:', error);
              toast.error('Failed to delete gas station');
            }
          }
        });
      };

      map.on(L.Draw.Event.CREATED, handleDrawCreated);
      map.on(L.Draw.Event.DELETED, handleDrawDeleted);

      return () => {
        map.off(L.Draw.Event.CREATED, handleDrawCreated);
        map.off(L.Draw.Event.DELETED, handleDrawDeleted);
        
        if (drawControlRef.current) {
          try {
            map.removeControl(drawControlRef.current);
          } catch (error) {
            console.warn('Error removing draw control:', error);
          }
          drawControlRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error in GasStationToolbar useEffect:', error);
    }
  }, [map, editMode]);

  // Add existing gas stations to the drawn items layer
  useEffect(() => {
    if (!drawnItemsRef.current || !map || !map.getContainer()) return;

    try {
      // Clear existing markers
      drawnItemsRef.current.clearLayers();

      // Add gas station markers to the drawn items layer
      gasStations.forEach(gasStation => {
        const marker = L.marker([gasStation.latitude, gasStation.longitude], {
          icon: createGasStationIcon()
        });

        // Store gas station ID for deletion
        (marker as any).gasStationId = gasStation.id;

        // Add popup with gas station info
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #2563eb; font-weight: bold;">
              ${gasStation.name}
            </h4>
            <div style="font-size: 12px; color: #666; line-height: 1.4;">
              ${gasStation.address ? `<div><strong>Address:</strong> ${gasStation.address}</div>` : ''}
              ${gasStation.phone ? `<div><strong>Phone:</strong> ${gasStation.phone}</div>` : ''}
              ${gasStation.operating_hours ? `<div><strong>Hours:</strong> ${gasStation.operating_hours}</div>` : ''}
              <div><strong>Type:</strong> ${gasStation.station_type}</div>
              ${gasStation.notes ? `<div><strong>Notes:</strong> ${gasStation.notes}</div>` : ''}
            </div>
          </div>
        `);

        drawnItemsRef.current!.addLayer(marker);
      });
    } catch (error) {
      console.error('Error adding gas station markers:', error);
    }
  }, [gasStations, map]);

  const refreshGasStations = async () => {
    try {
      const response = await GasStationApi.getAllGasStations();
      if (response.success && onGasStationsUpdate) {
        onGasStationsUpdate(response.data);
      }
    } catch (error) {
      console.error('Error refreshing gas stations:', error);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLocation) return;

    setIsSubmitting(true);
    try {
      const gasStationData: CreateGasStationRequest = {
        name: formData.name,
        latitude: pendingLocation.lat,
        longitude: pendingLocation.lng,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        operating_hours: formData.operating_hours || undefined,
        notes: formData.notes || undefined,
        station_type: 'CNG' // Default to CNG
      };

      const response = await GasStationApi.createGasStation(gasStationData);
      
      if (response.success) {
        toast.success('Gas station added successfully!');
        
        if (onMarkerAdded) {
          onMarkerAdded(response.data);
        }
        
        // Reset form and close
        setFormData({
          name: '',
          address: '',
          phone: '',
          operating_hours: '24/7',
          notes: ''
        });
        setShowForm(false);
        setPendingLocation(null);
        
        // Refresh gas stations list
        await refreshGasStations();
      }
    } catch (error: any) {
      console.error('Error creating gas station:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add gas station';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setPendingLocation(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      operating_hours: '24/7',
      notes: ''
    });
  };

  return (
    <>

      {/* Gas Station Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Gas Station</h3>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CNG Station Jakarta Pusat"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full address of the station"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contact phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={formData.operating_hours}
                  onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 24/7 or 06:00 - 22:00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes or special instructions"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : 'Add Station'}
                </button>
                <button
                  type="button"
                  onClick={handleFormCancel}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GasStationToolbar;
