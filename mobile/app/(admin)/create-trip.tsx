import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import apiClient, { getAllGasStations } from "../../src/services/api";
import MapSelector from "../../components/MapSelector"; // INI GAK ERROR, CUMAN VSCODE AJA YANG OON
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { FontAwesome5 } from "@expo/vector-icons";

interface Driver {
  id: number;
  username: string;
  driverProfile?: { full_name: string };
}
interface Vehicle {
  id: number;
  license_plate: string;
  type: string;
}

interface GasStation {
  id: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  station_type: string;
  is_active: boolean;
}
// Removed PO interfaces - DOs are now standalone
interface Coordinates {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function CreateTrip() {
  const router = useRouter();

  const [masterData, setMasterData] = useState<{
    drivers: Driver[];
    vehicles: Vehicle[];
    gasStations: GasStation[];
  }>({ drivers: [], vehicles: [], gasStations: [] });

  const [form, setForm] = useState({
    do_number: "",
    do_name: "",
    customer_name: "",
    item_name: "",
    unit: "ton",
    unit_price: "",
    driver_id: "",
    vehicle_id: "",
    trip_allowance: "",
    gaji: "",
    load_location: "",
    unload_location: "",
    load_latitude: "",
    load_longitude: "",
    unload_latitude: "",
    unload_longitude: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [mapSelectorType, setMapSelectorType] = useState<
    "loading" | "unloading"
  >("loading");

  // Fetch drivers, vehicles, and gas stations
  const fetchMasterData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [driversRes, vehiclesRes, gasStationsRes] = await Promise.all([
        apiClient.get("/users?role=driver&status=available"),
        apiClient.get("/vehicles?status=available"),
        getAllGasStations(),
      ]);
      setMasterData({
        drivers: Array.isArray(driversRes.data.data) ? driversRes.data.data : (Array.isArray(driversRes.data) ? driversRes.data : []),
        vehicles: Array.isArray(vehiclesRes.data.data) ? vehiclesRes.data.data : (Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []),
        gasStations: Array.isArray(gasStationsRes.data) ? gasStationsRes.data : [],
      });
    } catch (err) {
      console.error("Error fetching master data:", err);
      setError("Gagal memuat data master. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMasterData();
    }, [])
  );

  // Removed PO change handler - DOs are now standalone

  // Function untuk handle map selection
  const handleMapLocationSelect = (location: Coordinates) => {
    if (mapSelectorType === "loading") {
      setForm((prev) => ({
        ...prev,
        load_location:
          location.address || `${location.latitude}, ${location.longitude}`,
        load_latitude: location.latitude.toString(),
        load_longitude: location.longitude.toString(),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        unload_location:
          location.address || `${location.latitude}, ${location.longitude}`,
        unload_latitude: location.latitude.toString(),
        unload_longitude: location.longitude.toString(),
      }));
    }
  };

  const handleChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError(null);

    // Basic validation for standalone DO
    if (
      !form.customer_name ||
      !form.item_name ||
      !form.unit_price ||
      !form.driver_id ||
      !form.vehicle_id ||
      !form.trip_allowance ||
      !form.gaji ||
      !form.load_location ||
      !form.unload_location
    ) {
      setError("Semua field wajib diisi.");
      return;
    }
    console.log("Form data before submit:", form); // Debug log

    setLoading(true);
    try {
      const payload = {
        customer_name: form.customer_name,
        item_name: form.item_name,
        unit: form.unit,
        unit_price: parseFloat(form.unit_price),
        driver_id: parseInt(form.driver_id),
        vehicle_id: parseInt(form.vehicle_id),
        trip_allowance: parseFloat(form.trip_allowance),
        gaji: parseFloat(form.gaji),
        load_location: form.load_location,
        unload_location: form.unload_location,
        load_latitude: form.load_latitude ? parseFloat(form.load_latitude) : null,
        load_longitude: form.load_longitude ? parseFloat(form.load_longitude) : null,
        unload_latitude: form.unload_latitude ? parseFloat(form.unload_latitude) : null,
        unload_longitude: form.unload_longitude ? parseFloat(form.unload_longitude) : null,
        do_name: form.do_name || null,
      };

      await apiClient.post("/web/delivery-orders", payload);
      
      Alert.alert("Sukses", "Delivery Order berhasil dibuat!", [
        { text: "OK", onPress: () => router.replace("/(admin)") },
      ]);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError("Gagal membuat trip. " + (err.response?.data?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Memuat data...</Text>
      </View>
    );
  }

  // RENDER DI SINI:
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Buat Trip/Delivery Order Baru</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Informasi Delivery Order</Text>
        
        <Text style={styles.label}>Nama Customer *</Text>
        <TextInput
          style={styles.input}
          value={form.customer_name}
          onChangeText={(value) => handleChange("customer_name", value)}
          placeholder="Masukkan nama customer"
        />

        <Text style={styles.label}>Nama Item *</Text>
        <TextInput
          style={styles.input}
          value={form.item_name}
          onChangeText={(value) => handleChange("item_name", value)}
          placeholder="Masukkan nama item"
        />

        <Text style={styles.label}>Unit *</Text>
        <View style={styles.select}>
          {Platform.OS === "web" ? (
            <select
              value={form.unit}
              onChange={(e) => handleChange("unit", e.target.value)}
            >
              <option value="ton">Ton</option>
              <option value="kilogram">Kilogram</option>
              <option value="kubik">Kubik</option>
            </select>
          ) : (
            <Picker
              selectedValue={form.unit}
              onValueChange={(itemValue) => handleChange("unit", itemValue)}
              style={{ width: "100%" }}
            >
              <Picker.Item label="Ton" value="ton" />
              <Picker.Item label="Kilogram" value="kilogram" />
              <Picker.Item label="Kubik" value="kubik" />
            </Picker>
          )}
        </View>

        <Text style={styles.label}>Harga per Unit (IDR) *</Text>
        <TextInput
          style={styles.input}
          value={form.unit_price}
          onChangeText={(value) => handleChange("unit_price", value)}
          placeholder="Masukkan harga per unit"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Nama DO (Opsional)</Text>
        <TextInput
          style={styles.input}
          value={form.do_name}
          onChangeText={(value) => handleChange("do_name", value)}
          placeholder="Nama deskriptif untuk DO ini"
        />
      </View>

      {/* === SECTION 2: DETAIL MUATAN === */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Detail Muatan</Text>
        
      </View>

      {/* === SECTION 3: LOKASI === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Lokasi Pengiriman</Text>

          {/* LOKASI LOADING - SPBU SELECTION */}
          <View style={styles.locationInputContainer}>
            <Text style={styles.label}>SPBU Location (Gas Station) *</Text>
            <View style={styles.select}>
              {Platform.OS === "web" ? (
                <select
                  value={form.load_location}
                  onChange={(e) => handleChange("load_location", e.target.value)}
                >
                  <option value="">Pilih SPBU</option>
                  {masterData.gasStations.map((station) => (
                    <option key={station.id} value={station.name}>
                      {station.name} - {station.address || 'No address'}
                    </option>
                  ))}
                </select>
              ) : (
                <Picker
                  selectedValue={form.load_location}
                  onValueChange={(itemValue) => handleChange("load_location", itemValue)}
                  style={{ width: "100%" }}
                >
                  <Picker.Item label="Pilih SPBU" value="" />
                  {masterData.gasStations.map((station) => (
                    <Picker.Item 
                      key={station.id} 
                      label={`${station.name} - ${station.address || 'No address'}`}
                      value={station.name}
                    />
                  ))}
                </Picker>
              )}
            </View>
            <TouchableOpacity
              style={[styles.mapButton, { marginTop: 10 }]}
              onPress={() => {
                setMapSelectorType("loading");
                setShowMapSelector(true);
              }}
            >
              <FontAwesome5 name="map-marker-alt" size={16} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 5 }}>Pilih dari Map</Text>
            </TouchableOpacity>
            {form.load_latitude && form.load_longitude && (
              <Text style={styles.coordinateText}>
                📍 {parseFloat(form.load_latitude).toFixed(6)},{" "}
                {parseFloat(form.load_longitude).toFixed(6)}
              </Text>
            )}
          </View>

          {/* LOKASI UNLOADING DENGAN MAP BUTTON */}
          <View style={styles.locationInputContainer}>
            <Text style={styles.label}>
              Lokasi Unloading (Bongkar Barang) *
            </Text>
            <View style={styles.locationInputRow}>
              <TextInput
                style={[styles.input, styles.locationInput]}
                value={form.unload_location}
                onChangeText={(v) => handleChange("unload_location", v)}
                placeholder="Alamat lokasi unloading"
                multiline
              />
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => {
                  setMapSelectorType("unloading");
                  setShowMapSelector(true);
                }}
              >
                <FontAwesome5 name="map-marker-alt" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {form.unload_latitude && form.unload_longitude && (
              <Text style={styles.coordinateText}>
                📍 {parseFloat(form.unload_latitude).toFixed(6)},{" "}
                {parseFloat(form.unload_longitude).toFixed(6)}
              </Text>
            )}
          </View>
        </View>
      
      {/* === SECTION 4: PENUGASAN === */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>4. Penugasan Driver & Kendaraan</Text>

          <Text style={styles.label}>Driver</Text>
          <View style={styles.select}>
            {Platform.OS === "web" ? (
              <select
                value={form.driver_id}
                onChange={(e) => handleChange("driver_id", e.target.value)}
              >
                <option value="">
                  {masterData.drivers.length === 0
                    ? "Tidak ada driver tersedia"
                    : "Pilih Driver"}
                </option>
                {masterData.drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.driverProfile?.full_name || d.username}
                  </option>
                ))}
              </select>
            ) : (
              <Picker
                selectedValue={form.driver_id}
                onValueChange={(itemValue) =>
                  handleChange("driver_id", itemValue)
                }
                style={{ width: "100%" }}
              >
                <Picker.Item
                  label={
                    masterData.drivers.length === 0
                      ? "Tidak ada driver tersedia"
                      : "Pilih Driver"
                  }
                  value=""
                />
                {masterData.drivers.map((d) => (
                  <Picker.Item
                    key={d.id}
                    label={d.driverProfile?.full_name || d.username}
                    value={d.id}
                  />
                ))}
              </Picker>
            )}
          </View>
          {masterData.drivers.length === 0 && (
            <Text style={{ color: "red", marginBottom: 8 }}>
              Semua Driver Sibuk. Tidak ada driver yang tersedia untuk sekarang.
            </Text>
          )}

          <Text style={styles.label}>Mobil</Text>
          <View style={styles.select}>
            {Platform.OS === "web" ? (
              <select
                value={form.vehicle_id}
                onChange={(e) => handleChange("vehicle_id", e.target.value)}
              >
                <option value="">Pilih Mobil</option>
                {masterData.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} ({v.type})
                  </option>
                ))}
              </select>
            ) : (
              <Picker
                selectedValue={form.vehicle_id}
                onValueChange={(itemValue) =>
                  handleChange("vehicle_id", itemValue)
                }
                style={{ width: "100%" }}
              >
                <Picker.Item
                  label={
                    masterData.vehicles.length === 0
                      ? "Tidak ada mobil tersedia"
                      : "Pilih Mobil"
                  }
                  value=""
                />
                {masterData.vehicles.map((v) => (
                  <Picker.Item
                    key={v.id}
                    label={`${v.license_plate} (${v.type})`}
                    value={v.id}
                  />
                ))}
              </Picker>
            )}
          </View>

          <View style={styles.financialSection}>
            <Text style={styles.sectionTitle}>💰 Finansial</Text>

            <Text style={styles.label}>Uang Jalan - Operasional (Rp) *</Text>
            <TextInput
              style={styles.input}
              value={form.trip_allowance}
              onChangeText={(v) => handleChange("trip_allowance", v)}
              placeholder="Contoh: 2500000 (untuk bensin, tol, dll)"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Gaji Driver (Rp) *</Text>
            <TextInput
              style={styles.input}
              value={form.gaji}
              onChangeText={(v) => handleChange("gaji", v)}
              placeholder="Contoh: 1500000 (untuk payroll internal)"
              keyboardType="numeric"
            />

            <View style={styles.infoContainer}>
              <FontAwesome5 name="info-circle" size={16} color="#666" />
              <Text style={styles.infoText}>
                Data gaji disimpan untuk keperluan payroll bulanan dan tidak
                ditampilkan ke driver.
              </Text>
            </View>

            {/* Financial Summary */}
            {form.trip_allowance && form.gaji && (
              <View style={styles.financialSummary}>
                <Text style={styles.summaryTitle}>
                  Ringkasan Finansial (Admin View):
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Uang Operasional (Visible to Driver):
                  </Text>
                  <Text style={styles.summaryValue}>
                    Rp{" "}
                    {Number(form.trip_allowance || 0).toLocaleString("id-ID")}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Gaji Driver (Internal Only):
                  </Text>
                  <Text style={[styles.summaryValue, { fontStyle: "italic" }]}>
                    Rp {Number(form.gaji || 0).toLocaleString("id-ID")}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Cost (Internal):</Text>
                  <Text style={styles.totalValue}>
                    Rp{" "}
                    {(
                      Number(form.trip_allowance || 0) + Number(form.gaji || 0)
                    ).toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <FontAwesome5 name="info-circle" size={16} color="#3498db" />
            <Text style={styles.infoText}>
              Driver akan menginput berat muatan aktual dan mengupload foto
              surat jalan saat berangkat dari lokasi muat.
            </Text>
          </View>
        </View>

      <MapSelector
        visible={showMapSelector}
        title={`Pilih Lokasi ${
          mapSelectorType === "loading" ? "Loading" : "Unloading"
        }`}
        initialLocation={
          mapSelectorType === "loading"
            ? form.load_latitude && form.load_longitude
              ? {
                  latitude: parseFloat(form.load_latitude),
                  longitude: parseFloat(form.load_longitude),
                  address: form.load_location,
                }
              : undefined
            : form.unload_latitude && form.unload_longitude
            ? {
                latitude: parseFloat(form.unload_latitude),
                longitude: parseFloat(form.unload_longitude),
                address: form.unload_location,
              }
            : undefined
        }
        onLocationSelect={handleMapLocationSelect}
        onClose={() => setShowMapSelector(false)}
      />

      <TouchableOpacity
        style={[
          styles.submitButton,
          loading && styles.disabledButton,
        ]}
        onPress={() => {
          console.log("Button pressed!"); // Debug log
          handleSubmit();
        }}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? "Menyimpan..." : "Simpan Delivery Order"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f0f2f5", flexGrow: 1 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1a202c",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#2d3748",
  },
  label: { fontSize: 14, fontWeight: "500", color: "#4a5568", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e0",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  select: {
    borderWidth: 1,
    borderColor: "#cbd5e0",
    borderRadius: 6,
    backgroundColor: "#fff",
    padding: 4,
  },
  autoFilledContainer: {
    marginTop: 12,
    backgroundColor: "#f7fafc",
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  // Financial Section
  financialSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 12,
  },
  financialSummary: {
    backgroundColor: "#f7fafc",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#4a5568",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2d3748",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e0",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2d3748",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3182ce",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoLabel: { color: "#718096" },
  infoValue: { fontWeight: "600", color: "#2d3748" },
  locationInputContainer: {
    marginBottom: 16,
  },
  locationInputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationInput: {
    flex: 1,
    marginRight: 8,
    minHeight: 60,
  },
  mapButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 60,
  },
  coordinateText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  quantityInfo: {
    padding: 10,
    backgroundColor: "#e6f7ff",
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#91d5ff",
  },
  locationStatusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  locationStatusLabel: { color: "#718096", fontSize: 12 },
  locationStatusValue: { fontSize: 12, fontWeight: "600" },
  error: {
    color: "#e53e3e",
    marginBottom: 10,
    backgroundColor: "#fed7d7",
    padding: 10,
    borderRadius: 6,
  },
  submitButton: {
    backgroundColor: "#3182ce",
    padding: 14,
    borderRadius: 8,
    marginTop: 24,
    alignItems: "center",
  },
  submitButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  disabledButton: { backgroundColor: "#a0aec0" },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e6f7ff",
    borderRadius: 6,
    padding: 10,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#91d5ff",
  },
  infoText: {
    flex: 1,
    color: "#2d3748",
    fontSize: 13,
    marginLeft: 8,
  },
});
