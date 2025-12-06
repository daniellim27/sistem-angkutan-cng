// src/services/api.js

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { router } from "expo-router";
import Constants from 'expo-constants';

// Try to get API URL from environment or app config
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
                     Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 
                     'http://192.168.100.27:3000/api'; // Updated to use port 3000 (backend port)

// Backend base URL for static files (without /api suffix)
const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

// Helper function to get full image URL
export const getImageUrl = (relativePath) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath; // Already a full URL
  return `${BACKEND_BASE_URL}${relativePath}`;
};

// Create a dedicated axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "ngrok-skip-browser-warning": "true",
    "Content-Type": "application/json",
  },
});

// Use an interceptor to inject the token into every request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// === RESPONSE INTERCEPTOR UNTUK HANDLE 401 ===
apiClient.interceptors.response.use(
  (response) => {
    // Jika response berhasil, return seperti biasa
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isLoginEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/mobile/login");
    // Handle error response
    if (error.response?.status === 401 && !isLoginEndpoint) {
      console.log("Token expired or invalid, logging out...");

      // Clear stored auth data
      await AsyncStorage.multiRemove(["token", "user"]);
      // Redirect ke login
      router.replace("/(auth)/login");

      // Optional: Show alert
      if (typeof window !== "undefined") {
        setTimeout(() => {
          alert("Sesi Anda telah berakhir. Silakan login kembali.");
        }, 100);
      }
    }

    return Promise.reject(error);
  }
);

// === FUNGSI HELPER BARU UNTUK MENAMBAHKAN FILE KE FORMDATA ===
const appendFileToFormData = async (formData, fieldName, fileData) => {
  if (!fileData) return;

  let fileUri = fileData.uri;
  let ext = "jpg";

  // Defensive: prefer fileName extension if available
  if (
    fileData.fileName &&
    typeof fileData.fileName === "string" &&
    fileData.fileName.includes(".")
  ) {
    ext = fileData.fileName.split(".").pop();
  } else if (fileUri && typeof fileUri === "string" && fileUri.includes(".")) {
    ext = fileUri.split(".").pop();
  }

  let mimeType = fileData.mimeType || "image/jpeg";
  if (ext === "png") mimeType = "image/png";
  if (ext === "pdf") mimeType = "application/pdf";

  if (Platform.OS === "web") {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    formData.append(
      fieldName,
      blob,
      fileData.fileName || fileData.name || `file.${ext}`
    );
  } else {
    if (!fileUri) {
      console.warn("No fileUri for fileData:", fileData);
      return;
    }
    // For React Native, append the file object correctly for multer
    formData.append(fieldName, {
      uri: fileUri,
      name: fileData.fileName || `file.${ext}`,
      type: mimeType,
    });
  }
};

// === EXISTING FUNCTIONS ===
export const getPoDetailsForNewDo = (poId) => {
  return apiClient.get(`/purchase-orders/${poId}/details`);
};

export const getDeliveryOrderDetails = (id) => {
  return apiClient.get(`/delivery-orders/${id}`);
};

export const createDriverExpense = async (expenseData) => {
  // Pastikan async
  console.log("createDriverExpense called with:", expenseData);

  // Validate required data
  if (!expenseData.delivery_order_id) {
    throw new Error("delivery_order_id is required");
  }
  if (!expenseData.jenis) {
    throw new Error("jenis is required");
  }
  if (!expenseData.amount && expenseData.amount !== 0) {
    throw new Error("amount is required");
  }

  const formData = new FormData();

  formData.append(
    "delivery_order_id",
    expenseData.delivery_order_id.toString()
  );
  formData.append("jenis", expenseData.jenis);
  formData.append("amount", expenseData.amount.toString());

  if (expenseData.notes) {
    formData.append("notes", expenseData.notes);
  }

  // Gunakan fungsi helper untuk receipt
  await appendFileToFormData(formData, "receipt", expenseData.receipt);

  console.log("FormData created for submission (createDriverExpense)");
  return apiClient.post("/driver-expenses", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 0, // Set timeout to 0 (no timeout) or a very high value for file uploads
  });
};

export const confirmLoad = async (doId, loadData) => {
  try {
    const formData = new FormData();

    formData.append(
      "actual_load_quantity",
      loadData.actual_load_quantity.toString()
    );

    if (Array.isArray(loadData.surat_jalan_photo)) {
      for (let i = 0; i < loadData.surat_jalan_photo.length; i++) {
        const photo = loadData.surat_jalan_photo[i];
        if (photo && photo.uri) {
          const ext = photo.uri.split(".").pop() || "jpg";
          await appendFileToFormData(
            formData,
            "surat_jalan_photo",
            {
              ...photo,
              fileName: photo.fileName || `surat_jalan_${i}.${ext}`,
              mimeType: photo.mimeType || "image/jpeg",
            }
          );
        } else {
          console.warn("Skipping photo without uri:", photo);
        }
      }
    } else if (loadData.surat_jalan_photo && loadData.surat_jalan_photo.uri) {
      const photo = loadData.surat_jalan_photo;
      const ext = photo.uri.split(".").pop() || "jpg";
      await appendFileToFormData(
        formData,
        "surat_jalan_photo",
        {
          ...photo,
          fileName: photo.fileName || `surat_jalan.${ext}`,
          mimeType: photo.mimeType || "image/jpeg",
        }
      );
    }

    // Log form data for debugging
    console.log("FormData contents:");
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

    return apiClient.post(`/delivery-orders/${doId}/confirm-load`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000,
    });
  } catch (error) {
    console.error("Error in confirmLoad API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const updateDeliveryStatus = (doId, action) => {
  const endpointMapping = {
    start: `${doId}/start`,
    arrive_at_spbu: `${doId}/arrive`,
    depart_spbu: `${doId}/depart-spbu`,
    arrive_at_unload: `${doId}/arrive-at-unload`,
    start_return: `${doId}/start-return`,
    complete: `${doId}/complete`,
  };

  const endpoint = endpointMapping[action];
  if (!endpoint) {
    return Promise.reject(new Error(`Invalid action: ${action}`));
  }

  return apiClient.patch(`/delivery-orders/${endpoint}`);
};

export const uploadSuratJalanPhoto = async (doId, suratJalanPhotos) => {
  try {
    console.log("uploadSuratJalanPhoto called with:", {
      doId,
      suratJalanPhotosCount: Array.isArray(suratJalanPhotos) ? suratJalanPhotos.length : 1,
    });

    const formData = new FormData();

    if (Array.isArray(suratJalanPhotos)) {
      for (let i = 0; i < suratJalanPhotos.length; i++) {
        const photo = suratJalanPhotos[i];
        if (photo && photo.uri) {
          const ext = photo.uri.split(".").pop() || "jpg";
          console.log(`Adding surat jalan photo ${i + 1} to FormData:`, {
            uri: photo.uri,
            fileName: photo.fileName || `surat_jalan_${i}.${ext}`,
            mimeType: photo.mimeType || "image/jpeg"
          });

          await appendFileToFormData(
            formData,
            "surat_jalan_photo",
            {
              ...photo,
              fileName: photo.fileName || `surat_jalan_${i}.${ext}`,
              mimeType: photo.mimeType || "image/jpeg",
            }
          );
        } else {
          console.warn("Skipping surat jalan photo without uri:", photo);
        }
      }
    } else if (suratJalanPhotos && suratJalanPhotos.uri) {
      const photo = suratJalanPhotos;
      const ext = photo.uri.split(".").pop() || "jpg";
      await appendFileToFormData(
        formData,
        "surat_jalan_photo",
        {
          ...photo,
          fileName: photo.fileName || `surat_jalan.${ext}`,
          mimeType: photo.mimeType || "image/jpeg",
        }
      );
    }

    // Log form data for debugging
    console.log("Surat Jalan FormData contents:");
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

    return apiClient.post(`/delivery-orders/${doId}/upload-surat-jalan`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // 60 seconds for photo upload
    });
  } catch (error) {
    console.error("Error in uploadSuratJalanPhoto API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const uploadNotaPhoto = async (doId, notaPhotos, locationIndex = null, locationName = null) => {
  try {
    console.log("uploadNotaPhoto called with:", {
      doId,
      notaPhotosCount: Array.isArray(notaPhotos) ? notaPhotos.length : 1,
      locationIndex,
      locationName
    });

    const formData = new FormData();

    if (Array.isArray(notaPhotos)) {
      for (let i = 0; i < notaPhotos.length; i++) {
        const photo = notaPhotos[i];
        if (photo && photo.uri) {
          const ext = photo.uri.split(".").pop() || "jpg";
          console.log(`Adding photo ${i + 1} to FormData:`, {
            uri: photo.uri,
            fileName: photo.fileName || `nota_${doId}_${i}.${ext}`,
            mimeType: photo.mimeType || "image/jpeg"
          });
          await appendFileToFormData(
            formData,
            "nota_photo",
            {
              ...photo,
              fileName: photo.fileName || `nota_${doId}_${i}.${ext}`,
              mimeType: photo.mimeType || "image/jpeg",
            }
          );
        } else {
          console.warn("Skipping nota photo without uri:", photo);
        }
      }
    } else if (notaPhotos && notaPhotos.uri) {
      const photo = notaPhotos;
      const ext = photo.uri.split(".").pop() || "jpg";
      console.log("Adding single photo to FormData:", {
        uri: photo.uri,
        fileName: photo.fileName || `nota_${doId}.${ext}`,
        mimeType: photo.mimeType || "image/jpeg"
      });
      await appendFileToFormData(
        formData,
        "nota_photo",
        {
          ...photo,
          fileName: photo.fileName || `nota_${doId}.${ext}`,
          mimeType: photo.mimeType || "image/jpeg",
        }
      );
    }

    // Add location context if provided
    if (locationIndex !== null && locationIndex !== undefined && locationName) {
      formData.append('location_index', locationIndex.toString());
      formData.append('location_name', locationName);
      console.log("Added location context:", { locationIndex, locationName });
    } else {
      console.log("Location context NOT added:", { locationIndex, locationName });
    }

    // Log form data for debugging
    console.log("FormData contents for nota upload:");
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

    console.log("Sending upload request...");
    const response = await apiClient.post(`/delivery-orders/${doId}/upload-nota`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // Increased timeout to 60 seconds for large images
    });
    
    console.log("Upload response received:", response.data);
    return response;
  } catch (error) {
    console.error("Error in uploadNotaPhoto API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      code: error.code
    });
    
    // Add more specific error handling
    if (error.code === 'ECONNABORTED') {
      error.code = 'TIMEOUT';
      error.message = 'Upload timeout - please try again with smaller images';
    } else if (error.message === 'Network Error') {
      error.code = 'NETWORK_ERROR';
    }
    
    throw error;
  }
};

export const completeLocation = async (doId, locationIndex) => {
  console.log(`🚀 Making API call to complete location ${locationIndex} for order ${doId}`);
  console.log(`API URL: /delivery-orders/${doId}/complete-location`);
  console.log(`Request body:`, { location_index: locationIndex });
  
  const response = await apiClient.post(`/delivery-orders/${doId}/complete-location`, {
    location_index: locationIndex
  });
  
  console.log(`✅ API response received:`, response.data);
  return response;
};

export const getLoadStatus = (doId) => {
  return apiClient.get(`/delivery-orders/${doId}/load-status`);
};

// Budget Request API functions
export const createBudgetRequest = async (requestData) => {
  console.log("createBudgetRequest called with:", requestData);

  // Validate required data
  if (!requestData.delivery_order_id) {
    throw new Error("delivery_order_id is required");
  }
  if (!requestData.requested_amount && requestData.requested_amount !== 0) {
    throw new Error("requested_amount is required");
  }
  if (!requestData.reason) {
    throw new Error("reason is required");
  }

  const formData = new FormData();
  formData.append('delivery_order_id', requestData.delivery_order_id.toString());
  formData.append('requested_amount', requestData.requested_amount.toString());
  formData.append('reason', requestData.reason);

  // Use helper function for evidence file
  await appendFileToFormData(formData, 'evidence', requestData.evidence);

  console.log("FormData created for budget request submission");
  return apiClient.post('/budget-requests', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30000,
  });
};

export const getBudgetRequests = async (deliveryOrderId = null) => {
  const params = deliveryOrderId ? { delivery_order_id: deliveryOrderId } : {};
  return apiClient.get('/budget-requests', { params });
};

export const getBudgetRequestDetails = async (requestId) => {
  return apiClient.get(`/budget-requests/${requestId}`);
};

// Check if driver is near delivery order's target location
export const checkProximityForDeliveryOrder = async (deliveryOrderId) => {
  return apiClient.get(`/tracking/delivery/${deliveryOrderId}/check-proximity`);
};

export const deleteBudgetRequest = async (requestId) => {
  return apiClient.delete(`/budget-requests/${requestId}`);
};

export const uploadDocumentationPhotos = async (doId, locationIndex, documentationData) => {
  try {
    console.log("uploadDocumentationPhotos called with:", {
      doId,
      locationIndex,
      documentationData
    });

    const formData = new FormData();
    
    // Add location index
    formData.append('location_index', locationIndex.toString());
    
    // Helper function to add photos to FormData
    const addPhotosToFormData = async (photos, fieldName) => {
      if (!photos || photos.length === 0) return;
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (photo && photo.uri) {
          const ext = photo.uri.split(".").pop() || "jpg";
          console.log(`Adding ${fieldName} photo ${i + 1} to FormData:`, {
            uri: photo.uri,
            fileName: photo.fileName || `${fieldName}_${locationIndex}_${i}.${ext}`,
            mimeType: photo.mimeType || "image/jpeg"
          });

          await appendFileToFormData(
            formData,
            fieldName,
            {
              ...photo,
              fileName: photo.fileName || `${fieldName}_${locationIndex}_${i}.${ext}`,
              mimeType: photo.mimeType || "image/jpeg",
            }
          );
        } else {
          console.warn(`Skipping ${fieldName} photo without uri:`, photo);
        }
      }
    };

    // Add each type of documentation photo
    if (documentationData.pressureBarPhotos) {
      await addPhotosToFormData(documentationData.pressureBarPhotos, 'pressure_bar');
    }
    
    if (documentationData.temperaturePhotos) {
      await addPhotosToFormData(documentationData.temperaturePhotos, 'temperature');
    }
    
    if (documentationData.stanAwalPhotos) {
      await addPhotosToFormData(documentationData.stanAwalPhotos, 'stan_awal');
    }
    
    if (documentationData.stanAkhirPhotos) {
      await addPhotosToFormData(documentationData.stanAkhirPhotos, 'stan_akhir');
    }

    // Log form data for debugging
    console.log("Documentation FormData contents:");
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

    return apiClient.post(`/delivery-orders/${doId}/upload-documentation`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // 60 seconds for photo upload
    });
  } catch (error) {
    console.error("Error in uploadDocumentationPhotos API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

// Nota Kecil API functions
export const processNotaKecilOCR = async (doId, customerLocationIndex, photos) => {
  try {
    console.log("processNotaKecilOCR called with:", {
      doId,
      customerLocationIndex,
      photos
    });

    const formData = new FormData();
    
    // Add customer location index
    formData.append('customer_location_index', customerLocationIndex.toString());
    
    // Helper function to add photos to FormData
    const addPhotosToFormData = async (photo, fieldName) => {
      if (!photo || !photo.uri) return;
      
      const ext = photo.uri.split(".").pop() || "jpg";
      console.log(`Adding ${fieldName} photo to FormData:`, {
        uri: photo.uri,
        fileName: photo.fileName || `${fieldName}_${customerLocationIndex}.${ext}`,
        mimeType: photo.mimeType || "image/jpeg"
      });

      await appendFileToFormData(
        formData,
        photo.uri,
        photo.fileName || `${fieldName}_${customerLocationIndex}.${ext}`,
        photo.mimeType || "image/jpeg"
      );
    };

    // Add each photo type to FormData
    if (photos.pressure_bar) {
      await addPhotosToFormData(photos.pressure_bar, 'pressure_bar');
    }
    if (photos.temperature) {
      await addPhotosToFormData(photos.temperature, 'temperature');
    }
    if (photos.stan_awal) {
      await addPhotosToFormData(photos.stan_awal, 'stan_awal');
    }
    if (photos.stan_akhir) {
      await addPhotosToFormData(photos.stan_akhir, 'stan_akhir');
    }

    console.log("Sending FormData to OCR processing endpoint...");
    
    return await apiClient.post(`/delivery-orders/${doId}/process-nota-kecil`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 90000, // 90 seconds for OCR processing
    });
  } catch (error) {
    console.error("Error in processNotaKecilOCR API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const confirmNotaKecil = async (doId, confirmedValues) => {
  try {
    console.log("confirmNotaKecil called with:", {
      doId,
      confirmedValues
    });

    return await apiClient.post(`/delivery-orders/${doId}/nota-kecil/confirm`, {
      ...confirmedValues
    });
  } catch (error) {
    console.error("Error in confirmNotaKecil API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const getNotaKecils = async (doId) => {
  try {
    console.log("getNotaKecils called for DO:", doId);
    
    return await apiClient.get(`/delivery-orders/${doId}/nota-kecils`);
  } catch (error) {
    console.error("Error in getNotaKecils API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const getCustomerNotaKecils = async (doId, customerLocationIndex) => {
  try {
    console.log("getCustomerNotaKecils called:", {
      doId,
      customerLocationIndex
    });
    
    return await apiClient.get(`/delivery-orders/${doId}/customers/${customerLocationIndex}/nota-kecils`);
  } catch (error) {
    console.error("Error in getCustomerNotaKecils API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

// Individual OCR processing for single photo
export const processIndividualPhotoOCR = async (doId, photoType, customerLocationIndex, photo) => {
  try {
    console.log("processIndividualPhotoOCR called with:", {
      doId,
      photoType,
      customerLocationIndex,
      photo
    });

    const formData = new FormData();
    
    // Add customer location index
    formData.append('customer_location_index', customerLocationIndex.toString());
    
    // Add the specific photo
    const ext = photo.uri.split(".").pop() || "jpg";
    await appendFileToFormData(
      formData,
      "photo",
      {
        uri: photo.uri,
        fileName: photo.fileName || `${photoType}_${customerLocationIndex}.${ext}`,
        mimeType: photo.mimeType || "image/jpeg"
      }
    );

    console.log(`Sending ${photoType} photo to OCR processing endpoint...`);
    
    return await apiClient.post(`/delivery-orders/${doId}/process-nota-kecil/${photoType}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // 60 seconds for OCR processing
    });
  } catch (error) {
    console.error("Error in processIndividualPhotoOCR API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

// Simple single-image upload to Google Drive for Nota Kecil
export const uploadNotaKecilImageToGoogleDrive = async (deliveryOrderId, customerName, customerLocationIndex, photoType, photo, notaKecilId = null) => {
  try {
    console.log("uploadNotaKecilImageToGoogleDrive called with:", {
      deliveryOrderId,
      customerName,
      customerLocationIndex,
      photoType,
      hasPhoto: !!photo,
      notaKecilId
    });

    if (!photo || !photo.uri) {
      throw new Error(`No photo provided for ${photoType}`);
    }

    const formData = new FormData();
    
    // Add required fields for Google Drive upload
    formData.append('deliveryOrderId', deliveryOrderId.toString());
    formData.append('customerName', customerName);
    formData.append('locationIndex', customerLocationIndex.toString());
    formData.append('photoType', photoType);
    
    if (notaKecilId) {
      formData.append('notaKecilId', notaKecilId.toString());
    }
    
    // Add the single photo
    const ext = photo.uri.split(".").pop() || "jpg";
    console.log(`Adding ${photoType} photo to FormData:`, {
      uri: photo.uri,
      fileName: photo.fileName || `${photoType}_${customerLocationIndex}.${ext}`,
      mimeType: photo.mimeType || "image/jpeg"
    });

    await appendFileToFormData(
      formData,
      "image",
      {
        uri: photo.uri,
        fileName: photo.fileName || `${photoType}_${customerLocationIndex}.${ext}`,
        mimeType: photo.mimeType || "image/jpeg"
      }
    );

    console.log("Sending single photo to Google Drive upload endpoint...");
    console.log("FormData contents:", {
      deliveryOrderId: formData._parts?.find(p => p[0] === 'deliveryOrderId')?.[1],
      customerName: formData._parts?.find(p => p[0] === 'customerName')?.[1],
      locationIndex: formData._parts?.find(p => p[0] === 'locationIndex')?.[1],
      photoType: formData._parts?.find(p => p[0] === 'photoType')?.[1],
      hasImage: !!formData._parts?.find(p => p[0] === 'image')
    });
    
    return await apiClient.post('/simple-upload/nota-image', formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // 1 minute for single image upload
    });
  } catch (error) {
    console.error("Error in uploadNotaKecilImageToGoogleDrive API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

// Upload multiple nota kecil images one by one (NEW APPROACH)
export const uploadNotaKecilImagesToGoogleDrive = async (deliveryOrderId, customerName, customerLocationIndex, photos, notaKecilId = null) => {
  try {
    console.log("uploadNotaKecilImagesToGoogleDrive (NEW) called with:", {
      deliveryOrderId,
      customerName,
      customerLocationIndex,
      photos,
      notaKecilId
    });

    const results = [];
    const photoTypes = [
      { key: 'pressure_bar', photo: photos.pressure_bar },
      { key: 'temperature', photo: photos.temperature },
      { key: 'stan_awal', photo: photos.stan_awal },
      { key: 'stan_akhir', photo: photos.stan_akhir }
    ];

    // Upload each photo individually
    for (const { key, photo } of photoTypes) {
      if (photo && photo.uri) {
        try {
          console.log(`📸 Uploading ${key} photo...`);
          const result = await uploadNotaKecilImageToGoogleDrive(
            deliveryOrderId,
            customerName,
            customerLocationIndex,
            key,
            photo,
            notaKecilId
          );
          
          results.push({
            type: key,
            success: true,
            data: result.data,
            url: result.data.data.imageData.url
          });
          
          console.log(`✅ Successfully uploaded ${key} photo`);
        } catch (error) {
          console.error(`❌ Failed to upload ${key} photo:`, error.message);
          results.push({
            type: key,
            success: false,
            error: error.message
          });
        }
      } else {
        console.log(`⏭️ Skipping ${key} photo (no photo provided)`);
        results.push({
          type: key,
          success: true,
          skipped: true
        });
      }
    }

    // Count successful uploads
    const successfulUploads = results.filter(r => r.success && !r.skipped).length;
    const totalPhotos = photoTypes.filter(p => p.photo && p.photo.uri).length;

    console.log(`📊 Upload Summary: ${successfulUploads}/${totalPhotos} photos uploaded successfully`);
    console.log('📊 Upload results:', results);

    // Transform results to the expected format
    const uploadedImages = {
      pressure_bar: [],
      temperature: [],
      stan_awal: [],
      stan_akhir: []
    };

    // Group results by photo type
    results.forEach(result => {
      if (result.success && !result.skipped && result.url) {
        uploadedImages[result.type].push({
          url: result.url,
          filename: result.data?.data?.imageData?.filename || `${result.type}.jpg`,
          fileId: result.data?.data?.imageData?.fileId || result.data?.data?.imageData?.publicId,
          uploadedAt: result.data?.data?.imageData?.uploadedAt || new Date().toISOString()
        });
      }
    });

    const finalResponse = {
      success: successfulUploads > 0,
      message: `Uploaded ${successfulUploads}/${totalPhotos} photos successfully`,
      data: {
        uploadedImages,
        results,
        successfulUploads,
        totalPhotos
      }
    };

    console.log('📊 Final upload response:', JSON.stringify(finalResponse, null, 2));
    return finalResponse;

  } catch (error) {
    console.error("Error in uploadNotaKecilImagesToGoogleDrive (NEW) API call:", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Receipt OCR API functions
export const processReceiptOCR = async (deliveryOrderId, photo) => {
  try {
    console.log("processReceiptOCR called with:", {
      deliveryOrderId,
      hasPhoto: !!photo
    });

    const formData = new FormData();
    
    // Add the delivery order ID
    formData.append('do_id', deliveryOrderId);
    
    // Add the receipt photo
    if (photo && photo.uri) {
      const ext = photo.uri.split(".").pop() || "jpg";
      await appendFileToFormData(
        formData,
        "receipt_photo",
        {
          uri: photo.uri,
          fileName: photo.fileName || `receipt_${deliveryOrderId}.${ext}`,
          mimeType: photo.mimeType || "image/jpeg"
        }
      );
    }

    console.log("Sending receipt photo to OCR processing endpoint...");
    
    return await apiClient.post(`/receipt-ocr/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 90000, // 90 seconds for OCR processing
    });
  } catch (error) {
    console.error("Error in processReceiptOCR API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const confirmReceipt = async (deliveryOrderId, receiptData) => {
  try {
    console.log("confirmReceipt called with:", {
      deliveryOrderId,
      receiptData
    });

    return await apiClient.post(`/receipt-ocr/confirm`, {
      delivery_order_id: deliveryOrderId,
      ...receiptData
    });
  } catch (error) {
    console.error("Error in confirmReceipt API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const getReceiptsForDO = async (deliveryOrderId) => {
  try {
    console.log("getReceiptsForDO called for DO:", deliveryOrderId);
    
    return await apiClient.get(`/receipt-ocr/do/${deliveryOrderId}`);
  } catch (error) {
    console.error("Error in getReceiptsForDO API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const updateReceiptData = async (receiptId, updatedData) => {
  try {
    console.log("updateReceiptData called with:", {
      receiptId,
      updatedData
    });

    return await apiClient.put(`/receipt-ocr/${receiptId}/edit`, updatedData);
  } catch (error) {
    console.error("Error in updateReceiptData API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const verifyReceipt = async (receiptId, isVerified, notes = '') => {
  try {
    console.log("verifyReceipt called with:", {
      receiptId,
      isVerified,
      notes
    });

    return await apiClient.put(`/receipt-ocr/${receiptId}/verify`, {
      is_verified: isVerified,
      verification_notes: notes
    });
  } catch (error) {
    console.error("Error in verifyReceipt API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export const deleteReceipt = async (receiptId) => {
  try {
    console.log("deleteReceipt called for receipt:", receiptId);
    
    return await apiClient.delete(`/receipt-ocr/${receiptId}`);
  } catch (error) {
    console.error("Error in deleteReceipt API call:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw error;
  }
};

export default apiClient;
