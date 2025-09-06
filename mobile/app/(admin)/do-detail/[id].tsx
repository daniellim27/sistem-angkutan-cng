// mobile/app/(admin)/do-detail/[id].tsx

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { FontAwesome5 } from "@expo/vector-icons";
import apiClient from "../../../src/services/api";
import DocumentImageViewer from "@/components/DocumentImageViewer";
import Timeline from "@/components/Timeline";

interface SensorData {
  id: number;
  delivery_order_id: number;
  pressure_in: number;
  pressure_out: number;
  temperature: number;
  meter_pulse: number;
  created_at: string;
}

interface DODetails {
  id: number;
  do_number: string;
  customer_name: string;
  item_name: string;
  minimal_load_quantity: number;
  actual_load_quantity?: number;
  unit_price: number;
  total_amount: number;
  trip_allowance: number;
  gaji: number;
  load_location: string;
  unload_location: string;
  load_latitude: string;
  load_longitude: string;
  unload_latitude: string;
  unload_longitude: string;
  status: string;
  created_at: string;
  surat_jalan_photo_url?: string;

  // Related data
  purchaseOrder?: {
    id: number;
    po_number: string;
    total_quantity: number;
    item_name: string;
  };
  driver?: {
    id: number;
    username: string;
    driverProfile?: {
      full_name: string;
      phone: string;
    };
  };
  vehicle?: {
    id: number;
    license_plate: string;
    type: string;
  };
  expenses?: Array<{
    id: number;
    jenis: string;
    amount: number;
    created_at: string;
  }>;

  // Calculated fields
  expenses_total: number;
  remaining_allowance: number;
  financial_summary: {
    trip_allowance: number;
    gaji: number;
    total_for_driver: number;
    expenses_total: number;
  };
}

const DODetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [doDetails, setDoDetails] = useState<DODetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [poSummary, setPoSummary] = useState<any>(null);
  const [showImage, setShowImage] = useState(false);
  
  // IoT Data State
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [iotLoading, setIotLoading] = useState(false);
  const [iotError, setIotError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'iot'>('details');

  // Mock IoT Data
  const mockSensorData: SensorData = {
    id: 1,
    delivery_order_id: Number(id),
    pressure_in: 12.5,
    pressure_out: 8.2,
    temperature: 45.3,
    meter_pulse: 1250,
    created_at: new Date().toISOString()
  };

  const fetchDODetails = async () => {
    if (!id) return;

    try {
      const [doResponse, poSummaryResponse] = await Promise.all([
        apiClient.get(`/delivery-orders/${id}`),
        doDetails?.purchaseOrder?.id
          ? apiClient.get(
              `/purchase-orders/${doDetails.purchaseOrder.id}/summary`
            )
          : Promise.resolve({ data: null }),
      ]);

      setDoDetails(doResponse.data);
      setPoSummary(poSummaryResponse.data);
    } catch (error: any) {
      console.error("Error fetching DO details:", error);
      Alert.alert("Error", "Failed to load delivery order details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // IoT Data Polling Effect
  useEffect(() => {
    if (id && activeTab === 'iot') {
      // Set mock data for demonstration
      setSensorData(mockSensorData);
      setLastUpdate(new Date());
    }
  }, [id, activeTab]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDODetails();
    }, [id])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDODetails();
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      assigned: "#6c757d",
      otw_to_load_location: "#3498db",
      at_load_location: "#f39c12",
      otw_to_unload_location: "#e67e22",
      at_unload_location: "#9b59b6",
      otw_to_base: "#1abc9c",
      completed: "#27ae60",
      cancelled: "#e74c3c",
    };
    return colors[status as keyof typeof colors] || "#95a5a6";
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      assigned: "Ditugaskan",
      otw_to_load_location: "Menuju Lokasi Muat",
      at_load_location: "Di Lokasi Muat",
      otw_to_unload_location: "Menuju Lokasi Bongkar",
      at_unload_location: "Di Lokasi Bongkar",
      otw_to_base: "Perjalanan Pulang",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const calculatePOProgress = () => {
    if (!doDetails?.purchaseOrder || !poSummary) return null;

    const totalQuantity = parseFloat(
      doDetails.purchaseOrder.total_quantity.toString()
    );
    const deliveredQuantity = parseFloat(poSummary.delivered_quantity || "0");
    const progressPercentage = (deliveredQuantity / totalQuantity) * 100;

    return {
      total: totalQuantity,
      delivered: deliveredQuantity,
      remaining: totalQuantity - deliveredQuantity,
      percentage: progressPercentage,
    };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!doDetails) {
    return (
      <View style={styles.centered}>
        <Text>Delivery Order not found</Text>
      </View>
    );
  }

  const poProgress = calculatePOProgress();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.doNumber}>{doDetails.do_number}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(doDetails.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(doDetails.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.customerName}>{doDetails.customer_name}</Text>
        <Text style={styles.itemName}>{doDetails.item_name}</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <FontAwesome5 name="list-alt" size={16} color={activeTab === 'details' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'iot' && styles.activeTab]}
          onPress={() => setActiveTab('iot')}
        >
          <FontAwesome5 name="wifi" size={16} color={activeTab === 'iot' ? '#2563eb' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'iot' && styles.activeTabText]}>
            IoT
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <>
          {/* Purchase Order Information */}
      {doDetails.purchaseOrder && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Purchase Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PO Number:</Text>
            <Text style={styles.infoValue}>
              {doDetails.purchaseOrder.po_number}
            </Text>
          </View>

          {poProgress && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total PO Quantity:</Text>
                <Text style={styles.infoValue}>
                  {poProgress.total.toLocaleString("id-ID")} Ton
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Delivered:</Text>
                <Text style={styles.infoValue}>
                  {poProgress.delivered.toLocaleString("id-ID")} Ton
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Remaining:</Text>
                <Text style={[styles.infoValue, { color: "#e67e22" }]}>
                  {poProgress.remaining.toLocaleString("id-ID")} Ton
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>PO Progress</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(poProgress.percentage, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {poProgress.percentage.toFixed(1)}% Complete
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Quantity Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📦 Quantity Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Minimal Load:</Text>
          <Text style={styles.infoValue}>
            {doDetails.minimal_load_quantity} Ton
          </Text>
        </View>
        {doDetails.actual_load_quantity && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Actual Load:</Text>
            <Text style={[styles.infoValue, { color: "#27ae60" }]}>
              {doDetails.actual_load_quantity} Ton
            </Text>
          </View>
        )}
        {doDetails.actual_load_quantity && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Load Efficiency:</Text>
            <Text style={styles.infoValue}>
              {(
                (doDetails.actual_load_quantity /
                  doDetails.minimal_load_quantity) *
                100
              ).toFixed(1)}
              %
            </Text>
          </View>
        )}
      </View>

      {/* Location Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Location Information</Text>

        {/* Load Location - Clickable */}
        <TouchableOpacity
          style={styles.locationItem}
          onPress={() =>
            router.push({
              pathname: "/map-view",
              params: {
                lat: doDetails.load_latitude,
                lng: doDetails.load_longitude,
                title: doDetails.load_location,
                type: "load",
              },
            })
          }
        >
          <FontAwesome5 name="arrow-up" size={16} color="#3498db" />
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>Loading Location:</Text>
            <Text style={styles.locationValue}>{doDetails.load_location}</Text>
          </View>
          <FontAwesome5 name="map-marker-alt" size={16} color="#3498db" />
        </TouchableOpacity>

        {/* Unload Location - Clickable */}
        <TouchableOpacity
          style={styles.locationItem}
          onPress={() =>
            router.push({
              pathname: "/map-view",
              params: {
                lat: doDetails.unload_latitude,
                lng: doDetails.unload_longitude,
                title: doDetails.unload_location,
                type: "unload",
              },
            })
          }
        >
          <FontAwesome5 name="arrow-down" size={16} color="#e74c3c" />
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>Unloading Location:</Text>
            <Text style={styles.locationValue}>
              {doDetails.unload_location}
            </Text>
          </View>
          <FontAwesome5 name="map-marker-alt" size={16} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      {/* Assignment Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👥 Assignment Information</Text>
        {doDetails.driver && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Driver:</Text>
            <Text style={styles.infoValue}>
              {doDetails.driver.driverProfile?.full_name ||
                doDetails.driver.username}
            </Text>
          </View>
        )}
        {doDetails.driver?.driverProfile?.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>
              {doDetails.driver.driverProfile.phone}
            </Text>
          </View>
        )}
        {doDetails.vehicle && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle:</Text>
            <Text style={styles.infoValue}>
              {doDetails.vehicle.license_plate} ({doDetails.vehicle.type})
            </Text>
          </View>
        )}
      </View>

      {/* Financial Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💰 Financial Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trip Allowance:</Text>
          <Text style={styles.infoValue}>
            Rp {Number(doDetails.trip_allowance).toLocaleString("id-ID")}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Driver Salary:</Text>
          <Text style={styles.infoValue}>
            Rp {Number(doDetails.gaji).toLocaleString("id-ID")}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Cost:</Text>
          <Text
            style={[styles.infoValue, { fontWeight: "bold", color: "#2563eb" }]}
          >
            Rp{" "}
            {Number(
              doDetails.financial_summary.total_for_driver
            ).toLocaleString("id-ID")}
          </Text>
        </View>
        {doDetails.expenses_total > 0 && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expenses Used:</Text>
              <Text style={[styles.infoValue, { color: "#e74c3c" }]}>
                Rp {Number(doDetails.expenses_total).toLocaleString("id-ID")}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remaining Balance:</Text>
              <Text style={[styles.infoValue, { color: "#27ae60" }]}>
                Rp{" "}
                {Number(doDetails.remaining_allowance).toLocaleString("id-ID")}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Expenses History */}
      {doDetails.expenses && doDetails.expenses.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧾 Expenses History</Text>
          {doDetails.expenses.map((expense, index) => (
            <View key={expense.id} style={styles.expenseItem}>
              <View style={styles.expenseHeader}>
                <Text style={styles.expenseType}>{expense.jenis}</Text>
                <Text style={styles.expenseAmount}>
                  Rp {Number(expense.amount).toLocaleString("id-ID")}
                </Text>
              </View>
              <Text style={styles.expenseDate}>
                {new Date(expense.created_at).toLocaleDateString("id-ID")}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Documents */}
      {doDetails.surat_jalan_photo_url && (
        <>
          {console.log(
            "surat_jalan_photo_url:",
            doDetails.surat_jalan_photo_url
          )}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📄 Documents</Text>
            <TouchableOpacity
              style={styles.documentItem}
              onPress={() => setShowImage(true)}
            >
              <FontAwesome5 name="file-image" size={20} color="#3498db" />
              <Text style={styles.documentText}>Surat Jalan Photo</Text>
              <FontAwesome5 name="external-link-alt" size={16} color="#666" />
            </TouchableOpacity>
            <DocumentImageViewer
              visible={showImage}
              imageUrl={doDetails.surat_jalan_photo_url}
              onClose={() => setShowImage(false)}
            />
          </View>
        </>
      )}

          {/* Timestamps */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Timeline</Text>
            <Timeline data={{ ...doDetails } as any} />
          </View>
        </>
      )}

      {/* IoT Tab Content */}
      {activeTab === 'iot' && (
        <View style={styles.iotContainer}>
          {/* IoT Status Header */}
          <View style={styles.iotHeader}>
            <View style={styles.iotHeaderContent}>
              <Text style={styles.iotTitle}>IoT Sensor Dashboard</Text>
              <Text style={styles.iotSubtitle}>DO: {doDetails.do_number}</Text>
            </View>
            <View style={styles.iotLastUpdate}>
              <Text style={styles.iotLastUpdateLabel}>Last Updated</Text>
              <Text style={styles.iotLastUpdateTime}>
                {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Not Available'}
              </Text>
            </View>
          </View>

          {/* Sensor Data Grid */}
          <View style={styles.sensorGrid}>
            {/* Pressure In */}
            <View style={[styles.sensorCard, styles.pressureInCard]}>
              <View style={styles.sensorIcon}>
                <FontAwesome5 name="arrow-up" size={20} color="#3b82f6" />
              </View>
              <View style={styles.sensorContent}>
                <Text style={styles.sensorLabel}>Pressure In</Text>
                <Text style={styles.sensorValue}>
                  {sensorData?.pressure_in || 0} bar
                </Text>
              </View>
            </View>

            {/* Pressure Out */}
            <View style={[styles.sensorCard, styles.pressureOutCard]}>
              <View style={styles.sensorIcon}>
                <FontAwesome5 name="arrow-down" size={20} color="#10b981" />
              </View>
              <View style={styles.sensorContent}>
                <Text style={styles.sensorLabel}>Pressure Out</Text>
                <Text style={styles.sensorValue}>
                  {sensorData?.pressure_out || 0} bar
                </Text>
              </View>
            </View>

            {/* Temperature */}
            <View style={[styles.sensorCard, styles.temperatureCard]}>
              <View style={styles.sensorIcon}>
                <FontAwesome5 name="thermometer-half" size={20} color="#f59e0b" />
              </View>
              <View style={styles.sensorContent}>
                <Text style={styles.sensorLabel}>Temperature</Text>
                <Text style={styles.sensorValue}>
                  {sensorData?.temperature || 0}°C
                </Text>
              </View>
            </View>

            {/* Meter Pulse */}
            <View style={[styles.sensorCard, styles.meterPulseCard]}>
              <View style={styles.sensorIcon}>
                <FontAwesome5 name="bolt" size={20} color="#8b5cf6" />
              </View>
              <View style={styles.sensorContent}>
                <Text style={styles.sensorLabel}>Meter Pulse</Text>
                <Text style={styles.sensorValue}>
                  {sensorData?.meter_pulse || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Mock Data Notice */}
          <View style={styles.mockDataNotice}>
            <View style={styles.mockDataIcon}>
              <FontAwesome5 name="info-circle" size={20} color="#3b82f6" />
            </View>
            <View style={styles.mockDataContent}>
              <Text style={styles.mockDataTitle}>Mock Data Active</Text>
              <Text style={styles.mockDataText}>
                This is sample IoT sensor data for demonstration purposes. 
                Real sensor data will be displayed here when IoT devices are connected.
              </Text>
            </View>
          </View>

          {/* IoT Information Panel */}
          <View style={styles.iotInfoPanel}>
            <Text style={styles.iotInfoTitle}>🔗 IoT System Information</Text>
            <View style={styles.iotInfoGrid}>
              <View style={styles.iotInfoSection}>
                <Text style={styles.iotInfoSectionTitle}>Data Collection</Text>
                <View style={styles.iotInfoList}>
                  <Text style={styles.iotInfoItem}>• Real-time sensor data collection</Text>
                  <Text style={styles.iotInfoItem}>• Automatic updates every 5 seconds</Text>
                  <Text style={styles.iotInfoItem}>• Pressure, temperature, and meter readings</Text>
                  <Text style={styles.iotInfoItem}>• Historical data storage</Text>
                </View>
              </View>
              <View style={styles.iotInfoSection}>
                <Text style={styles.iotInfoSectionTitle}>Current Status</Text>
                <View style={styles.iotInfoList}>
                  <Text style={styles.iotInfoItem}>• Backend IoT API: ✅ Ready</Text>
                  <Text style={styles.iotInfoItem}>• Database Storage: ✅ Ready</Text>
                  <Text style={styles.iotInfoItem}>• Frontend Display: ✅ Active (Mock Data)</Text>
                  <Text style={styles.iotInfoItem}>• Real IoT Connection: ⏳ Pending</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },

  headerCard: {
    backgroundColor: "#2563eb",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  doNumber: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  customerName: { fontSize: 18, color: "#fff", marginBottom: 4 },
  itemName: { fontSize: 16, color: "#e2e8f0" },

  card: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1f2937",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 14, color: "#6b7280", flex: 1 },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    flex: 1,
    textAlign: "right",
  },

  progressContainer: { marginTop: 12 },
  progressLabel: { fontSize: 14, color: "#6b7280", marginBottom: 6 },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },

  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  locationText: { marginLeft: 12, flex: 1 },
  locationLabel: { fontSize: 14, color: "#6b7280", marginBottom: 2 },
  locationValue: { fontSize: 14, color: "#1f2937" },

  expenseItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
    marginBottom: 8,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseType: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  expenseAmount: { fontSize: 14, fontWeight: "bold", color: "#dc2626" },
  expenseDate: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  documentText: { flex: 1, marginLeft: 12, fontSize: 14, color: "#1f2937" },

  // Tab Navigation Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#eff6ff",
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  activeTabText: {
    color: "#2563eb",
    fontWeight: "600",
  },

  // IoT Container Styles
  iotContainer: {
    paddingHorizontal: 16,
  },

  // IoT Header Styles
  iotHeader: {
    backgroundColor: "#3b82f6",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  iotHeaderContent: {
    marginBottom: 12,
  },
  iotTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  iotSubtitle: {
    fontSize: 16,
    color: "#dbeafe",
  },
  iotLastUpdate: {
    alignItems: "flex-end",
  },
  iotLastUpdateLabel: {
    fontSize: 12,
    color: "#dbeafe",
    marginBottom: 2,
  },
  iotLastUpdateTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },

  // Sensor Grid Styles
  sensorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sensorCard: {
    width: "48%",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 4,
  },
  pressureInCard: {
    borderTopColor: "#3b82f6",
  },
  pressureOutCard: {
    borderTopColor: "#10b981",
  },
  temperatureCard: {
    borderTopColor: "#f59e0b",
  },
  meterPulseCard: {
    borderTopColor: "#8b5cf6",
  },
  sensorIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  sensorContent: {
    flex: 1,
  },
  sensorLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },

  // Mock Data Notice Styles
  mockDataNotice: {
    flexDirection: "row",
    backgroundColor: "#dbeafe",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  mockDataIcon: {
    marginRight: 12,
  },
  mockDataContent: {
    flex: 1,
  },
  mockDataTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 4,
  },
  mockDataText: {
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 16,
  },

  // IoT Info Panel Styles
  iotInfoPanel: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  iotInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  iotInfoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iotInfoSection: {
    flex: 1,
    marginRight: 8,
  },
  iotInfoSectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  iotInfoList: {
    flex: 1,
  },
  iotInfoItem: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    lineHeight: 16,
  },
});

export default DODetailScreen;
