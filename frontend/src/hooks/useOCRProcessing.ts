// src/hooks/useOCRProcessing.ts
import { useState, useCallback } from 'react';
import ocrApi, { 
  OCRProcessImageRequest, 
  OCRProcessImageResponse, 
  OCRResult, 
  ExtractedData, 
  BillingCalculation,
  UpdateExtractedDataRequest,
  OCRTestProcessResponse
} from '../api/ocrApi';

export interface UseOCRProcessingReturn {
  // State
  isProcessing: boolean;
  isReprocessing: boolean;
  isUpdating: boolean;
  error: string | null;
  success: string | null;
  
  // Current OCR data
  currentOCRResult: OCRResult | null;
  extractedData: ExtractedData | null;
  billingCalculation: BillingCalculation | null;
  
  // OCR results for delivery order
  ocrResults: OCRResult[];
  isLoadingResults: boolean;
  
  // Actions
  processImage: (request: OCRProcessImageRequest) => Promise<OCRProcessImageResponse | null>;
  testProcessImage: (image: File) => Promise<OCRTestProcessResponse | null>;
  updateExtractedData: (id: number, data: ExtractedData) => Promise<boolean>;
  reprocessOCR: (id: number) => Promise<boolean>;
  loadOCRResults: (deliveryOrderId: number) => Promise<void>;
  deleteOCRResult: (id: number) => Promise<boolean>;
  clearError: () => void;
  clearSuccess: () => void;
  reset: () => void;
}

export const useOCRProcessing = (): UseOCRProcessingReturn => {
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // OCR data
  const [currentOCRResult, setCurrentOCRResult] = useState<OCRResult | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [billingCalculation, setBillingCalculation] = useState<BillingCalculation | null>(null);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);

  // Process image with OCR
  const processImage = useCallback(async (request: OCRProcessImageRequest): Promise<OCRProcessImageResponse | null> => {
    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      const response = await ocrApi.processImage(request);
      
      if (response.success) {
        setCurrentOCRResult(response.data.ocr_result);
        setExtractedData(response.data.extracted_data);
        setBillingCalculation(response.data.billing_calculation);
        setSuccess('OCR processing completed successfully!');
        
        // Refresh OCR results for this delivery order
        await loadOCRResults(request.delivery_order_id);
        
        return response;
      } else {
        throw new Error(response.message || 'OCR processing failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to process image with OCR';
      setError(errorMessage);
      console.error('OCR processing error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Test process image with OCR (no delivery order required)
  const testProcessImage = useCallback(async (image: File): Promise<OCRTestProcessResponse | null> => {
    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      const response = await ocrApi.testProcessImage(image);
      
      if (response.success) {
        // For test mode, we don't have an OCR result, just the extracted data
        setCurrentOCRResult(null);
        setExtractedData(response.data.extracted_data);
        setBillingCalculation(response.data.billing_calculation);
        setSuccess('OCR test processing completed successfully!');
        
        return response;
      } else {
        throw new Error(response.message || 'OCR test processing failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to test process image with OCR';
      setError(errorMessage);
      console.error('OCR test processing error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Update extracted data manually
  const updateExtractedData = useCallback(async (id: number, data: ExtractedData): Promise<boolean> => {
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);

      const request: UpdateExtractedDataRequest = { extracted_data: data };
      const response = await ocrApi.updateExtractedData(id, request);
      
      if (response.success) {
        setCurrentOCRResult(response.data.ocr_result);
        setExtractedData(response.data.extracted_data);
        setBillingCalculation(response.data.billing_calculation);
        setSuccess('Extracted data updated successfully!');
        
        // Update in OCR results list
        setOcrResults(prev => 
          prev.map(result => 
            result.id === id ? response.data.ocr_result : result
          )
        );
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to update extracted data');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update extracted data';
      setError(errorMessage);
      console.error('Update extracted data error:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Reprocess OCR
  const reprocessOCR = useCallback(async (id: number): Promise<boolean> => {
    try {
      setIsReprocessing(true);
      setError(null);
      setSuccess(null);

      const response = await ocrApi.reprocessOCR(id);
      
      if (response.success) {
        setCurrentOCRResult(response.data.ocr_result);
        setExtractedData(response.data.extracted_data);
        setBillingCalculation(response.data.billing_calculation);
        setSuccess('OCR reprocessed successfully!');
        
        // Update in OCR results list
        setOcrResults(prev => 
          prev.map(result => 
            result.id === id ? response.data.ocr_result : result
          )
        );
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to reprocess OCR');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reprocess OCR';
      setError(errorMessage);
      console.error('Reprocess OCR error:', err);
      return false;
    } finally {
      setIsReprocessing(false);
    }
  }, []);

  // Load OCR results for delivery order
  const loadOCRResults = useCallback(async (deliveryOrderId: number): Promise<void> => {
    try {
      setIsLoadingResults(true);
      setError(null);

      const response = await ocrApi.getOCRResultsForDeliveryOrder(deliveryOrderId);
      
      if (response.success) {
        setOcrResults(response.data);
      } else {
        throw new Error('Failed to load OCR results');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load OCR results';
      setError(errorMessage);
      console.error('Load OCR results error:', err);
    } finally {
      setIsLoadingResults(false);
    }
  }, []);

  // Delete OCR result
  const deleteOCRResult = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null);
      setSuccess(null);

      const response = await ocrApi.deleteOCRResult(id);
      
      if (response.success) {
        setSuccess('OCR result deleted successfully!');
        
        // Remove from OCR results list
        setOcrResults(prev => prev.filter(result => result.id !== id));
        
        // Clear current data if it was the deleted result
        if (currentOCRResult?.id === id) {
          setCurrentOCRResult(null);
          setExtractedData(null);
          setBillingCalculation(null);
        }
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete OCR result');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete OCR result';
      setError(errorMessage);
      console.error('Delete OCR result error:', err);
      return false;
    }
  }, [currentOCRResult]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear success
  const clearSuccess = useCallback(() => {
    setSuccess(null);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setIsProcessing(false);
    setIsReprocessing(false);
    setIsUpdating(false);
    setIsLoadingResults(false);
    setError(null);
    setSuccess(null);
    setCurrentOCRResult(null);
    setExtractedData(null);
    setBillingCalculation(null);
    setOcrResults([]);
  }, []);

  return {
    // State
    isProcessing,
    isReprocessing,
    isUpdating,
    error,
    success,
    
    // Current OCR data
    currentOCRResult,
    extractedData,
    billingCalculation,
    
    // OCR results for delivery order
    ocrResults,
    isLoadingResults,
    
    // Actions
    processImage,
    testProcessImage,
    updateExtractedData,
    reprocessOCR,
    loadOCRResults,
    deleteOCRResult,
    clearError,
    clearSuccess,
    reset,
  };
};

export default useOCRProcessing;

