// mobile/app/(tabs)/index.tsx

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import apiClient, { updateDeliveryStatus, uploadNotaPhoto, completeLocation, checkProximityForDeliveryOrder } from "../../src/services/api";
import { useAuth } from "../../src/contexts/AuthContext";
import { FontAwesome5 } from "@expo/vector-icons";

// === UPDATED INTERFACES ===
interface Vehicle {
  id: number;
  license_plate: string;
  type: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
}

interface DeliveryOrder {
  id: number;
  do_number: string;
  customer_name: string;
  item_name: string;
  actual_load_quantity?: number;
  status:
    | "assigned"
    | "at_spbu"
    | "otw_to_unload_location"
    | "at_unload_location"
    | "completed"
    | "cancelled";
  load_location: string;
  unload_location: string;
  load_latitude?: string;
  load_longitude?: string;
  unload_latitude?: string;
  unload_longitude?: string;
  additional_unload_locations?: Array<{location: string, latitude?: number, longitude?: number}>;
  location_documentation?: Array<{
    location_index: number;
    location_name: string;
    photos: string[];
    completed: boolean;
    uploaded_at: string;
    completed_at?: string;
  }>;
  purchaseOrder?: PurchaseOrder;
  vehicle?: Vehicle;
  trip_allowance: number;
  gaji: number;
  expenses_total: number;
  remaining_allowance: number;
  financial_summary?: {
    trip_allowance: number;
    gaji: number;
    total_for_driver: number;
    expenses_total: number;
    remaining_allowance: number;
  };
  created_at: string;
  driver_name?: string;
  unit: 'kilogram' | 'ton' | 'kubik';  status_auto_updated_at?: string; // Timestamp when status was auto-updated
}

const DriverDashboard = () => {
  const router = useRouter();
  const { signOut } = useAuth();
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [currentLocationIndex, setCurrentLocationIndex] = useState<{[orderId: number]: number}>({});
  const [proximityChecks, setProximityChecks] = useState<{[orderId: number]: {isNear: boolean, canProceed: boolean}}>({});

  const fetchMyTasks = async () => {
    try {
      const response = await apiClient.get<DeliveryOrder[]>(
        `/delivery-orders/me?t=${Date.now()}`
      );
      console.log('Fetched delivery orders:', response.data.map(order => ({
        id: order.id,
        location_documentation: order.location_documentation
      })));
      
      setDeliveryOrders(response.data);
      
      // Initialize current location index for orders with multiple locations
      const newLocationIndex: {[orderId: number]: number} = {};
      response.data.forEach(order => {
        if (hasMultipleCustomerLocations(order)) {
          // Check if there's existing location documentation to determine current index
          const locationDocs = order.location_documentation || [];
          const completedCount = locationDocs.filter(doc => doc.completed === true).length;
          console.log(`Order ${order.id} location docs:`, locationDocs, `completed count: ${completedCount}`);
          newLocationIndex[order.id] = completedCount;
        }
      });
      setCurrentLocationIndex(prev => ({ ...prev, ...newLocationIndex }));
      
      setError(null);
    } catch (err: any) {
      console.error(
        "Error fetching delivery orders:",
        err.response?.data || err.message
      );
      setError("Gagal memuat tugas. Tarik ke bawah untuk muat ulang.");
      if (err.response?.status === 401) {
        signOut();
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const getUnitDisplay = (unit: DeliveryOrder['unit']) => {
    const unitMap = {
      kilogram: "kg",
      ton: "ton",
      kubik: "m³",
    };
    return unitMap[unit] || unit;
  };

  const handleUpdateStatus = async (orderId: number, action: string) => {
    console.log(`handleUpdateStatus called for order ${orderId}, action: ${action}`);
    
    // Special handling for arrive_at_unload - directly update status (no modal)
    if (action === "arrive_at_unload") {
      console.log(`Directly updating status to arrive_at_unload for order ${orderId}`);
      setUpdatingStatus(orderId);
      try {
        await updateDeliveryStatus(orderId, action);
        await fetchMyTasks(); // Refresh data
        Alert.alert("Berhasil", "Berhasil tiba di lokasi pelanggan");
      } catch (err: any) {
        console.error(`Error updating status for order ${orderId}:`, err);
        const errorMessage = err.response?.data?.details || err.response?.data?.message || err.message || "Gagal memperbarui status";
        Alert.alert("Error", errorMessage);
      } finally {
        setUpdatingStatus(null);
      }
      return;
    }

    // Special handling for upload_nota - directly process location (no modal)
    if (action === "upload_nota") {
      console.log(`Directly processing location for order ${orderId}`);
      setUpdatingStatus(orderId);
      try {
        // Find the selected order to get location context
        const selectedOrder = deliveryOrders.find(order => order.id === orderId);
        if (!selectedOrder) {
          throw new Error("Order tidak ditemukan");
        }

        const currentIndex = getCurrentLocationIndex(orderId);
        const currentLocationName = getAllCustomerLocations(selectedOrder)[currentIndex]?.location || `Lokasi ${currentIndex + 1}`;
        
        // Process location without photos (since photos are now optional)
        await (uploadNotaPhoto as any)(orderId, [], currentIndex, currentLocationName);
        await fetchMyTasks(); // Refresh data
        
        Alert.alert("Berhasil", `Lokasi ${currentLocationName} berhasil diproses`);
      } catch (err: any) {
        console.error(`Error processing location for order ${orderId}:`, err);
        const errorMessage = err.response?.data?.details || err.response?.data?.message || err.message || "Gagal memproses lokasi";
        Alert.alert("Error", errorMessage);
      } finally {
        setUpdatingStatus(null);
      }
      return;
    }

    // Special handling for next_customer - complete current location and move to next
    if (action === "next_customer") {
      console.log(`Calling handleNextCustomer for order ${orderId}`);
      await handleNextCustomer(orderId);
      return;
    }

    setUpdatingStatus(orderId);
    try {
      await updateDeliveryStatus(orderId, action);
      await fetchMyTasks(); // Refresh data

      // Show success message
      const messages = {
        start: "Berhasil memulai perjalanan ke SPBU",
        arrive_at_spbu: "Berhasil tiba di SPBU",
        depart_spbu: "Berhasil berangkat dari SPBU",
        arrive_at_unload: "Berhasil tiba di Pelanggan.",
        start_return: "Tugas berhasil diselesaikan",
        complete: "Tugas berhasil diselesaikan",
      };

      Alert.alert(
        "Berhasil",
        messages[action as keyof typeof messages] ||
          "Status berhasil diperbarui"
      );
    } catch (err: any) {
      console.error(
        `Error updating status for order ${orderId}:`,
        err.response?.data || err.message
      );
      const errorMessage = err.response?.data?.details || err.response?.data?.message || err.message || "Gagal memperbarui status. Silakan coba lagi.";
      Alert.alert("Error", errorMessage);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleNextCustomer = async (orderId: number) => {
    setUpdatingStatus(orderId);
    try {
      // Get the current location index for this order
      const currentIndex = getCurrentLocationIndex(orderId);
      console.log(`Completing location ${currentIndex} for order ${orderId}`);
      
      // Complete the current location
      const response = await completeLocation(orderId, currentIndex);
      console.log('Complete location response:', response.data);
      console.log('Response location_documentation:', response.data.data?.location_documentation);
      console.log('Response has_more_locations:', response.data.data?.has_more_locations);
      
      // Log the detailed location documentation
      if (response.data.data?.location_documentation) {
        response.data.data.location_documentation.forEach((doc: any, index: number) => {
          console.log(`Response doc ${index}:`, {
            location_index: doc.location_index,
            location_name: doc.location_name,
            completed: doc.completed,
            completed_type: typeof doc.completed,
            photos: doc.photos,
            uploaded_at: doc.uploaded_at,
            completed_at: doc.completed_at
          });
        });
      }
      
      // Update the current location index to the next location
      setCurrentLocationIndex(prev => ({
        ...prev,
        [orderId]: currentIndex + 1
      }));
      
      // Refresh data to get updated location documentation
      await fetchMyTasks();
      
      // Log the updated order data after refresh
      const updatedOrder = deliveryOrders.find(order => order.id === orderId);
      if (updatedOrder) {
        console.log(`Order ${orderId} after refresh:`, {
          location_documentation: updatedOrder.location_documentation,
          hasMultiple: hasMultipleCustomerLocations(updatedOrder),
          hasMore: hasMoreCustomerLocations(updatedOrder)
        });
      }

      // Get current location info for better messaging
      const allOrderLocations = getAllCustomerLocations(deliveryOrders.find(o => o.id === orderId)!);
      const completedLocation = allOrderLocations[currentIndex];
      const nextLocation = allOrderLocations[currentIndex + 1];
      
      if (response.data.has_more_locations) {
        Alert.alert(
          "Berhasil",
          `Lokasi "${completedLocation?.location || `Lokasi ${currentIndex + 1}`}" selesai. Selanjutnya menuju "${nextLocation?.location || `Lokasi ${currentIndex + 2}`}".`
        );
      } else {
        Alert.alert(
          "Berhasil", 
          `Semua lokasi selesai! Tugas "${deliveryOrders.find(o => o.id === orderId)?.do_number}" dapat diselesaikan sekarang.`
        );
      }
    } catch (err: any) {
      console.error('Error in handleNextCustomer:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.message || err.message || "Gagal menyelesaikan lokasi";
      Alert.alert("Error", errorMessage);
    } finally {
      setUpdatingStatus(null);
    }
  };



  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchMyTasks();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyTasks();
  }, []);

  // Helper function to check if order has multiple customer locations
  const hasMultipleCustomerLocations = (order: DeliveryOrder) => {
    return order.additional_unload_locations && order.additional_unload_locations.length > 0;
  };

  // Helper function to get current location index for an order
  const getCurrentLocationIndex = (orderId: number) => {
    const order = deliveryOrders.find(o => o.id === orderId);
    
    console.log(`🔍 getCurrentLocationIndex for order ${orderId}:`, {
      hasLocationDocs: !!(order?.location_documentation && order.location_documentation.length > 0),
      locationDocs: order?.location_documentation,
      allLocations: order ? getAllCustomerLocations(order) : []
    });
    
    // If there's location documentation from backend, use that to determine current location
    if (order?.location_documentation && order.location_documentation.length > 0) {
      const allLocations = getAllCustomerLocations(order);
      let currentIndex = 0;
      
      for (let i = 0; i < allLocations.length; i++) {
        const locationDoc = order.location_documentation.find(doc => doc.location_index === i);
        console.log(`🔍 Location ${i}:`, {
          hasDoc: !!locationDoc,
          hasPhotos: !!(locationDoc?.photos && locationDoc.photos.length > 0),
          photosCount: locationDoc?.photos?.length || 0,
          completed: locationDoc?.completed,
          doc: locationDoc
        });
        
        // If this location is completed, move to next
        if (locationDoc && (locationDoc.completed === true || String(locationDoc.completed) === 'true' || Number(locationDoc.completed) === 1)) {
          console.log(`🔍 Location ${i} is completed, moving to next location`);
          continue; // Continue to next location
        }
        
        // If we reach here, this is the current active location (either no doc, no photos, or has photos but not completed)
        currentIndex = i;
        console.log(`🔍 Setting currentIndex to ${currentIndex} for location ${i}`);
        break;
      }
      
      console.log(`Order ${orderId} - calculated current index: ${currentIndex} from location docs`);
      return Math.min(currentIndex, allLocations.length - 1);
    }
    
    // Fallback to local state
    const localIndex = currentLocationIndex[orderId] || 0;
    console.log(`Order ${orderId} - using local index: ${localIndex}`);
    return localIndex;
  };

  // Helper function to get all customer locations for an order
  const getAllCustomerLocations = (order: DeliveryOrder) => {
    const locations = [];
    
    // Add primary unload location
    if (order.unload_location && order.unload_latitude && order.unload_longitude) {
      locations.push({
        location: order.unload_location,
        latitude: parseFloat(order.unload_latitude),
        longitude: parseFloat(order.unload_longitude),
      });
    }
    
    // Add additional unload locations
    if (order.additional_unload_locations) {
      order.additional_unload_locations.forEach((loc) => {
        if (loc.location && loc.latitude && loc.longitude) {
          locations.push({
            location: loc.location,
            latitude: loc.latitude,
            longitude: loc.longitude,
          });
        }
      });
    }
    
    return locations;
  };

  // Helper function to check if there are more locations for an order
  const hasMoreCustomerLocations = (order: DeliveryOrder) => {
    const allLocations = getAllCustomerLocations(order);
    const currentIndex = getCurrentLocationIndex(order.id);
    
    console.log(`Checking hasMoreCustomerLocations for order ${order.id}:`, {
      totalLocations: allLocations.length,
      currentIndex,
      locationDocs: order.location_documentation
    });
    
    // If there's location documentation from backend, use that to determine if there are more locations
    if (order.location_documentation && order.location_documentation.length > 0) {
      console.log('Location docs details:', order.location_documentation.map(doc => ({
        location_index: doc.location_index,
        completed: doc.completed,
        completed_type: typeof doc.completed,
        photos: doc.photos?.length || 0,
        full_doc: doc
      })));
      
      // Check if all locations have been completed
      let allCompleted = true;
      for (let i = 0; i < allLocations.length; i++) {
        const locationDoc = order.location_documentation.find(doc => doc.location_index === i);
        const isCompleted = locationDoc && (
          locationDoc.completed === true || 
          String(locationDoc.completed) === 'true' || 
          Number(locationDoc.completed) === 1
        );
        if (!isCompleted) {
          allCompleted = false;
          break;
        }
      }
      
      const hasMore = !allCompleted;
      console.log(`Using location docs: allCompleted=${allCompleted}, hasMore=${hasMore}`);
      return hasMore;
    }
    
    // Fallback to checking current index - there are more locations if current index is not the last one
    const hasMore = currentIndex < allLocations.length - 1;
    console.log(`Using fallback: currentIndex=${currentIndex}, total=${allLocations.length}, hasMore=${hasMore}`);
    return hasMore;
  };

  // Check if status was recently auto-updated (within cooldown period)
  const isStatusRecentlyAutoUpdated = (order: DeliveryOrder): boolean => {
    if (!order.status_auto_updated_at) return false;
    
    const autoUpdatedAt = new Date(order.status_auto_updated_at);
    const now = new Date();
    const cooldownMinutes = 5; // Match backend cooldown
    const cooldownMs = cooldownMinutes * 60 * 1000;
    
    return (now.getTime() - autoUpdatedAt.getTime()) < cooldownMs;
  };

  // Check proximity for orders that need it
  const checkProximity = useCallback(async (orderId: number, status: string) => {
    // Only check for statuses that require proximity validation
    if (status !== "at_spbu" && status !== "otw_to_unload_location") {
      return;
    }

    try {
      const response = await checkProximityForDeliveryOrder(orderId);
      const proximityData = response.data;
      
      setProximityChecks(prev => ({
        ...prev,
        [orderId]: {
          isNear: proximityData.isNear || false,
          canProceed: proximityData.canProceed !== false // Default to true if not specified
        }
      }));
    } catch (error) {
      console.error(`Error checking proximity for order ${orderId}:`, error);
      // On error, allow proceeding (fail open)
      setProximityChecks(prev => ({
        ...prev,
        [orderId]: {
          isNear: false,
          canProceed: true
        }
      }));
    }
  }, []);

  // Check proximity when orders are fetched
  useEffect(() => {
    deliveryOrders.forEach(order => {
      if (order.status === "at_spbu" || order.status === "otw_to_unload_location") {
        checkProximity(order.id, order.status);
      }
    });
  }, [deliveryOrders, checkProximity]);

  // === NEW STATUS ACTIONS MAPPING ===
  const getStatusActions = (order: DeliveryOrder) => {
    const isUpdating = updatingStatus === order.id;
    const isAutoUpdated = isStatusRecentlyAutoUpdated(order);
    const proximityCheck = proximityChecks[order.id];
    const isNotNear = proximityCheck && !proximityCheck.canProceed;

    switch (order.status) {
      case "assigned":
        return {
          action: "start",
          label: isAutoUpdated ? "Status Diperbarui Otomatis" : "Mulai Perjalanan ke SPBU",
          icon: "play-circle",
          color: isAutoUpdated ? "#95a5a6" : "#3498db",
          disabled: isUpdating || isAutoUpdated,
        };
      case "at_spbu":
        return {
          action: "navigate_to_confirm",
          label: isNotNear ? "Anda Belum di SPBU" : "Konfirmasi Muatan & Berangkat",
          icon: "clipboard-check",
          color: isNotNear ? "#95a5a6" : "#e67e22",
          disabled: isNotNear, // Disable if not near SPBU
          special: true, // This will navigate to detail page
        };
      case "otw_to_unload_location":
        return {
          action: "arrive_at_unload",
          label: isNotNear ? "Anda Belum di Lokasi Pelanggan" : (isAutoUpdated ? "Status Diperbarui Otomatis" : "Tiba di lokasi pelanggan."),
          icon: "map-marker-alt",
          color: (isNotNear || isAutoUpdated) ? "#95a5a6" : "#9b59b6",
          disabled: isUpdating || isAutoUpdated || isNotNear, // Disable if not near customer location
        };
      case "at_unload_location":
        // Check if this order has multiple customer locations and if there are more locations to complete
        const hasMultiple = hasMultipleCustomerLocations(order);
        const hasMore = hasMoreCustomerLocations(order);
        console.log(`Order ${order.id} at_unload_location: hasMultiple=${hasMultiple}, hasMore=${hasMore}`);
        
        if (hasMultiple && hasMore) {
          // Check if current location has been processed (photos optional, but location documented)
          const currentIndex = getCurrentLocationIndex(order.id);
          const currentLocationDocs = order.location_documentation || [];
          const currentLocationDoc = currentLocationDocs.find(doc => doc.location_index === currentIndex);
          const hasPhotos = currentLocationDoc && currentLocationDoc.photos && currentLocationDoc.photos.length > 0;
          const isProcessed = currentLocationDoc && currentLocationDoc.uploaded_at; // Location has been processed (with or without photos)
          
          console.log(`Order ${order.id} at_unload_location status check:`, {
            currentIndex,
            hasPhotos,
            isProcessed,
            hasMultiple,
            hasMore,
            totalDocs: currentLocationDocs.length,
            currentDoc: currentLocationDoc
          });
          console.log(`Order ${order.id} location docs:`, JSON.stringify(currentLocationDocs, null, 2));
          console.log(`Order ${order.id} current location doc:`, JSON.stringify(currentLocationDoc, null, 2));
          
          if (isProcessed) {
            console.log(`Order ${order.id} returning next_customer action - location already processed`);
            // Location already processed (with or without photos), show next location button
            const allLocations = getAllCustomerLocations(order);
            const isLastLocation = currentIndex >= allLocations.length - 1;
            
            return {
              action: "next_customer",
              label: isLastLocation ? "Selesaikan Semua Lokasi" : "Menuju Lokasi Berikutnya",
              icon: "arrow-right",
              color: "#f39c12",
              disabled: isUpdating,
            };
          } else {
            console.log(`Order ${order.id} returning upload_nota action - location not processed yet`);
            // Location not processed yet, show upload nota option (photos optional)
            const allLocations = getAllCustomerLocations(order);
            const currentLocation = allLocations[currentIndex];
            const locationName = currentLocation?.location || `Lokasi ${currentIndex + 1}`;
            
            return {
              action: "upload_nota",
              label: `Proses Lokasi - ${locationName}`,
              icon: "check-circle",
              color: "#9b59b6",
              disabled: isUpdating,
            };
          }
        } else {
          console.log(`Order ${order.id} returning start_return action`);
          // Single location or all locations completed - complete task directly
          return {
            action: "start_return",
            label: "Selesaikan Tugas",
            icon: "check-circle",
            color: "#27ae60",
            disabled: isUpdating,
          };
        }
      default:
        return null;
    }
  };

  const renderActionButtons = (order: DeliveryOrder) => {
    const actionConfig = getStatusActions(order);

    if (!actionConfig) return null;

    const handlePress = () => {
      // Prevent action if button is disabled
      if (actionConfig.disabled) {
        console.log(`Button disabled for order ${order.id}`);
        return;
      }

      console.log(`Button pressed for order ${order.id}, action: ${actionConfig.action}`);
      if (actionConfig.special) {
        // Navigate to detail page for load confirmation
        router.push(`/trip-detail/${order.id}`);
      } else {
        handleUpdateStatus(order.id, actionConfig.action);
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.actionButton, 
          { backgroundColor: actionConfig.color },
          actionConfig.disabled && styles.disabledButton
        ]}
        onPress={handlePress}
        disabled={actionConfig.disabled}
        activeOpacity={actionConfig.disabled ? 1 : 0.7}
      >
        {updatingStatus === order.id ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <FontAwesome5 name={actionConfig.icon} size={16} color="white" />
        )}
        <Text style={styles.actionButtonText}>{actionConfig.label}</Text>
      </TouchableOpacity>
    );
  };

  // Helper to get status badge background color
  const getStatusColor = (status: DeliveryOrder["status"]) => {
    switch (status) {
      case "assigned":
        return { backgroundColor: "#6c757d" };
      case "at_spbu":
        return { backgroundColor: "#3498db" };
      case "otw_to_unload_location":
        return { backgroundColor: "#e67e22" };
      case "at_unload_location":
        return { backgroundColor: "#9b59b6" };
      case "completed":
        return { backgroundColor: "#27ae60" };
      case "cancelled":
        return { backgroundColor: "#e74c3c" };
      default:
        return { backgroundColor: "#95a5a6" };
    }
  };

  // Helper to get status text
  const getStatusText = (status: DeliveryOrder["status"]) => {
    switch (status) {
      case "assigned":
        return "DITUGASKAN";
      case "at_spbu":
        return "DI SPBU";
      case "otw_to_unload_location":
        return "MENUJU BONGKAR";
      case "at_unload_location":
        return "DI LOK. BONGKAR";
      case "completed":
        return "SELESAI";
      case "cancelled":
        return "BATAL";
      default:
        return "UNKNOWN";
    }
  };

  const renderTaskItem = ({ item }: { item: DeliveryOrder }) => {
    const isCompleted = item.status === "completed";
    const actionConfig = getStatusActions(item);
    const isButtonDisabled = actionConfig?.disabled || false;
    
    // Only allow card navigation if button is not disabled (or if there's no action button)
    const handleCardPress = () => {
      // If button is disabled due to proximity, prevent navigation and show alert
      if (isButtonDisabled && actionConfig) {
        const proximityCheck = proximityChecks[item.id];
        if (proximityCheck && !proximityCheck.canProceed) {
          Alert.alert(
            "Lokasi Tidak Sesuai",
            actionConfig.label || "Anda belum berada di lokasi yang tepat. Harap mendekati lokasi terlebih dahulu.",
            [{ text: "OK" }]
          );
          return; // Prevent navigation
        }
        // If disabled for other reasons (like auto-updated), still allow navigation
      }
      // Allow navigation for completed trips or when button is not disabled
      router.push(`/trip-detail/${item.id}`);
    };

    return (
      <TouchableOpacity
        onPress={handleCardPress}
        style={[
          styles.card, 
          isCompleted && styles.completedCard,
          isButtonDisabled && actionConfig && styles.cardDisabled
        ]}
        activeOpacity={isButtonDisabled && actionConfig ? 1 : 0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.doNumber}>{item.do_number}</Text>
          <View style={[styles.statusBadge, getStatusColor(item.status)]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          {isCompleted && (
            <FontAwesome5
              name="check-circle"
              size={20}
              color="#27ae60"
              style={{ marginLeft: 8 }}
            />
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.itemDetails}>
            {item.item_name}
            {item.actual_load_quantity &&
              ` → ${item.actual_load_quantity} ${getUnitDisplay(item.unit)} (aktual)`}
          </Text>
          <View style={styles.locationContainer}>
            <FontAwesome5 name="arrow-up" size={14} color="#3498db" />
            <Text style={styles.locationText}>{item.load_location}</Text>
          </View>
          <View style={styles.locationContainer}>
            <FontAwesome5 name="arrow-down" size={14} color="#e74c3c" />
            <Text style={styles.locationText}>
              {item.unload_location}
              {hasMultipleCustomerLocations(item) && (
                <Text style={styles.multipleLocationsHint}>
                  {' '}(+{item.additional_unload_locations!.length} lokasi lagi)
                </Text>
              )}
            </Text>
          </View>
        </View>

        {/* FINANCIAL SUMMARY */}
        <View style={styles.allowanceContainer}>
          <View style={styles.allowanceItem}>
            <Text style={styles.allowanceLabel}>Uang Jalan</Text>
            <Text style={styles.allowanceValue}>
              Rp {Number(item.trip_allowance).toLocaleString("id-ID")}
            </Text>
          </View>
          <View style={styles.allowanceItem}>
            <Text style={styles.allowanceLabel}>Sisa Saldo</Text>
            <Text style={[styles.allowanceValue, styles.remainingValue]}>
              Rp {Number(item.remaining_allowance).toLocaleString("id-ID")}
            </Text>
          </View>
          {/* Add unit display */}
          <View style={styles.allowanceItem}>
            <Text style={styles.allowanceLabel}>Satuan</Text>
            <Text style={styles.allowanceValue}>
              {getUnitDisplay(item.unit)}
            </Text>
          </View>
        </View>

        {/* Info untuk completed trip */}
        {isCompleted && (
          <View style={styles.completedInfo}>
            <Text style={styles.completedInfoText}>
              ✓ Perjalanan telah selesai - Tap untuk melihat detail
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>{renderActionButtons(item)}</View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ActivityIndicator size="large" color="#0000ff" style={styles.centered} />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Tugas Saya</Text>
        <TouchableOpacity onPress={signOut}>
          <FontAwesome5 name="sign-out-alt" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <FlatList
        data={deliveryOrders}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Tidak ada tugas saat ini.</Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

// === UPDATED STYLES ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  listContainer: { paddingHorizontal: 10, paddingBottom: 20 },
  card: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  doNumber: { fontSize: 16, fontWeight: "bold", color: "#333" },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  statusText: { color: "white", fontSize: 12, fontWeight: "bold" },
  cardBody: { marginBottom: 12 },
  customerName: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  itemDetails: { fontSize: 14, color: "#666", marginBottom: 8 },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationText: { marginLeft: 8, fontSize: 14, color: "#555" },
  cardFooter: { marginTop: 8 },
  actionButton: {
    padding: 12,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  cardDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: "white",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: { color: "red", textAlign: "center", margin: 10 },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#888",
  },

  // ENHANCED ALLOWANCE SECTION
  allowanceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  allowanceItem: { alignItems: "center", flex: 1 },
  allowanceLabel: { fontSize: 12, color: "#666" },
  allowanceValue: { fontSize: 14, fontWeight: "bold", color: "#333" },
  remainingValue: { color: "#e67e22" }, // Orange for remaining balance

  completedCard: { opacity: 0.8, borderColor: "#27ae60", borderWidth: 2 },
  completedAllowanceContainer: { backgroundColor: "#f8fff8" },
  completedInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#e8f5e8",
    borderRadius: 6,
  },
  completedInfoText: {
    fontSize: 12,
    color: "#155724",
    textAlign: "center",
    fontStyle: "italic",
  },
  multipleLocationsHint: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
  },
});

export default DriverDashboard;
