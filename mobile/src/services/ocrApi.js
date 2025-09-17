// src/services/ocrApi.js
import apiClient from './api.js';

// OCR API functions for mobile
export const ocrApi = {
  // Process image with OCR
  processImage: async (deliveryOrderId, imageData) => {
    try {
      const formData = new FormData();
      formData.append('delivery_order_id', deliveryOrderId.toString());
      
      // Add image file
      if (imageData.uri) {
        const ext = imageData.uri.split('.').pop() || 'jpg';
        formData.append('image', {
          uri: imageData.uri,
          name: imageData.fileName || `nota_${deliveryOrderId}.${ext}`,
          type: imageData.mimeType || 'image/jpeg',
        });
      }

      const response = await apiClient.post('/ocr/process-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for OCR processing
      });

      return response.data;
    } catch (error) {
      console.error('OCR processImage error:', error);
      throw error;
    }
  },

  // Get OCR processing status
  getProcessStatus: async (ocrId) => {
    try {
      const response = await apiClient.get(`/ocr/process-status/${ocrId}`);
      return response.data;
    } catch (error) {
      console.error('OCR getProcessStatus error:', error);
      throw error;
    }
  },

  // Update extracted data manually
  updateExtractedData: async (ocrId, extractedData) => {
    try {
      const response = await apiClient.put(`/ocr/update-extracted-data/${ocrId}`, {
        extracted_data: extractedData,
      });
      return response.data;
    } catch (error) {
      console.error('OCR updateExtractedData error:', error);
      throw error;
    }
  },

  // Reprocess OCR
  reprocessOCR: async (ocrId) => {
    try {
      const response = await apiClient.post(`/ocr/reprocess/${ocrId}`);
      return response.data;
    } catch (error) {
      console.error('OCR reprocessOCR error:', error);
      throw error;
    }
  },

  // Get OCR results for a delivery order
  getOCRResultsForDeliveryOrder: async (deliveryOrderId) => {
    try {
      const response = await apiClient.get(`/ocr/delivery-order/${deliveryOrderId}`);
      return response.data;
    } catch (error) {
      console.error('OCR getOCRResultsForDeliveryOrder error:', error);
      throw error;
    }
  },

  // Delete OCR result
  deleteOCRResult: async (ocrId) => {
    try {
      const response = await apiClient.delete(`/ocr/${ocrId}`);
      return response.data;
    } catch (error) {
      console.error('OCR deleteOCRResult error:', error);
      throw error;
    }
  },
};

export default ocrApi;

