// src/api/ocrApi.ts
import apiClient from './axiosConfig';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

export interface OCRProcessImageRequest {
  delivery_order_id: number;
  image: File;
}

export interface OCRProcessImageResponse {
  success: boolean;
  message: string;
  data: {
    ocr_result: OCRResult;
    extracted_data: ExtractedData;
    billing_calculation: BillingCalculation | null;
    image_url: string;
  };
}

export interface OCRResult {
  id: number;
  delivery_order_id: number;
  image_url: string;
  image_path: string;
  raw_ocr_text: string;
  extracted_data: ExtractedData;
  confidence_scores: ConfidenceScores;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  billing_calculation_data?: BillingCalculation;
  calculated_gas_volume_m3?: number;
  calculation_method: string;
  processed_by?: number;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedData {
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  stan_awal: number | null;
  stan_akhir: number | null;
  tekanan_operasi: number | null;
  temperatur_operasi: number | null;
  harga_satuan: number | null;
  total_harga: number | null;
  confidence: number;
  overall_confidence: number;
  extracted_at: string;
  raw_data: any;
}

export interface ConfidenceScores {
  overall: number;
  tanggal_mulai: number;
  stan_awal: number;
  stan_akhir: number;
  tekanan_operasi: number;
  temperatur_operasi: number;
}

export interface BillingCalculation {
  success: boolean;
  volume_calculation?: {
    result: {
      calculated_volume_m3: number;
      meter_difference: number;
      pressure_bar: number;
      temperature_celsius: number;
      compressibility_factor: number;
      calculation_method: string;
      calculated_at: string;
    };
  };
  billing_calculation?: {
    result: {
      volume_m3: number;
      unit_price: number;
      total_amount: number;
      calculated_at: string;
    };
  };
  summary?: {
    final_volume_m3: number;
    unit_price: number;
    total_amount: number;
    calculation_method: string;
    processed_at: string;
  };
  error?: string;
}

export interface OCRProcessStatusResponse {
  success: boolean;
  data: {
    id: number;
    delivery_order_id: number;
    processing_status: string;
    confidence_scores: ConfidenceScores;
    extracted_data: ExtractedData;
    created_at: string;
    updated_at: string;
  };
}

export interface UpdateExtractedDataRequest {
  extracted_data: ExtractedData;
}

export interface OCRReprocessResponse {
  success: boolean;
  message: string;
  data: {
    ocr_result: OCRResult;
    extracted_data: ExtractedData;
    billing_calculation: BillingCalculation | null;
  };
}

export interface OCRResultsForDeliveryOrderResponse {
  success: boolean;
  data: OCRResult[];
}

export interface OCRTestProcessResponse {
  success: boolean;
  message: string;
  data: {
    extracted_data: ExtractedData;
    billing_calculation: BillingCalculation | null;
    image_url: string;
    test_mode: boolean;
  };
}

// OCR API functions
export const ocrApi = {
  // Process image with OCR
  processImage: async (request: OCRProcessImageRequest): Promise<OCRProcessImageResponse> => {
    const formData = new FormData();
    formData.append('delivery_order_id', request.delivery_order_id.toString());
    formData.append('image', request.image);

    const response = await apiClient.post('/ocr/process-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Get OCR processing status
  getProcessStatus: async (id: number): Promise<OCRProcessStatusResponse> => {
    const response = await apiClient.get(`/ocr/process-status/${id}`);
    return response.data;
  },

  // Update extracted data manually
  updateExtractedData: async (
    id: number, 
    request: UpdateExtractedDataRequest
  ): Promise<OCRProcessImageResponse> => {
    const response = await apiClient.put(`/ocr/update-extracted-data/${id}`, request);
    return response.data;
  },

  // Reprocess OCR
  reprocessOCR: async (id: number): Promise<OCRReprocessResponse> => {
    const response = await apiClient.post(`/ocr/reprocess/${id}`);
    return response.data;
  },

  // Get OCR results for a delivery order
  getOCRResultsForDeliveryOrder: async (deliveryOrderId: number): Promise<OCRResultsForDeliveryOrderResponse> => {
    const response = await apiClient.get(`/ocr/delivery-order/${deliveryOrderId}`);
    return response.data;
  },

  // Delete OCR result
  deleteOCRResult: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/ocr/${id}`);
    return response.data;
  },

  // Test OCR processing without delivery order requirement
  testProcessImage: async (image: File): Promise<OCRTestProcessResponse> => {
    const formData = new FormData();
    formData.append('image', image);

    const response = await apiClient.post('/ocr/test-process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

export default ocrApi;

