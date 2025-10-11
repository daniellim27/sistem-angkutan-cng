// mobile/app/trip-detail/[id].tsx

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Linking,
  Image,
} from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import LoadConfirmationModal from "../../components/LoadConfirmationModal";
import NotaKecilUploader from "../../components/NotaKecilUploader";
import NotaKecilsList from "../../components/NotaKecilsList";
import {
  getDeliveryOrderDetails,
  createDriverExpense,
  confirmLoad,
  createBudgetRequest,
  getBudgetRequests,
  completeLocation,
  uploadSuratJalanPhoto,
  uploadDocumentationPhotos,
  getNotaKecils,
} from "../../src/services/api";
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Interface untuk data yang akan kita terima
interface Expense {
  id: number;
  jenis: string;
  amount: string;
  receipt_url: string | null;
  created_at: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  type: "load" | "unload";
}

interface DeliveryOrderDetails {
  id: number;
  do_number: string;
  customer_name: string;
  item_name: string;
  trip_allowance: number;
  actual_load_quantity?: number;
  load_location: string;
  unload_location: string;
  additional_unload_locations?: Array<{location: string, latitude?: number, longitude?: number}>;
  load_latitude: string; // Add these fields
  load_longitude: string;
  unload_latitude: string;
  unload_longitude: string;
  surat_jalan_photo_url?: string;
  expenses_total: number;
  remaining_allowance: number;
  expenses: Expense[];
  status: string;
  created_at: string;
  location_documentation?: Array<{
    location_index: number;
    location_name: string;
    photos: string[];
    uploaded_at: string;
    completed: boolean;
    [key: string]: any; // Allow dynamic properties for documentation fields
  }>;
  financial_summary?: {
    trip_allowance: number;
    total_for_driver: number;
    expenses_total: number;
    remaining_allowance: number;
  };
}

interface ExpenseForm {
  jenis: string;
  amount: string;
  notes: string;
}

interface BudgetRequest {
  id: number;
  requested_amount: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  evidence_url?: string;
  created_at: string;
  rejection_reason?: string;
}

interface BudgetRequestForm {
  requested_amount: string;
  reason: string;
}

const TripDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<DeliveryOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentCustomerLocationIndex, setCurrentCustomerLocationIndex] = useState(0);

  // REF untuk prevent multiple calls
  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);

  // State untuk form expense
  // Add component state here
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetRequestModal, setShowBudgetRequestModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [submittingBudgetRequest, setSubmittingBudgetRequest] = useState(false);
  const [showLoadConfirmation, setShowLoadConfirmation] = useState(false);
  const [submittingLoad, setSubmittingLoad] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    jenis: "",
    amount: "",
    notes: "",
  });
  const [budgetRequestForm, setBudgetRequestForm] = useState<BudgetRequestForm>({
    requested_amount: "",
    reason: "",
  });
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [receiptImage, setReceiptImage] = useState<any>(null);
  const [evidenceImage, setEvidenceImage] = useState<any>(null);
  const [showSuratJalanModal, setShowSuratJalanModal] = useState(false);
  const [uploadingSuratJalan, setUploadingSuratJalan] = useState(false);
  const [suratJalanPhotos, setSuratJalanPhotos] = useState<any[]>([]);
  const [currentLocationIndex, setCurrentLocationIndex] = useState<number>(0);
  const [showLocationDocModal, setShowLocationDocModal] = useState(false);
  // Location-specific photo arrays - each index corresponds to a location
  const [pressureBarPhotos, setPressureBarPhotos] = useState<any[]>([]);
  const [temperaturePhotos, setTemperaturePhotos] = useState<any[]>([]);
  const [stanAwalPhotos, setStanAwalPhotos] = useState<any[]>([]);
  const [stanAkhirPhotos, setStanAkhirPhotos] = useState<any[]>([]);
  
  // Nota Kecil functionality
  const [showNotaKecilModal, setShowNotaKecilModal] = useState(false);
  const [showNotaKecilListModal, setShowNotaKecilListModal] = useState(false);
  const [notaKecils, setNotaKecils] = useState<any[]>([]);

  const expenseTypes = [
    { label: "BBM/Solar", value: "bbm" },
    { label: "Tol", value: "tol" },
    { label: "Parkir", value: "parkir" },
    { label: "Makan", value: "makan" },
    { label: "Tambah Pengeluaran", value: "pengeluaran_tambahan" },
    { label: "Lain-lain", value: "lainnya" },
  ];

  // Load photos from storage when trip is available
  useEffect(() => {
    const loadAllPhotos = async () => {
      if (trip?.id) {
        console.log("Loading photos for trip:", trip.id);
        
        const [pressureBar, temperature, stanAwal, stanAkhir] = await Promise.all([
          loadPhotosFromStorage(trip.id, 'pressure_bar'),
          loadPhotosFromStorage(trip.id, 'temperature'),
          loadPhotosFromStorage(trip.id, 'stan_awal'),
          loadPhotosFromStorage(trip.id, 'stan_akhir'),
        ]);

        setPressureBarPhotos(pressureBar);
        setTemperaturePhotos(temperature);
        setStanAwalPhotos(stanAwal);
        setStanAkhirPhotos(stanAkhir);
        
        console.log("Photos loaded successfully");
      }
    };

    loadAllPhotos();
  }, [trip?.id]);

  const fetchNotaKecils = useCallback(async (doId: string) => {
    try {
      console.log(`Fetching nota kecils for DO: ${doId}`);
      const response = await getNotaKecils(doId);
      console.log("Nota Kecils Response:", response);
      
      if (mountedRef.current) {
        setNotaKecils(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching nota kecils:", error);
      if (mountedRef.current) {
        setNotaKecils([]);
      }
    }
  }, []);

  const fetchTripDetails = useCallback(async () => {
    if (!id || isLoadingRef.current) {
      console.log("Skipping fetch - already loading or no ID");
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log(`Fetching trip details for ID: ${id}`);
      const response = await getDeliveryOrderDetails(id);
      
      console.log("API Response:", response);
      console.log("Response data:", response.data);

      // Check if component is still mounted
      if (mountedRef.current) {
        const tripData = response.data.data || response.data;
        console.log("Setting trip data:", tripData);
        console.log("Trip ID:", tripData?.id);
        setTrip(tripData);
        
        // Fetch nota kecils for this delivery order
        if (id) {
          await fetchNotaKecils(id);
        }
        console.log(`Trip loaded - ID: ${tripData?.id}, Status: ${tripData?.status}`);
        
        // Fetch budget requests for this delivery order
        // TODO: Implement getBudgetRequests API function
        // try {
        //   if (id) {
        //     const budgetResponse = await getBudgetRequests(id);
        //     if (mountedRef.current) {
        //       setBudgetRequests(budgetResponse.data.budgetRequests || []);
        //     }
        //   }
        // } catch (budgetError) {
        //   console.log("No budget requests found or error fetching:", budgetError);
        //   if (mountedRef.current) {
        //     setBudgetRequests([]);
        //   }
        // }
      }
    } catch (error: any) {
      if (mountedRef.current) {
        console.error("Error fetching trip:", error);
        console.error("Error response:", error.response?.data);

        // Handle specific error types
        if (error.response?.status === 401) {
          Alert.alert("Session Expired", "Please login again.", [
            {
              text: "OK",
              onPress: () => {
                // This should be handled by interceptor, but just in case
                router.replace("/(auth)/login");
              },
            },
          ]);
        } else if (error.response?.status === 403) {
          Alert.alert(
            "Access Denied",
            "You don't have permission to view this delivery order."
          );
        } else if (error.response?.status === 404) {
          Alert.alert("Not Found", "Delivery order not found.");
        } else {
          Alert.alert(
            "Error",
            error.response?.data?.message || "Failed to load trip details."
          );
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isLoadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // useFocusEffect dengan proper dependency dan cleanup
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, starting fetch...");
      setLoading(true);
      fetchTripDetails();

      // Cleanup function
      return () => {
        console.log("Screen unfocused, cleaning up...");
        isLoadingRef.current = false;
      };
    }, [fetchTripDetails])
  );

  // Effect untuk cleanup saat unmount
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      isLoadingRef.current = false;
    };
  }, []);

  // FUNGSI REFRESH yang di-throttle
  const onRefresh = useCallback(() => {
    if (isLoadingRef.current) {
      console.log("Refresh skipped - already loading");
      return;
    }

    setRefreshing(true);
    fetchTripDetails();
  }, [fetchTripDetails]);

  // Handle image picker
  const pickImage = async () => {
    try {
      console.log("Starting image picker..."); // Debug log

      // Request permission untuk akses media library
      // Request permission for mobile only
      if (Platform.OS !== "web") {
        const permissionResult =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        console.log("Permission result:", permissionResult); // Debug log

        if (permissionResult.granted === false) {
          Alert.alert(
            "Permission Diperlukan",
            "Aplikasi memerlukan izin untuk mengakses galeri foto. Silakan berikan izin di pengaturan aplikasi.",
            [{ text: "OK" }]
          );
          return;
        }
      }

      // Launch image library dengan konfigurasi yang lebih robust
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      console.log("Image picker result:", result); // Debug log

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        console.log("Selected image:", selectedImage); // Debug log
        setReceiptImage(selectedImage);
      }
    } catch (error) {
      console.error("Image picker error:", error);
    }
  };

  const takePicture = async () => {
    try {
      console.log("Starting camera..."); // Debug log

      // Request permission untuk akses kamera
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      console.log("Camera permission result:", permissionResult); // Debug log

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses kamera. Silakan berikan izin di pengaturan aplikasi.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      console.log("Camera result:", result); // Debug log

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const takenImage = result.assets[0];
        console.log("Taken image:", takenImage); // Debug log
        setReceiptImage(takenImage);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
    }
  };

  const showImagePicker = () => {
    if (Platform.OS === "web") {
      // Untuk web, gunakan input file HTML
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement | null;
        if (target && target.files && target.files[0]) {
          const file = target.files[0];
          setReceiptImage({
            uri: URL.createObjectURL(file),
            fileName: file.name,
            type: file.type,
          });
        }
      };
      input.click();
    } else {
      Alert.alert(
        "Pilih Foto Struk",
        "Bagaimana cara Anda ingin menambahkan foto?",
        [
          { text: "Kamera", onPress: takePicture },
          { text: "Galeri", onPress: pickImage },
          { text: "Batal", style: "cancel" },
        ],
        { cancelable: true }
      );
    }
  };

  const handlePressureBarPhoto = () => {
    if (Platform.OS === "web") {
      // For web, use HTML file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement | null;
        if (target && target.files && target.files[0]) {
          const file = target.files[0];
          const photoData = {
            uri: URL.createObjectURL(file),
            fileName: file.name,
            type: file.type,
          };
          setLocationPhoto(pressureBarPhotos, setPressureBarPhotos, currentLocationIndex, photoData, 'pressure_bar');
        }
      };
      input.click();
    } else {
      Alert.alert(
        "Foto Pressure Bar",
        "Bagaimana cara Anda ingin mengambil foto pressure bar?",
        [
          { text: "Kamera", onPress: takePressureBarPicture },
          { text: "Galeri", onPress: pickPressureBarFromGallery },
          { text: "Batal", style: "cancel" },
        ],
        { cancelable: true }
      );
    }
  };

  const takePressureBarPicture = async () => {
    try {
      console.log("Starting pressure bar camera...");
      
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      console.log("Pressure bar camera permission result:", permissionResult);

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses kamera. Silakan berikan izin di pengaturan aplikasi.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      console.log("Pressure bar camera result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const takenImage = result.assets[0];
        setLocationPhoto(pressureBarPhotos, setPressureBarPhotos, currentLocationIndex, takenImage, 'pressure_bar');
        console.log("Pressure bar photo set for location", currentLocationIndex, ":", takenImage);
      }
    } catch (error) {
      console.error("Error taking pressure bar picture:", error);
      Alert.alert("Error", "Gagal mengambil foto pressure bar");
    }
  };

  const pickPressureBarFromGallery = async () => {
    try {
      console.log("Opening pressure bar gallery...");
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("Pressure bar gallery permission result:", permissionResult);

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses galeri foto. Silakan berikan izin di pengaturan aplikasi.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      console.log("Pressure bar gallery result:", result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setLocationPhoto(pressureBarPhotos, setPressureBarPhotos, currentLocationIndex, selectedImage, 'pressure_bar');
        console.log("Pressure bar photo selected for location", currentLocationIndex, ":", selectedImage);
      }
    } catch (error) {
      console.error("Error picking pressure bar image:", error);
      Alert.alert("Error", "Gagal memilih foto pressure bar");
    }
  };

  // Temperature photo handlers
  const handleTemperaturePhoto = () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement | null;
        if (target && target.files && target.files[0]) {
          const file = target.files[0];
          const photoData = {
            uri: URL.createObjectURL(file),
            fileName: file.name,
            type: file.type,
          };
          setLocationPhoto(temperaturePhotos, setTemperaturePhotos, currentLocationIndex, photoData, 'temperature');
        }
      };
      input.click();
    } else {
      Alert.alert(
        "Foto Temperature",
        "Bagaimana cara Anda ingin mengambil foto temperature?",
        [
          { text: "Kamera", onPress: takeTemperaturePicture },
          { text: "Galeri", onPress: pickTemperatureFromGallery },
          { text: "Batal", style: "cancel" },
        ],
        { cancelable: true }
      );
    }
  };

  const takeTemperaturePicture = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses kamera.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocationPhoto(temperaturePhotos, setTemperaturePhotos, currentLocationIndex, result.assets[0], 'temperature');
      }
    } catch (error) {
      Alert.alert("Error", "Gagal mengambil foto temperature");
    }
  };

  const pickTemperatureFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses galeri foto.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocationPhoto(temperaturePhotos, setTemperaturePhotos, currentLocationIndex, result.assets[0], 'temperature');
      }
    } catch (error) {
      Alert.alert("Error", "Gagal memilih foto temperature");
    }
  };

  // Stan Awal photo handlers
  const handleStanAwalPhoto = () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement | null;
        if (target && target.files && target.files[0]) {
          const file = target.files[0];
          const photoData = {
            uri: URL.createObjectURL(file),
            fileName: file.name,
            type: file.type,
          };
          setLocationPhoto(stanAwalPhotos, setStanAwalPhotos, currentLocationIndex, photoData, 'stan_awal');
        }
      };
      input.click();
    } else {
      Alert.alert(
        "Foto Stan Awal",
        "Bagaimana cara Anda ingin mengambil foto stan awal?",
        [
          { text: "Kamera", onPress: takeStanAwalPicture },
          { text: "Galeri", onPress: pickStanAwalFromGallery },
          { text: "Batal", style: "cancel" },
        ],
        { cancelable: true }
      );
    }
  };

  const takeStanAwalPicture = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses kamera.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocationPhoto(stanAwalPhotos, setStanAwalPhotos, currentLocationIndex, result.assets[0], 'stan_awal');
      }
    } catch (error) {
      Alert.alert("Error", "Gagal mengambil foto stan awal");
    }
  };

  const pickStanAwalFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses galeri foto.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocationPhoto(stanAwalPhotos, setStanAwalPhotos, currentLocationIndex, result.assets[0], 'stan_awal');
      }
    } catch (error) {
      Alert.alert("Error", "Gagal memilih foto stan awal");
    }
  };

  // Stan Akhir photo handlers
  const handleStanAkhirPhoto = () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement | null;
        if (target && target.files && target.files[0]) {
          const file = target.files[0];
          const photoData = {
            uri: URL.createObjectURL(file),
            fileName: file.name,
            type: file.type,
          };
          setLocationPhoto(stanAkhirPhotos, setStanAkhirPhotos, currentLocationIndex, photoData, 'stan_akhir');
        }
      };
      input.click();
    } else {
      Alert.alert(
        "Foto Stan Akhir",
        "Bagaimana cara Anda ingin mengambil foto stan akhir?",
        [
          { text: "Kamera", onPress: takeStanAkhirPicture },
          { text: "Galeri", onPress: pickStanAkhirFromGallery },
          { text: "Batal", style: "cancel" },
        ],
        { cancelable: true }
      );
    }
  };

  const takeStanAkhirPicture = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses kamera.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocationPhoto(stanAkhirPhotos, setStanAkhirPhotos, currentLocationIndex, result.assets[0], 'stan_akhir');
      }
    } catch (error) {
      Alert.alert("Error", "Gagal mengambil foto stan akhir");
    }
  };

  const pickStanAkhirFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses galeri foto.",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocationPhoto(stanAkhirPhotos, setStanAkhirPhotos, currentLocationIndex, result.assets[0], 'stan_akhir');
      }
    } catch (error) {
      Alert.alert("Error", "Gagal memilih foto stan akhir");
    }
  };

  // Helper functions for location-specific photos
  const getLocationPhoto = (photoArray: any[], locationIndex: number) => {
    return photoArray[locationIndex] || null;
  };

  const setLocationPhoto = async (
    photoArray: any[], 
    setPhotoArray: React.Dispatch<React.SetStateAction<any[]>>, 
    locationIndex: number, 
    photo: any,
    photoType: string
  ) => {
    const newArray = [...photoArray];
    newArray[locationIndex] = photo;
    setPhotoArray(newArray);
    
    // Save to AsyncStorage immediately
    if (trip?.id) {
      await savePhotosToStorage(trip.id, newArray, photoType);
    }
  };

  const clearLocationPhoto = async (
    photoArray: any[], 
    setPhotoArray: React.Dispatch<React.SetStateAction<any[]>>, 
    locationIndex: number,
    photoType: string
  ) => {
    const newArray = [...photoArray];
    newArray[locationIndex] = null;
    setPhotoArray(newArray);
    
    // Save to AsyncStorage immediately
    if (trip?.id) {
      await savePhotosToStorage(trip.id, newArray, photoType);
    }
  };

  // AsyncStorage functions for photo persistence
  const getStorageKey = (tripId: number, photoType: string) => {
    return `trip_${tripId}_${photoType}_photos`;
  };

  const savePhotosToStorage = async (tripId: number, photos: any[], photoType: string) => {
    try {
      const key = getStorageKey(tripId, photoType);
      await AsyncStorage.setItem(key, JSON.stringify(photos));
      console.log(`Saved ${photoType} photos for trip ${tripId}:`, photos.length);
    } catch (error) {
      console.error(`Error saving ${photoType} photos:`, error);
    }
  };

  const loadPhotosFromStorage = async (tripId: number, photoType: string) => {
    try {
      const key = getStorageKey(tripId, photoType);
      const saved = await AsyncStorage.getItem(key);
      if (saved) {
        const photos = JSON.parse(saved);
        console.log(`Loaded ${photoType} photos for trip ${tripId}:`, photos.length);
        return photos;
      }
    } catch (error) {
      console.error(`Error loading ${photoType} photos:`, error);
    }
    return [];
  };

  const clearAllPhotosFromStorage = async (tripId: number) => {
    try {
      const photoTypes = ['pressure_bar', 'temperature', 'stan_awal', 'stan_akhir'];
      for (const type of photoTypes) {
        const key = getStorageKey(tripId, type);
        await AsyncStorage.removeItem(key);
      }
      console.log(`Cleared all photos for trip ${tripId}`);
    } catch (error) {
      console.error('Error clearing photos from storage:', error);
    }
  };

  // Helper functions for multiple customer locations
  const getAllCustomerLocations = () => {
    if (!trip) return [];
    
    const locations = [];
    
    // Add primary unload location
    if (trip.unload_location && trip.unload_latitude && trip.unload_longitude) {
      locations.push({
        location: trip.unload_location,
        latitude: parseFloat(trip.unload_latitude),
        longitude: parseFloat(trip.unload_longitude),
      });
    }
    
    // Add additional unload locations
    if (trip.additional_unload_locations) {
      trip.additional_unload_locations.forEach((loc) => {
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

  const getCurrentCustomerLocation = () => {
    const allLocations = getAllCustomerLocations();
    return allLocations[currentCustomerLocationIndex] || null;
  };

  const getNextCustomerLocation = () => {
    const allLocations = getAllCustomerLocations();
    return allLocations[currentCustomerLocationIndex + 1] || null;
  };

  const hasMoreCustomerLocations = () => {
    const allLocations = getAllCustomerLocations();
    return currentCustomerLocationIndex < allLocations.length - 1;
  };

  const moveToNextCustomerLocation = () => {
    if (hasMoreCustomerLocations()) {
      setCurrentCustomerLocationIndex(prev => prev + 1);
    }
  };

  const handleNextLocation = async () => {
    if (!trip || !hasMoreCustomerLocations()) return;
    
    try {
      // Complete the current location first
      const response = await completeLocation(trip.id, currentCustomerLocationIndex);
      console.log('Complete location response:', response.data);
      
      // Update the trip data first to get the latest location documentation
      await fetchTripDetails();
      
      // Move to next location in UI
      setCurrentCustomerLocationIndex(prev => prev + 1);
      
      // Show success message with context
      const allLocations = getAllCustomerLocations();
      const completedLocation = allLocations[currentCustomerLocationIndex];
      const nextLocation = allLocations[currentCustomerLocationIndex + 1];
      
      Alert.alert(
        "Berhasil",
        response.data.data?.has_more_locations 
          ? `Lokasi "${completedLocation?.location || `Lokasi ${currentCustomerLocationIndex + 1}`}" selesai. Selanjutnya menuju "${nextLocation?.location || `Lokasi ${currentCustomerLocationIndex + 2}`}".`
          : `Semua lokasi selesai! Tugas "${trip.do_number}" siap diselesaikan.`
      );
      
      // If this was the last location, clear photos from storage
      if (!response.data.data?.has_more_locations && trip?.id) {
        await clearAllPhotosFromStorage(trip.id);
        console.log("Cleared all photos - trip completed");
      }
    } catch (err: any) {
      console.error('Error in handleNextLocation:', err);
      Alert.alert(
        "Error",
        err.response?.data?.message || "Gagal menyelesaikan lokasi"
      );
    }
  };

  const getNavigationTarget = (): LocationData | null => {
    if (!trip) return null;

    const loadLat = parseFloat(trip.load_latitude);
    const loadLng = parseFloat(trip.load_longitude);

    // Smart routing based on DO status
    switch (trip.status) {
      case "assigned":
      case "at_spbu":
        return {
          latitude: loadLat,
          longitude: loadLng,
          address: trip.load_location,
          type: "load",
        };
      case "otw_to_unload_location":
      case "at_unload_location":
        // Use current customer location instead of primary unload location
        const currentLocation = getCurrentCustomerLocation();
        if (currentLocation) {
          return {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            address: currentLocation.location,
            type: "unload",
          };
        }
        // Fallback to primary unload location if no current location
        const unloadLat = parseFloat(trip.unload_latitude);
        const unloadLng = parseFloat(trip.unload_longitude);
        return {
          latitude: unloadLat,
          longitude: unloadLng,
          address: trip.unload_location,
          type: "unload",
        };
      default:
        return null;
    }
  };

  const handleBack = () => {
    try {
      // Check if we can go back
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback: navigate to driver dashboard
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.log("Back navigation failed, using fallback Error: ", error);
      // Ultimate fallback
      router.replace("/(tabs)");
    }
  };

  const handleOpenMap = () => {
    if (!trip) return;

    // Use current customer location for unload coordinates
    const currentLocation = getCurrentCustomerLocation();
    const unloadLat = currentLocation?.latitude?.toString() || trip.unload_latitude;
    const unloadLng = currentLocation?.longitude?.toString() || trip.unload_longitude;
    const unloadAddress = currentLocation?.location || trip.unload_location;

    router.push({
      pathname: "/trip-map-view",
      params: {
        doId: trip.id.toString(),
        loadLat: trip.load_latitude,
        loadLng: trip.load_longitude,
        loadAddress: trip.load_location,
        unloadLat: unloadLat,
        unloadLng: unloadLng,
        unloadAddress: unloadAddress,
        status: trip.status,
        doNumber: trip.do_number,
      },
    });
  };

  const handleNavigate = async (app: "google" | "waze") => {
    const target = getNavigationTarget();
    if (!target) {
      Alert.alert("Error", "No navigation target available");
      return;
    }

    let url = "";

    if (app === "google") {
      if (Platform.OS === "ios") {
        url = `http://maps.apple.com/?q=${target.latitude},${target.longitude}`;
      } else {
        url = `geo:${target.latitude},${target.longitude}?q=${
          target.latitude
        },${target.longitude}(${
          target.type === "load" ? "Loading" : "Unloading"
        } Location)`;
      }
    } else if (app === "waze") {
      url = `https://waze.com/ul?ll=${target.latitude},${target.longitude}&navigate=yes`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Error",
          `${app === "google" ? "Maps" : "Waze"} app not installed`
        );
      }
    } catch (error) {
      console.error("Failed to open navigation app:", error);
      Alert.alert("Error", "Failed to open navigation app");
    }
  };

  const getNavigationIcon = () => {
    const target = getNavigationTarget();
    if (!target) return "map-marker-alt";

    return target.type === "load" ? "arrow-up" : "arrow-down";
  };

  const resetExpenseForm = () => {
    setExpenseForm({ jenis: "", amount: "", notes: "" });
    setReceiptImage(null);
  };

  const resetBudgetRequestForm = () => {
    setBudgetRequestForm({ requested_amount: "", reason: "" });
    setEvidenceImage(null);
  };

  const validateExpenseForm = () => {
    if (!expenseForm.jenis) {
      return false;
    }
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      return false;
    }
    if (trip && parseFloat(expenseForm.amount) > trip.remaining_allowance) {
      return false;
    }
    return true;
  };

  const validateBudgetRequestForm = () => {
    if (!budgetRequestForm.requested_amount || parseFloat(budgetRequestForm.requested_amount) <= 0) {
      Alert.alert("Error", "Masukkan jumlah tambahan uang jalan yang valid");
      return false;
    }
    if (!budgetRequestForm.reason || budgetRequestForm.reason.trim().length === 0) {
      Alert.alert("Error", "Masukkan alasan permohonan");
      return false;
    }
    return true;
  };

  // CHECK apakah DO sudah completed
  const isTripCompleted = trip?.status === "completed";

  const handleSubmitExpense = async () => {
    // TAMBAH CHECK: Prevent expense creation untuk completed trips
    if (isTripCompleted) {
      Alert.alert(
        "Tidak Dapat Menambah Pengeluaran",
        "Perjalanan ini sudah selesai. Pengeluaran tidak dapat ditambahkan lagi.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!validateExpenseForm() || !trip) return;

    // Submit directly without confirmation
    await submitExpenseToServer();
  };

  // FUNCTION BARU - Pisahkan logic submit ke server
  const submitExpenseToServer = async () => {
    if (!trip) {
      console.error("No trip data available");
      return;
    }

    if (!trip.id) {
      console.error("Trip ID is missing:", trip);
      Alert.alert("Error", "Trip ID is missing. Please refresh and try again.");
      return;
    }

    setSubmittingExpense(true);
    console.log("Starting expense submission process..."); // Add debug log
    console.log("Trip data:", trip); // Log trip data

    try {
      let imageData = null;
      if (receiptImage) {
        console.log("Receipt image:", receiptImage); // Log receipt data

        // Ensure we have the proper structure based on platform
        imageData =
          Platform.OS === "web"
            ? receiptImage // On web, we should already have the right format
            : {
                uri: receiptImage.uri,
                type: receiptImage.type || "image/jpeg",
                name: receiptImage.fileName || "receipt.jpg",
              };
      }

      const expenseData = {
        delivery_order_id: trip.id,
        jenis: expenseForm.jenis,
        amount: parseFloat(expenseForm.amount),
        notes: expenseForm.notes,
        receipt: imageData,
      };
      console.log("Submitting expense data:", expenseData); // Log the data being sent

      const response = await createDriverExpense(expenseData);

      console.log("Expense submission response:", response.data); // Log response

      // Success handling
      // 3. TUTUP MODAL DAHULU, BARU SHOW SUCCESS MESSAGE
      setShowExpenseModal(false);
      resetExpenseForm();
      // 4. REFRESH DATA DI BACKGROUND
      await fetchTripDetails();

      // Success notification removed as requested
      // Modal closed and data refreshed
    } catch (error: any) {
      console.error("Error submitting expense:", error); // Error logging

      // Full error details
      if (error.response) {
        console.error("Response error data:", error.response.data);
        console.error("Response error status:", error.response.status);
      }

      // Log error without showing popup
      console.error("Failed to save expense:", error.response?.data?.message || error.message);
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleSubmitBudgetRequest = async () => {
    console.log("🔥 DEBUG: handleSubmitBudgetRequest called");
    if (isTripCompleted) {
      console.log("🔥 DEBUG: Trip is completed, cannot submit budget request");
      Alert.alert(
        "Tidak Dapat Mengajukan Tambahan Budget",
        "Perjalanan ini sudah selesai. Permohonan tambahan uang jalan tidak dapat diajukan lagi.",
        [{ text: "OK" }]
      );
      return;
    }

    console.log("🔥 DEBUG: Validating form...");
    const isFormValid = validateBudgetRequestForm();
    console.log("🔥 DEBUG: Form validation result:", isFormValid);
    console.log("🔥 DEBUG: Trip object:", trip ? "exists" : "missing");
    
    if (!isFormValid || !trip) {
      console.log("🔥 DEBUG: Form validation failed or trip missing, returning");
      return;
    }

    // Check if there's already a pending budget request
    const pendingRequest = budgetRequests.find(req => req.status === 'pending');
    console.log("🔥 DEBUG: Checking for pending requests:", pendingRequest);
    if (pendingRequest) {
      console.log("🔥 DEBUG: Found pending request, showing alert");
      Alert.alert(
        "Permohonan Sudah Ada",
        "Anda sudah memiliki permohonan tambahan uang jalan yang sedang diproses. Tunggu hingga permohonan sebelumnya disetujui atau ditolak.",
        [{ text: "OK" }]
      );
      return;
    }

    console.log("🔥 DEBUG: Submitting budget request immediately");
    
    // Navigate back immediately to show that request has been submitted
    router.back();
    
    // Submit in background
    submitBudgetRequestToServer();
  };

  const submitBudgetRequestToServer = async () => {
    if (!trip) {
      console.error("No trip data available");
      return;
    }

    if (!trip.id) {
      console.error("Trip ID is missing:", trip);
      Alert.alert("Error", "Trip ID is missing. Please refresh and try again.");
      return;
    }

    setSubmittingBudgetRequest(true);
    console.log("Starting budget request submission process...");
    console.log("Trip data:", trip); // Log trip data

    try {
      let imageData = null;
      if (evidenceImage) {
        console.log("Evidence image:", evidenceImage);

        imageData =
          Platform.OS === "web"
            ? evidenceImage
            : {
                uri: evidenceImage.uri,
                type: evidenceImage.type || "image/jpeg",
                name: evidenceImage.fileName || "evidence.jpg",
              };
      }

      const requestData = {
        delivery_order_id: trip.id,
        requested_amount: parseFloat(budgetRequestForm.requested_amount),
        reason: budgetRequestForm.reason,
        evidence: imageData,
      };
      console.log("Submitting budget request data:", requestData);

      const response = await createBudgetRequest(requestData);
      console.log("Budget request submission response:", response.data);

      // Success handling
      setShowBudgetRequestModal(false);
      resetBudgetRequestForm();
      
      // Refresh data to show new budget request
      await fetchTripDetails();
    } catch (error: any) {
      console.error("Error submitting budget request:", error);

      if (error.response) {
        console.error("Response error data:", error.response.data);
        console.error("Response error status:", error.response.status);
      }

      if (Platform.OS === "web") {
        window.alert(
          "❌ Gagal Mengajukan: " +
            (error.response?.data?.message ||
              error.message ||
              "Terjadi kesalahan")
        );
      } else {
        Alert.alert(
          "❌ Gagal Mengajukan",
          error.response?.data?.message ||
            error.message ||
            "Terjadi kesalahan saat mengajukan tambahan uang jalan. Silakan coba lagi.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setSubmittingBudgetRequest(false);
    }
  };

  const handleSaveDocumentation = async () => {
    if (!trip) return;

    try {
      console.log("Saving documentation for location:", currentLocationIndex);
      
      // Collect photos for the current location
      const currentPressureBarPhoto = getLocationPhoto(pressureBarPhotos, currentLocationIndex);
      const currentTemperaturePhoto = getLocationPhoto(temperaturePhotos, currentLocationIndex);
      const currentStanAwalPhoto = getLocationPhoto(stanAwalPhotos, currentLocationIndex);
      const currentStanAkhirPhoto = getLocationPhoto(stanAkhirPhotos, currentLocationIndex);

      const documentationData = {
        pressureBarPhotos: currentPressureBarPhoto ? [currentPressureBarPhoto] : [],
        temperaturePhotos: currentTemperaturePhoto ? [currentTemperaturePhoto] : [],
        stanAwalPhotos: currentStanAwalPhoto ? [currentStanAwalPhoto] : [],
        stanAkhirPhotos: currentStanAkhirPhoto ? [currentStanAkhirPhoto] : [],
      };

      // Check if there are any photos to upload
      const hasPhotos = documentationData.pressureBarPhotos.length > 0 ||
                       documentationData.temperaturePhotos.length > 0 ||
                       documentationData.stanAwalPhotos.length > 0 ||
                       documentationData.stanAkhirPhotos.length > 0;

      if (!hasPhotos) {
        Alert.alert("Info", "Tidak ada foto dokumentasi untuk diupload.", [{ text: "OK" }]);
        setShowLocationDocModal(false);
        return;
      }

      console.log("Documentation data to upload:", {
        currentLocationIndex,
        pressureBarCount: documentationData.pressureBarPhotos.length,
        temperatureCount: documentationData.temperaturePhotos.length,
        stanAwalCount: documentationData.stanAwalPhotos.length,
        stanAkhirCount: documentationData.stanAkhirPhotos.length,
      });

      // Upload documentation photos
      await uploadDocumentationPhotos(trip.id, currentLocationIndex, documentationData);
      
      setShowLocationDocModal(false);
      await fetchTripDetails(); // Refresh data to show updated documentation

      Alert.alert(
        "Berhasil!",
        "Dokumentasi berhasil diupload ke server.",
        [{ text: "OK" }]
      );
      
    } catch (error: any) {
      console.error("Documentation upload error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Gagal mengupload dokumentasi"
      );
    }
  };

  const getExpenseTypeLabel = (jenis: string) => {
    const typeMap: { [key: string]: string } = {
      bbm: "BBM/Solar",
      tol: "Tol",
      parkir: "Parkir",
      makan: "Makan",
      pengeluaran_tambahan: "Tambah Pengeluaran",
      lainnya: "Lain-lain",
    };
    return typeMap[jenis] || jenis;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: 'clock', color: '#f39c12', label: 'Menunggu Persetujuan' };
      case 'approved':
        return { icon: 'check-circle', color: '#27ae60', label: 'Disetujui' };
      case 'rejected':
        return { icon: 'times-circle', color: '#e74c3c', label: 'Ditolak' };
      default:
        return { icon: 'check-circle', color: '#27ae60', label: 'Disetujui' };
    }
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const statusInfo = getStatusInfo(item.status || 'approved');
    
    return (
      <View style={styles.expenseItem}>
        <FontAwesome5 name="receipt" size={20} color="#3498db" />
        <View style={styles.expenseDetails}>
          <View style={styles.expenseHeader}>
            <Text style={styles.expenseType}>{getExpenseTypeLabel(item.jenis)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <FontAwesome5 name={statusInfo.icon} size={12} color="#fff" />
              <Text style={styles.statusText}>{statusInfo.label}</Text>
            </View>
          </View>
          <Text style={styles.expenseDate}>
            {new Date(item.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
          {item.notes && <Text style={styles.expenseNotes}>{item.notes}</Text>}
          {item.status === 'rejected' && item.rejection_reason && (
            <Text style={styles.rejectionReason}>
              Alasan: {item.rejection_reason}
            </Text>
          )}
        </View>
        <View style={styles.expenseAmountContainer}>
          <Text style={[
            styles.expenseAmount,
            item.status === 'rejected' && styles.rejectedAmount
          ]}>
            -Rp {Number(item.amount).toLocaleString("id-ID")}
          </Text>
          {item.receipt_url && (
            <FontAwesome5
              name="camera"
              size={16}
              color="#27ae60"
              style={{ marginTop: 4 }}
            />
          )}
        </View>
      </View>
    );
  };

  const handleSuratJalanUpload = async (photos: any[]) => {
    if (!trip) return;

    setUploadingSuratJalan(true);
    try {
      console.log("Starting surat jalan upload process...");
      console.log("Trip ID:", trip.id);
      console.log("Surat jalan photos:", photos);

      await uploadSuratJalanPhoto(trip.id, photos);
      setShowSuratJalanModal(false);
      setSuratJalanPhotos([]);
      await fetchTripDetails(); // Refresh data

      Alert.alert(
        "Berhasil!",
        `${photos.length} foto surat jalan berhasil diupload.`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("Surat jalan upload error:", error);
      
      let errorMessage = "Gagal mengunggah foto surat jalan";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setUploadingSuratJalan(false);
    }
  };


  const handleLoadConfirmation = async (loadData: {
    actual_load_quantity: number;
    surat_jalan_photo: any;
  }) => {
    if (!trip) return;

    setSubmittingLoad(true);
    try {
      // Add debug logs
      console.log("Calling confirmLoad with:", {
        doId: trip.id,
        loadData
      });

      await confirmLoad(trip.id, loadData);
      setShowLoadConfirmation(false);
      await fetchTripDetails();
      Alert.alert(
        "Berhasil!",
        "Muatan berhasil dikonfirmasi. Perjalanan ke lokasi bongkar dimulai.",
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("Confirm load error:", error);
      
      let errorMessage = "Gagal mengkonfirmasi muatan";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setSubmittingLoad(false);
    }
  };

  // Nota Kecil handler functions
  const handleNotaKecilCreated = async (notaKecil: any) => {
    // Add to local state immediately for better UX
    setNotaKecils(prev => [notaKecil, ...prev]);
    setShowNotaKecilModal(false);
    
    // Refresh the full list from server to ensure consistency
    if (id) {
      await fetchNotaKecils(id);
    }
    
    Alert.alert('Success', 'Nota Kecil created successfully!');
  };

  const handleCreateNotaKecil = () => {
    setShowNotaKecilModal(true);
  };

  const handleViewNotaKecils = async () => {
    // Refresh nota kecils before showing the modal
    if (id) {
      await fetchNotaKecils(id);
    }
    setShowNotaKecilListModal(true);
  };

  const getStatusActions = () => {
    if (!trip) return null;

    switch (trip.status) {
      case "at_spbu":
        return (
          <TouchableOpacity
            style={[styles.statusActionButton, { backgroundColor: "#e67e22" }]}
            onPress={() => setShowLoadConfirmation(true)}
          >
            <FontAwesome5 name="clipboard-check" size={20} color="#fff" />
            <Text style={styles.statusActionText}>
              Konfirmasi Muatan & Berangkat
            </Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Memuat detail perjalanan...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centered}>
        <Text>Detail trip tidak ditemukan.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3b82f6"]}
            tintColor="#3b82f6"
          />
        }
      >
        {/* ✅ Header Card - Clean & Consistent */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <FontAwesome5 name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detail Perjalanan</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.headerContent}>
            <View style={styles.headerRow}>
              <Text style={styles.doNumber}>{trip.do_number}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(trip.status) },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {getStatusText(trip.status)}
                </Text>
              </View>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.customerName}>{trip.customer_name}</Text>
              <Text style={styles.itemName}>{trip.item_name}</Text>
            </View>
          </View>
        </View>

        {/* ✅ Saldo Card - Tetap Konsisten dengan Pattern */}
        <View
          style={[styles.saldoCard, isTripCompleted && styles.completedCard]}
        >
          {isTripCompleted && (
            <View style={styles.completedBadge}>
              <FontAwesome5 name="check-circle" size={24} color="#fff" />
              <Text style={styles.completedText}>PERJALANAN SELESAI</Text>
            </View>
          )}
          <Text style={styles.saldoTitle}>Sisa Uang Jalan</Text>
          <Text style={styles.saldoAmount}>
            Rp {Number(trip.remaining_allowance).toLocaleString("id-ID")}
          </Text>
          <View style={styles.saldoBreakdown}>
            <Text style={styles.breakdownText}>
              Uang Jalan: Rp{" "}
              {Number(trip.trip_allowance).toLocaleString("id-ID")}
            </Text>
            <Text style={styles.breakdownText}>
              Total Pengeluaran: Rp{" "}
              {Number(trip.expenses_total).toLocaleString("id-ID")}
            </Text>
          </View>
        </View>

        {/* KARTU DETAIL TRIP */}
        <View style={styles.detailCard}>
          <Text style={styles.cardTitle}>Detail Perjalanan</Text>
          <Text style={styles.detailText}>Tugas: {trip.do_number}</Text>
          <Text style={styles.detailText}>Customer: {trip.customer_name}</Text>
          <Text style={styles.detailText}>
            Rute: {trip.load_location} → {getCurrentCustomerLocation()?.location || trip.unload_location}
            {hasMoreCustomerLocations() && (
              <Text style={styles.nextLocationText}>
                {'\n'}Selanjutnya: {getNextCustomerLocation()?.location}
              </Text>
            )}
          </Text>
          <View style={styles.statusContainer}>
            <Text style={styles.detailText}>Status: </Text>
            <View style={[styles.statusBadge, getStatusStyle(trip.status)]}>
              <Text style={styles.statusBadgeText}>
                {getStatusText(trip.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* 📍 Location, Navigation & Details Card */}
        <View style={styles.detailCard}>
          <Text style={styles.cardTitle}>📍 Lokasi & Navigasi</Text>

          {/* SPBU Location */}
          <TouchableOpacity
            style={styles.locationFlowItem}
            onPress={() =>
              router.push({
                pathname: "/map-view",
                params: {
                  lat: trip.load_latitude,
                  lng: trip.load_longitude,
                  title: trip.load_location,
                  type: "load",
                },
              })
            }
          >
            <View style={styles.locationFlowIndex}>
              <FontAwesome5 name="gas-pump" size={14} color="#fff" />
            </View>
            <View style={styles.locationFlowContent}>
              <Text style={styles.locationFlowLabel}>SPBU Location</Text>
              <Text style={styles.locationFlowValue}>{trip.load_location}</Text>
              <Text style={styles.locationFlowCoords}>
                {parseFloat(trip.load_latitude).toFixed(6)}, {parseFloat(trip.load_longitude).toFixed(6)}
              </Text>
            </View>
            <FontAwesome5 name="map-marker-alt" size={16} color="#3498db" />
          </TouchableOpacity>

          {/* Customer Locations Flow */}
          {getAllCustomerLocations().map((location, index) => (
            <View key={index}>
              {/* Connection Line */}
              <View style={styles.connectionLine} />
              
              <TouchableOpacity
                style={[
                  styles.locationFlowItem,
                  index === currentCustomerLocationIndex && styles.currentLocationFlowItem
                ]}
                onPress={() => {
                  setCurrentCustomerLocationIndex(index);
                  router.push({
                    pathname: "/map-view",
                    params: {
                      lat: location.latitude.toString(),
                      lng: location.longitude.toString(),
                      title: location.location,
                      type: "unload",
                    },
                  });
                }}
              >
                <View style={[
                  styles.locationFlowIndex,
                  index === currentCustomerLocationIndex && styles.currentLocationFlowIndex
                ]}>
                  <Text style={[
                    styles.locationFlowIndexText,
                    index === currentCustomerLocationIndex && styles.currentLocationFlowIndexText
                  ]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.locationFlowContent}>
                  <Text style={[
                    styles.locationFlowLabel,
                    index === currentCustomerLocationIndex && styles.currentLocationFlowLabel
                  ]}>
                    Location {index + 1}
                    {index === currentCustomerLocationIndex && ' (Current)'}
                  </Text>
                  <Text style={[
                    styles.locationFlowValue,
                    index === currentCustomerLocationIndex && styles.currentLocationFlowValue
                  ]}>
                    {location.location}
                  </Text>
                  <Text style={styles.locationFlowCoords}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                </View>
                <FontAwesome5 
                  name="map-marker-alt" 
                  size={16} 
                  color={index === currentCustomerLocationIndex ? "#3b82f6" : "#e74c3c"} 
                />
              </TouchableOpacity>
            </View>
          ))}

          {/* Show next location hint if there are more */}
          {hasMoreCustomerLocations() && (
            <View style={styles.nextLocationHint}>
              <FontAwesome5 name="arrow-down" size={14} color="#666" />
              <Text style={styles.nextLocationHintText}>
                Selanjutnya: {getNextCustomerLocation()?.location}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View
            style={{ height: 1, backgroundColor: "#eee", marginVertical: 16 }}
          />

          {/* Quick Navigation for Multiple Locations */}
          {getAllCustomerLocations().length > 1 && (
            <>
              <View style={styles.locationNavButtons}>
                <TouchableOpacity
                  style={[styles.navButton, currentCustomerLocationIndex === 0 && styles.navButtonDisabled]}
                  onPress={() => setCurrentCustomerLocationIndex(Math.max(0, currentCustomerLocationIndex - 1))}
                  disabled={currentCustomerLocationIndex === 0}
                >
                  <FontAwesome5 name="chevron-left" size={16} color={currentCustomerLocationIndex === 0 ? "#ccc" : "#3b82f6"} />
                  <Text style={[styles.navButtonText, currentCustomerLocationIndex === 0 && styles.navButtonTextDisabled]}>
                    Sebelumnya
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.navButton, !hasMoreCustomerLocations() && styles.navButtonDisabled]}
                  onPress={handleNextLocation}
                  disabled={!hasMoreCustomerLocations()}
                >
                  <Text style={[styles.navButtonText, !hasMoreCustomerLocations() && styles.navButtonTextDisabled]}>
                    {hasMoreCustomerLocations() ? "Lokasi Berikutnya" : "Selesaikan"}
                  </Text>
                  <FontAwesome5 name="chevron-right" size={16} color={!hasMoreCustomerLocations() ? "#ccc" : "#3b82f6"} />
                </TouchableOpacity>
              </View>

              <View
                style={{ height: 1, backgroundColor: "#eee", marginVertical: 16 }}
              />
            </>
          )}

          {/* Map Preview Button */}
          <TouchableOpacity
            style={styles.mapPreviewButton}
            onPress={handleOpenMap}
          >
            <View style={styles.mapPreviewContent}>
              <FontAwesome5 name="map" size={32} color="#3b82f6" />
              <View style={styles.mapPreviewText}>
                <Text style={styles.mapPreviewTitle}>Lihat Rute</Text>
                <Text style={styles.mapPreviewSubtitle}>
                  Lihat lokasi muat dan bongkar
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color="#6b7280" />
            </View>
          </TouchableOpacity>

          {/* Current Navigation Target */}
          {getNavigationTarget() && (
            <View style={styles.navigationTarget}>
              <View style={styles.navigationHeader}>
                <FontAwesome5
                  name={getNavigationIcon()}
                  size={20}
                  color={
                    getNavigationTarget()?.type === "load"
                      ? "#3498db"
                      : "#e74c3c"
                  }
                />
                <Text style={styles.navigationTitle}>
                  Tujuan Berikutnya:{" "}
                  {getNavigationTarget()?.type === "load"
                    ? "Loading"
                    : "Unloading"}
                </Text>
              </View>
              <Text style={styles.navigationAddress}>
                {getNavigationTarget()?.address}
              </Text>
              {/* Navigation Buttons */}
              <View style={styles.navigationButtons}>
                <TouchableOpacity
                  style={[styles.navButton, styles.googleButton]}
                  onPress={() => handleNavigate("google")}
                >
                  <FontAwesome5 name="directions" size={16} color="#fff" />
                  <Text style={styles.navButtonText}>
                    {Platform.OS === "ios" ? "Apple Maps" : "Google Maps"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navButton, styles.wazeButton]}
                  onPress={() => handleNavigate("waze")}
                >
                  <FontAwesome5 name="route" size={16} color="#fff" />
                  <Text style={styles.navButtonText}>Waze</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* SURAT JALAN PHOTOS SECTION */}
        {trip.status !== "assigned" && trip.status !== "at_spbu" && (
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>📄 Foto Surat Jalan</Text>
            
            {trip.surat_jalan_photo_url && Array.isArray(trip.surat_jalan_photo_url) && trip.surat_jalan_photo_url.length > 0 ? (
              <View>
                <Text style={styles.photoCountText}>
                  {trip.surat_jalan_photo_url.length} foto surat jalan telah diupload
                </Text>
                <TouchableOpacity
                  style={styles.addMorePhotosButton}
                  onPress={() => setShowSuratJalanModal(true)}
                  disabled={isTripCompleted}
                >
                  <FontAwesome5 name="plus" size={16} color="#3b82f6" />
                  <Text style={styles.addMorePhotosText}>
                    {isTripCompleted ? "Perjalanan selesai" : "Tambah Foto"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.noPhotosText}>
                  Belum ada foto surat jalan yang diupload
                </Text>
                {!isTripCompleted && (
                  <TouchableOpacity
                    style={styles.uploadSuratJalanButton}
                    onPress={() => setShowSuratJalanModal(true)}
                  >
                    <FontAwesome5 name="camera" size={20} color="#fff" />
                    <Text style={styles.uploadSuratJalanText}>
                      Upload Foto Surat Jalan
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* NOTA KECIL SECTION */}
        {trip.status !== "assigned" && trip.status !== "at_spbu" && (
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>📋 Nota Kecil per Lokasi</Text>
            
            {getAllCustomerLocations().map((location, index) => {
              return (
                <View key={index} style={styles.locationDocItem}>
                  {!isTripCompleted && (
                    <View style={styles.locationActionButtons}>
                      {/* Lengkapi Button */}
                      <TouchableOpacity
                        style={styles.notaKecilButton}
                        onPress={handleCreateNotaKecil}
                      >
                        <FontAwesome5 name="receipt" size={16} color="#fff" />
                        <Text style={styles.notaKecilButtonText}>Buat Nota Kecil</Text>
                      </TouchableOpacity>

                      {notaKecils.length > 0 && (
                        <TouchableOpacity
                          style={styles.viewNotaKecilsButton}
                          onPress={handleViewNotaKecils}
                        >
                          <FontAwesome5 name="list" size={16} color="#3b82f6" />
                          <Text style={styles.viewNotaKecilsButtonText}>View ({notaKecils.length})</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            
            {getAllCustomerLocations().length === 0 && (
              <Text style={styles.noLocationsText}>
                Tidak ada lokasi pelanggan yang tersedia
              </Text>
            )}
          </View>
        )}

        {/* RIWAYAT PENGELUARAN */}
        <View style={styles.historyCard}>
          <Text style={styles.cardTitle}>
            Riwayat Pengeluaran
            {isTripCompleted && (
              <Text style={styles.readOnlyIndicator}> (Final)</Text>
            )}
          </Text>
          <FlatList
            data={trip.expenses}
            renderItem={renderExpenseItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {isTripCompleted
                  ? "Tidak ada pengeluaran yang tercatat untuk perjalanan ini."
                  : "Belum ada pengeluaran."}
              </Text>
            }
          />
          {/* PESAN INFO untuk completed trip */}
          {isTripCompleted && (
            <View style={styles.infoContainer}>
              <FontAwesome5 name="info-circle" size={16} color="#3498db" />
              <Text style={styles.infoText}>
                Perjalanan ini telah selesai. Data pengeluaran bersifat final
                dan tidak dapat diubah.
              </Text>
            </View>
          )}
        </View>

        {getStatusActions()}

        <View style={{ alignItems: "center", marginVertical: 6 }}>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#eee",
              paddingHorizontal: 20,
              paddingVertical: 5,
              borderRadius: 8,
            }}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="arrow-left" size={16} color="#333" />
            <Text style={{ marginLeft: 8, fontSize: 16, color: "#333" }}>
              Kembali
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ACTION MENU - Sembunyikan untuk completed trips */}
      {!isTripCompleted && (
        <>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowActionMenu(true)}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="plus" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Action Menu Modal */}
          <Modal
            visible={showActionMenu}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowActionMenu(false)}
          >
            <TouchableOpacity
              style={styles.actionMenuOverlay}
              activeOpacity={1}
              onPress={() => setShowActionMenu(false)}
            >
              <View style={styles.actionMenuContainer}>
                <Text style={styles.actionMenuTitle}>Pilih Aksi</Text>
                
                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => {
                    setShowActionMenu(false);
                    setShowExpenseModal(true);
                  }}
                >
                  <FontAwesome5 name="receipt" size={20} color="#3b82f6" />
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuText}>Catat Pengeluaran</Text>
                    <Text style={styles.actionMenuSubtext}>BBM, tol, parkir, makan, dll</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={16} color="#6b7280" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionMenuItem}
                  onPress={() => {
                    setShowActionMenu(false);
                    setShowBudgetRequestModal(true);
                  }}
                >
                  <FontAwesome5 name="money-bill-alt" size={20} color="#10b981" />
                  <View style={styles.actionMenuTextContainer}>
                    <Text style={styles.actionMenuText}>Ajukan Tambahan Uang Jalan</Text>
                    <Text style={styles.actionMenuSubtext}>Permohonan penambahan budget</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={16} color="#6b7280" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionMenuCancel}
                  onPress={() => setShowActionMenu(false)}
                >
                  <Text style={styles.actionMenuCancelText}>Batal</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      {/* MODAL FORM EXPENSE */}
      <Modal
        visible={showExpenseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExpenseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tambah Pengeluaran</Text>
            <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
              <FontAwesome5 name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.formLabel}>Jenis Pengeluaran *</Text>
            <View style={styles.pickerContainer}>
              {Platform.OS === "web" ? (
                <select
                  value={expenseForm.jenis}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, jenis: e.target.value })
                  }
                  style={styles.webSelect}
                >
                  <option value="">Pilih jenis pengeluaran</option>
                  {expenseTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              ) : (
                <View style={styles.pickerButtons}>
                  {expenseTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.pickerButton,
                        expenseForm.jenis === type.value &&
                          styles.pickerButtonActive,
                      ]}
                      onPress={() =>
                        setExpenseForm({ ...expenseForm, jenis: type.value })
                      }
                    >
                      <Text
                        style={[
                          styles.pickerButtonText,
                          expenseForm.jenis === type.value &&
                            styles.pickerButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <Text style={styles.formLabel}>Jumlah (Rp) *</Text>
            <TextInput
              style={styles.formInput}
              value={expenseForm.amount}
              onChangeText={(value) =>
                setExpenseForm({ ...expenseForm, amount: value })
              }
              placeholder="Contoh: 50000"
              keyboardType="numeric"
            />
            <Text style={styles.formLabel}>
              Keterangan Pengeluaran (Opsional)
            </Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={expenseForm.notes}
              onChangeText={(value) =>
                setExpenseForm({ ...expenseForm, notes: value })
              }
              placeholder={
                expenseForm.jenis === "pengeluaran_tambahan"
                  ? "Jelaskan keperluan pengeluaran tambahan..."
                  : "Catatan tambahan..."
              }
              multiline
              numberOfLines={3}
            />
            <Text style={styles.formLabel}>
              Foto Bukti Pengeluaran (Opsional)
            </Text>
            {receiptImage ? (
              <View style={styles.imageContainer}>
                <View style={styles.imagePreviewContainer}>
                  <Text style={styles.imageSelected}>
                    ✓ Foto bukti telah dipilih
                  </Text>
                  <Text style={styles.imageDetails}>
                    {receiptImage.fileName || "receipt.jpg"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={showImagePicker}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeImageText}>Ganti Foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={showImagePicker}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="camera" size={20} color="#3b82f6" />
                <Text style={styles.imagePickerText}>
                  Ambil/Pilih Foto Bukti
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowExpenseModal(false);
                  resetExpenseForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submittingExpense && styles.disabledButton,
                  // Tambah style visual jika form belum lengkap
                  (!expenseForm.jenis || !expenseForm.amount) &&
                    styles.incompleteButton,
                ]}
                onPress={handleSubmitExpense}
                disabled={
                  submittingExpense || !expenseForm.jenis || !expenseForm.amount
                }
              >
                {submittingExpense ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[styles.submitButtonText, { marginLeft: 8 }]}>
                      Menyimpan...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>
                    Simpan Pengeluaran
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL FORM BUDGET REQUEST */}
      <Modal
        visible={showBudgetRequestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBudgetRequestModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajukan Tambahan Uang Jalan</Text>
            <TouchableOpacity onPress={() => setShowBudgetRequestModal(false)}>
              <FontAwesome5 name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.formLabel}>Jumlah Tambahan (Rp) *</Text>
            <TextInput
              style={styles.formInput}
              value={budgetRequestForm.requested_amount}
              onChangeText={(value) =>
                setBudgetRequestForm({ ...budgetRequestForm, requested_amount: value })
              }
              placeholder="Contoh: 100000"
              keyboardType="numeric"
            />

            <Text style={styles.formLabel}>Alasan Permohonan *</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={budgetRequestForm.reason}
              onChangeText={(value) =>
                setBudgetRequestForm({ ...budgetRequestForm, reason: value })
              }
              placeholder="Jelaskan alasan mengapa membutuhkan tambahan uang jalan..."
              multiline
              numberOfLines={4}
            />

            <Text style={styles.formLabel}>
              Foto Bukti Pendukung (Opsional)
            </Text>
            {evidenceImage ? (
              <View style={styles.imageContainer}>
                <View style={styles.imagePreviewContainer}>
                  <Text style={styles.imageSelected}>
                    ✓ Foto bukti telah dipilih
                  </Text>
                  <Text style={styles.imageDetails}>
                    {evidenceImage.fileName || "evidence.jpg"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={() => {
                    if (Platform.OS === "web") {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const target = e.target as HTMLInputElement | null;
                        if (target && target.files && target.files[0]) {
                          const file = target.files[0];
                          setEvidenceImage({
                            uri: URL.createObjectURL(file),
                            fileName: file.name,
                            type: file.type,
                          });
                        }
                      };
                      input.click();
                    } else {
                      showImagePicker();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeImageText}>Ganti Foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={() => {
                  if (Platform.OS === "web") {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement | null;
                      if (target && target.files && target.files[0]) {
                        const file = target.files[0];
                        setEvidenceImage({
                          uri: URL.createObjectURL(file),
                          fileName: file.name,
                          type: file.type,
                        });
                        Alert.alert("Berhasil", "Foto bukti berhasil dipilih!");
                      }
                    };
                    input.click();
                  } else {
                    Alert.alert(
                      "Pilih Foto Bukti",
                      "Bagaimana cara Anda ingin menambahkan foto?",
                      [
                        { text: "Kamera", onPress: () => {
                          // Use camera
                          ImagePicker.launchCameraAsync({
                            mediaTypes: ["images"],
                            allowsEditing: false,
                            quality: 0.8,
                            base64: false,
                          }).then((result) => {
                            if (!result.canceled && result.assets && result.assets.length > 0) {
                              setEvidenceImage(result.assets[0]);
                              Alert.alert("Berhasil", "Foto bukti berhasil diambil!");
                            }
                          });
                        }},
                        { text: "Galeri", onPress: () => {
                          // Use gallery
                          ImagePicker.launchImageLibraryAsync({
                            mediaTypes: "images",
                            allowsEditing: false,
                            quality: 0.8,
                            base64: false,
                          }).then((result) => {
                            if (!result.canceled && result.assets && result.assets.length > 0) {
                              setEvidenceImage(result.assets[0]);
                              Alert.alert("Berhasil", "Foto bukti berhasil dipilih!");
                            }
                          });
                        }},
                        { text: "Batal", style: "cancel" },
                      ],
                      { cancelable: true }
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="camera" size={20} color="#3b82f6" />
                <Text style={styles.imagePickerText}>
                  Ambil/Pilih Foto Bukti
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  if (
                    budgetRequestForm.requested_amount ||
                    budgetRequestForm.reason ||
                    evidenceImage
                  ) {
                    Alert.alert(
                      "Tutup Form?",
                      "Data yang sudah diisi akan hilang. Yakin ingin menutup form?",
                      [
                        { text: "Tidak", style: "cancel" },
                        {
                          text: "Ya, Tutup",
                          style: "destructive",
                          onPress: () => {
                            setShowBudgetRequestModal(false);
                            resetBudgetRequestForm();
                          },
                        },
                      ]
                    );
                  } else {
                    setShowBudgetRequestModal(false);
                  }
                }}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submittingBudgetRequest && styles.disabledButton,
                  (!budgetRequestForm.requested_amount || !budgetRequestForm.reason) &&
                    styles.incompleteButton,
                ]}
                onPress={handleSubmitBudgetRequest}
                disabled={
                  submittingBudgetRequest || !budgetRequestForm.requested_amount || !budgetRequestForm.reason
                }
              >
                {submittingBudgetRequest ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[styles.submitButtonText, { marginLeft: 8 }]}>
                      Mengajukan...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>
                    Ajukan Permohonan
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <LoadConfirmationModal
        visible={showLoadConfirmation}
        onClose={() => setShowLoadConfirmation(false)}
        onConfirm={handleLoadConfirmation}
        isLoading={submittingLoad}
      />

      {/* Surat Jalan Upload Modal */}
      <Modal
        visible={showSuratJalanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSuratJalanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView style={styles.scrollContainer}>
              <Text style={styles.modalTitle}>Upload Foto Surat Jalan</Text>
              <Text style={styles.modalSubtitle}>
                Silakan ambil foto surat jalan sebagai bukti muatan yang telah diangkut
              </Text>

              {/* Photo Upload Section */}
              <View style={styles.photoSection}>
                {/* Add Photo Button */}
                <TouchableOpacity 
                  style={styles.addPhotoButton} 
                  onPress={() => {
                    Alert.alert(
                      "Pilih Foto Surat Jalan",
                      "Bagaimana cara Anda ingin mengambil foto?",
                      [
                        { 
                          text: "Kamera", 
                          onPress: async () => {
                            try {
                              const permission = await ImagePicker.requestCameraPermissionsAsync();
                              if (!permission.granted) {
                                Alert.alert("Error", "Permission to access camera was denied");
                                return;
                              }
                              const result = await ImagePicker.launchCameraAsync({
                                allowsEditing: true,
                                quality: 0.8,
                              });
                              if (!result.canceled && result.assets?.[0]) {
                                setSuratJalanPhotos(prev => [...prev, result.assets[0]]);
                              }
                            } catch (error) {
                              Alert.alert("Error", "Failed to take picture");
                            }
                          }
                        },
                        { 
                          text: "Galeri", 
                          onPress: async () => {
                            try {
                              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                              if (!permission.granted) {
                                Alert.alert("Error", "Permission to access gallery was denied");
                                return;
                              }
                              const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: true,
                                quality: 0.8,
                              });
                              if (!result.canceled && result.assets?.[0]) {
                                setSuratJalanPhotos(prev => [...prev, result.assets[0]]);
                              }
                            } catch (error) {
                              Alert.alert("Error", "Failed to pick image");
                            }
                          }
                        },
                        { 
                          text: "Batal", 
                          style: "cancel" 
                        },
                      ],
                      { cancelable: true }
                    );
                  }}
                >
                  <Text style={styles.addPhotoIcon}>📷</Text>
                  <Text style={styles.addPhotoText}>Tambah Foto Surat Jalan</Text>
                </TouchableOpacity>

                {/* Display Selected Photos */}
                {suratJalanPhotos.length > 0 && (
                  <View style={styles.photosContainer}>
                    <Text style={styles.photosTitle}>
                      Foto Surat Jalan ({suratJalanPhotos.length} foto)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
                      {suratJalanPhotos.map((photo, index) => (
                        <View key={index} style={styles.photoItem}>
                          <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => setSuratJalanPhotos(prev => prev.filter((_, i) => i !== index))}
                          >
                            <Text style={styles.removePhotoText}>❌</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowSuratJalanModal(false);
                    setSuratJalanPhotos([]);
                  }}
                  disabled={uploadingSuratJalan}
                >
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    (suratJalanPhotos.length === 0 || uploadingSuratJalan) && styles.disabledButton,
                  ]}
                  onPress={() => handleSuratJalanUpload(suratJalanPhotos)}
                  disabled={suratJalanPhotos.length === 0 || uploadingSuratJalan}
                >
                  {uploadingSuratJalan ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={[styles.confirmButtonText, { marginLeft: 8 }]}>
                        Mengunggah...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.confirmButtonText}>
                      Upload Foto
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Location Documentation Modal */}
      <Modal
        visible={showLocationDocModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLocationDocModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Dokumentasi Pengiriman
            </Text>
            <TouchableOpacity onPress={() => setShowLocationDocModal(false)}>
              <FontAwesome5 name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Location Info */}
            {getAllCustomerLocations()[currentLocationIndex] && (
              <View style={styles.locationInfoCard}>
                <FontAwesome5 name="map-marker-alt" size={20} color="#3b82f6" />
                <Text style={styles.locationInfoText}>
                  {getAllCustomerLocations()[currentLocationIndex].location}
                </Text>
              </View>
            )}

            {/* Documentation Fields */}
            <View style={styles.docFormSection}>
              <Text style={styles.docSectionTitle}>📊 Pressure Bar</Text>
              {getLocationPhoto(pressureBarPhotos, currentLocationIndex) ? (
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: getLocationPhoto(pressureBarPhotos, currentLocationIndex).uri }}
                    style={styles.previewImage}
                  />
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={() => clearLocationPhoto(pressureBarPhotos, setPressureBarPhotos, currentLocationIndex, 'pressure_bar')}
                    >
                      <FontAwesome5 name="trash" size={16} color="#fff" />
                      <Text style={styles.retakeButtonText}>Hapus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.changePhotoButton}
                      onPress={handlePressureBarPhoto}
                    >
                      <FontAwesome5 name="camera" size={16} color="#fff" />
                      <Text style={styles.changePhotoButtonText}>Ganti</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.docPhotoButton}
                  onPress={handlePressureBarPhoto}
                >
                  <FontAwesome5 name="camera" size={20} color="#3b82f6" />
                  <Text style={styles.docPhotoButtonText}>Ambil Foto Pressure Bar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.docFormSection}>
              <Text style={styles.docSectionTitle}>🌡️ Foto Temperature</Text>
              {getLocationPhoto(temperaturePhotos, currentLocationIndex) ? (
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: getLocationPhoto(temperaturePhotos, currentLocationIndex).uri }}
                    style={styles.previewImage}
                  />
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={() => clearLocationPhoto(temperaturePhotos, setTemperaturePhotos, currentLocationIndex, 'temperature')}
                    >
                      <FontAwesome5 name="trash" size={16} color="#fff" />
                      <Text style={styles.retakeButtonText}>Hapus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.changePhotoButton}
                      onPress={handleTemperaturePhoto}
                    >
                      <FontAwesome5 name="camera" size={16} color="#fff" />
                      <Text style={styles.changePhotoButtonText}>Ganti</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.docPhotoButton}
                  onPress={handleTemperaturePhoto}
                >
                  <FontAwesome5 name="camera" size={20} color="#3b82f6" />
                  <Text style={styles.docPhotoButtonText}>Ambil Foto Temperature</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.docFormSection}>
              <Text style={styles.docSectionTitle}>▶️ Foto Stan Awal</Text>
              {getLocationPhoto(stanAwalPhotos, currentLocationIndex) ? (
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: getLocationPhoto(stanAwalPhotos, currentLocationIndex).uri }}
                    style={styles.previewImage}
                  />
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={() => clearLocationPhoto(stanAwalPhotos, setStanAwalPhotos, currentLocationIndex, 'stan_awal')}
                    >
                      <FontAwesome5 name="trash" size={16} color="#fff" />
                      <Text style={styles.retakeButtonText}>Hapus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.changePhotoButton}
                      onPress={handleStanAwalPhoto}
                    >
                      <FontAwesome5 name="camera" size={16} color="#fff" />
                      <Text style={styles.changePhotoButtonText}>Ganti</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.docPhotoButton}
                  onPress={handleStanAwalPhoto}
                >
                  <FontAwesome5 name="camera" size={20} color="#3b82f6" />
                  <Text style={styles.docPhotoButtonText}>Ambil Foto Stan Awal</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.docFormSection}>
              <Text style={styles.docSectionTitle}>⏹️ Foto Stan Akhir</Text>
              {getLocationPhoto(stanAkhirPhotos, currentLocationIndex) ? (
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: getLocationPhoto(stanAkhirPhotos, currentLocationIndex).uri }}
                    style={styles.previewImage}
                  />
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={() => clearLocationPhoto(stanAkhirPhotos, setStanAkhirPhotos, currentLocationIndex, 'stan_akhir')}
                    >
                      <FontAwesome5 name="trash" size={16} color="#fff" />
                      <Text style={styles.retakeButtonText}>Hapus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.changePhotoButton}
                      onPress={handleStanAkhirPhoto}
                    >
                      <FontAwesome5 name="camera" size={16} color="#fff" />
                      <Text style={styles.changePhotoButtonText}>Ganti</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.docPhotoButton}
                  onPress={handleStanAkhirPhoto}
                >
                  <FontAwesome5 name="camera" size={20} color="#3b82f6" />
                  <Text style={styles.docPhotoButtonText}>Ambil Foto Stan Akhir</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLocationDocModal(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSaveDocumentation}
              >
                <Text style={styles.submitButtonText}>Simpan Dokumentasi</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Nota Kecil Uploader Modal */}
      <Modal
        visible={showNotaKecilModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotaKecilModal(false)}
      >
        <NotaKecilUploader
          deliveryOrderId={trip?.id?.toString() || ''}
          customerLocationIndex={currentLocationIndex}
          customerName={getAllCustomerLocations()[currentLocationIndex]?.location || 'Customer'}
          customerAddress={getAllCustomerLocations()[currentLocationIndex]?.location || ''}
          onNotaKecilCreated={handleNotaKecilCreated}
          onClose={() => setShowNotaKecilModal(false)}
        />
      </Modal>

      {/* Nota Kecils List Modal */}
      <Modal
        visible={showNotaKecilListModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotaKecilListModal(false)}
      >
        <NotaKecilsList
          deliveryOrderId={trip?.id?.toString() || ''}
          customerLocationIndex={currentLocationIndex}
          customerName={getAllCustomerLocations()[currentLocationIndex]?.location || 'Customer'}
          onNotaKecilAdded={handleNotaKecilCreated}
          onClose={() => setShowNotaKecilListModal(false)}
        />
      </Modal>
    </>
  );
};

// HELPER FUNCTIONS
const getStatusColor = (status: string) => {
  const colorMap: { [key: string]: string } = {
    assigned: "#6c757d",
    at_spbu: "#3498db",
    otw_to_unload_location: "#e67e22",
    at_unload_location: "#f39c12",
    completed: "#28a745",
    cancelled: "#dc3545",
  };
  return colorMap[status] || "#6c757d";
};

const getStatusText = (status: string) => {
  const statusMap = {
    assigned: "Ditugaskan",
    at_spbu: "Di SPBU",
    otw_to_unload_location: "Menuju Lokasi Bongkar",
    at_unload_location: "Di Lokasi Bongkar",
    completed: "Selesai",
    cancelled: "Dibatalkan",
  };
  return statusMap[status as keyof typeof statusMap] || status;
};

const getStatusStyle = (status: string) => {
  const styleMap = {
    assigned: { backgroundColor: "#6c757d" },
    at_spbu: { backgroundColor: "#3498db" },
    otw_to_unload_location: { backgroundColor: "#e67e22" },
    at_unload_location: { backgroundColor: "#f39c12" },
    completed: { backgroundColor: "#28a745" },
    cancelled: { backgroundColor: "#dc3545" },
  };
  return (
    styleMap[status as keyof typeof styleMap] || { backgroundColor: "#6c757d" }
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20, // Untuk status bar (atau sesuaikan)
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  customerName: {
    fontSize: 16,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  itemName: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "500",
    marginBottom: 2,
  },
  doNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    letterSpacing: 1,
    marginBottom: 2,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  locationValue: {
    fontSize: 15,
    color: "#222",
    fontWeight: "500",
    marginBottom: 2,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
  },
  locationText: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    width: 36,
  },

  // Update existing headerCard style
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerCard: {
    backgroundColor: "#2563eb",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  headerInfo: {
    gap: 4,
  },
  statusActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  saldoCard: {
    backgroundColor: "#3b82f6",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  saldoTitle: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    opacity: 0.8,
  },
  saldoAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  saldoBreakdown: { gap: 4 },
  breakdownText: {
    fontSize: 14,
    color: "#e2e8f0",
    textAlign: "center",
  },
  detailCard: {
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
  historyCard: {
    backgroundColor: "white",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20, // Extra space for FAB
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1f2937",
  },
  detailText: { fontSize: 14, color: "#555", marginBottom: 4 },
  expenseItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  expenseDetails: { flex: 1, marginLeft: 12 },
  expenseType: { fontSize: 16, fontWeight: "500", color: "#333" },
  expenseDate: { fontSize: 12, color: "#888" },
  expenseNotes: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 2,
  },
  expenseAmount: { fontSize: 16, fontWeight: "bold", color: "#e74c3c" },
  // New expense status styles
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 4,
  },
  expenseAmountContainer: {
    alignItems: "flex-end",
  },
  rejectedAmount: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  rejectionReason: {
    fontSize: 11,
    color: "#e74c3c",
    marginTop: 4,
    fontStyle: "italic",
  },
  emptyText: { textAlign: "center", color: "#888", paddingVertical: 20 },

  // STYLES BARU untuk completed trip
  completedCard: {
    backgroundColor: "#10b981",
  },

  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 8,
  },

  completedText: {
    fontSize: 14,
    color: "#bfdbfe",
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },

  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  readOnlyIndicator: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },

  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 15,
    padding: 12,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
  },

  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1976d2",
    lineHeight: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },

  mapPreviewButton: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  mapPreviewContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapPreviewText: {
    flex: 1,
    marginLeft: 16,
  },
  mapPreviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  mapPreviewSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  navigationTarget: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  navigationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  navigationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 12,
  },
  navigationAddress: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  googleButton: {
    backgroundColor: "#4285f4",
  },
  wazeButton: {
    backgroundColor: "#33ccff",
  },
  navButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  coordinatesText: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
  },

  // FAB styles
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#27ae60",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  modalContent: { flex: 1, padding: 20 },

  // Form styles
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },

  // Picker styles
  pickerContainer: { marginBottom: 20 },
  webSelect: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  pickerButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  pickerButtonActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  pickerButtonText: { fontSize: 14, color: "#666" },
  pickerButtonTextActive: { color: "#fff", fontWeight: "600" },

  // Image picker styles
  imagePickerText: {
    fontSize: 16,
    color: "#3b82f6",
    marginLeft: 10,
    fontWeight: "500",
  },
  imageContainer: { alignItems: "center", marginBottom: 30 },

  changeImageText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  incompleteButton: {
    backgroundColor: "#bdc3c7", // Abu-abu jika form belum lengkap
  },

  imagePreviewContainer: {
    alignItems: "center",
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#e8f5e8",
    borderRadius: 8,
  },

  imageSelected: {
    fontSize: 16,
    color: "#27ae60",
    fontWeight: "600",
    marginBottom: 4,
  },

  imageDetails: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },

  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 20,
    marginBottom: 30,
    backgroundColor: "#f8f9fa",
    // Tambahkan shadow untuk better visual feedback
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  changeImageButton: {
    backgroundColor: "#6c757d",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    // Tambahkan shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal actions
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 16, color: "#666", fontWeight: "600" },
  submitButton: {
    flex: 1,
    paddingVertical: 15,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: "#27ae60",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: { fontSize: 16, color: "#fff", fontWeight: "600" },
  disabledButton: { backgroundColor: "#ccc" },

  // Action Menu styles
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionMenuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionMenuTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  actionMenuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  actionMenuSubtext: {
    fontSize: 14,
    color: '#666',
  },
  actionMenuCancel: {
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  actionMenuCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },

  // Multiple customer locations styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  customerLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  currentLocationItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  locationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentLocationIndex: {
    backgroundColor: '#3b82f6',
  },
  locationIndexText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  currentLocationIndexText: {
    color: '#fff',
  },
  locationItemText: {
    flex: 1,
  },
  locationItemAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  currentLocationAddress: {
    color: '#1565c0',
    fontWeight: '600',
  },
  locationItemCoords: {
    fontSize: 12,
    color: '#666',
  },
  locationNavButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  navButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  navButtonTextDisabled: {
    color: '#ccc',
  },
  nextLocationText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },

  // Location Flow Styles
  locationFlowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  currentLocationFlowItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  locationFlowIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c757d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentLocationFlowIndex: {
    backgroundColor: '#3b82f6',
  },
  locationFlowIndexText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  currentLocationFlowIndexText: {
    color: '#fff',
  },
  locationFlowContent: {
    flex: 1,
  },
  locationFlowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  currentLocationFlowLabel: {
    color: '#1565c0',
  },
  locationFlowValue: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
    marginBottom: 2,
  },
  currentLocationFlowValue: {
    color: '#1565c0',
    fontWeight: '600',
  },
  locationFlowCoords: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  connectionLine: {
    width: 2,
    height: 16,
    backgroundColor: '#e9ecef',
    marginLeft: 27,
    marginBottom: 4,
  },
  nextLocationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  nextLocationHintText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 6,
  },

  // Surat Jalan Upload Styles
  photoCountText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  noPhotosText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  uploadSuratJalanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  uploadSuratJalanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  addMorePhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginTop: 8,
  },
  addMorePhotosText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  uploadNotaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9b59b6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  uploadNotaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },

  // Location-based Nota Upload Styles
  locationNotaItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  locationNotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationNotaInfo: {
    flex: 1,
    marginRight: 12,
  },
  locationNotaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationNotaStatus: {
    fontSize: 14,
    color: '#666',
  },
  locationNotaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  uploadLocationButton: {
    backgroundColor: '#9b59b6',
  },
  addMoreLocationButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  locationNotaButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  uploadLocationButtonText: {
    color: '#fff',
  },
  addMoreLocationButtonText: {
    color: '#3b82f6',
  },
  locationPhotoPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  photoPreviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  photoPreviewItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoPreviewText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  noLocationsText: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    paddingVertical: 20,
  },

  // Location Documentation Styles
  locationDocItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  locationDocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationDocInfo: {
    flex: 1,
    marginRight: 12,
  },
  locationDocTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationDocStatus: {
    fontSize: 14,
    color: '#666',
  },
  locationDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  incompleteLocationButton: {
    backgroundColor: '#e67e22',
  },
  completeLocationButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  locationDocButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  incompleteLocationButtonText: {
    color: '#fff',
  },
  completeLocationButtonText: {
    color: '#27ae60',
  },
  documentationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docFieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: '45%',
    marginBottom: 8,
  },
  docFieldText: {
    fontSize: 12,
    marginLeft: 8,
    marginRight: 4,
    flex: 1,
  },
  docFieldCompleted: {
    color: '#27ae60',
    fontWeight: '500',
  },
  docFieldIncomplete: {
    color: '#666',
  },

  // Documentation Modal Styles
  locationInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginLeft: 12,
  },
  docFormSection: {
    marginBottom: 20,
  },
  docSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  docTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  docPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
  },
  docPhotoButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    marginLeft: 10,
    fontWeight: '500',
  },
  photoPreviewContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  previewImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    gap: 8,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  retakeButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  changePhotoButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal Overlay Styles (reused from NotaUploadModal)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    maxHeight: '100%',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 22,
  },
  photoSection: {
    marginBottom: 30,
  },
  addPhotoButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginBottom: 15,
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  addPhotoText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  photosContainer: {
    marginTop: 15,
  },
  photosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  photosScrollView: {
    maxHeight: 120,
  },
  photoItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 5,
  },
  removePhotoButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
  },
  removePhotoText: {
    fontSize: 12,
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },

  // Nota Kecil Styles
  locationActionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  notaKecilButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notaKecilButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewNotaKecilsButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  viewNotaKecilsButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TripDetailScreen;
