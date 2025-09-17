// hooks/useOCRProcessing.js
import { useState, useCallback } from 'react';
import ocrApi from '../src/services/ocrApi';

export const useOCRProcessing = () => {
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // OCR data
  const [currentOCRResult, setCurrentOCRResult] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [billingCalculation, setBillingCalculation] = useState(null);
  const [ocrResults, setOcrResults] = useState([]);

  // Process image with OCR
  const processImage = useCallback(async (deliveryOrderId, imageData) => {
    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      const response = await ocrApi.processImage(deliveryOrderId, imageData);
      
      if (response.success) {
        setCurrentOCRResult(response.data.ocr_result);
        setExtractedData(response.data.extracted_data);
        setBillingCalculation(response.data.billing_calculation);
        setSuccess('OCR processing completed successfully!');
        
        // Refresh OCR results for this delivery order
        await loadOCRResults(deliveryOrderId);
        
        return response;
      } else {
        throw new Error(response.message || 'OCR processing failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to process image with OCR';
      setError(errorMessage);
      console.error('OCR processing error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Update extracted data manually
  const updateExtractedData = useCallback(async (ocrId, data) => {
    try {
      setIsUpdating(true);
      setError(null);
      setSuccess(null);

      const response = await ocrApi.updateExtractedData(ocrId, data);
      
      if (response.success) {
        setCurrentOCRResult(response.data.ocr_result);
        setExtractedData(response.data.extracted_data);
        setBillingCalculation(response.data.billing_calculation);
        setSuccess('Extracted data updated successfully!');
        
        // Update in OCR results list
        setOcrResults(prev => 
          prev.map(result => 
            result.id === ocrId ? response.data.ocr_result : result
          )
        );
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to update extracted data');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update extracted data';
      setError(errorMessage);
      console.error('Update extracted data error:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Reprocess OCR
  const reprocessOCR = useCallback(async (ocrId) => {
    try {
      setIsReprocessing(true);
      setError(null);
      setSuccess(null);

      const response = await ocrApi.reprocessOCR(ocrId);
      
      if (response.success) {
        setCurrentOCRResult(response.data.ocr_result);
        setExtractedData(response.data.extracted_data);
        setBillingCalculation(response.data.billing_calculation);
        setSuccess('OCR reprocessed successfully!');
        
        // Update in OCR results list
        setOcrResults(prev => 
          prev.map(result => 
            result.id === ocrId ? response.data.ocr_result : result
          )
        );
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to reprocess OCR');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reprocess OCR';
      setError(errorMessage);
      console.error('Reprocess OCR error:', err);
      return false;
    } finally {
      setIsReprocessing(false);
    }
  }, []);

  // Load OCR results for delivery order
  const loadOCRResults = useCallback(async (deliveryOrderId) => {
    try {
      setIsLoadingResults(true);
      setError(null);

      const response = await ocrApi.getOCRResultsForDeliveryOrder(deliveryOrderId);
      
      if (response.success) {
        setOcrResults(response.data);
      } else {
        throw new Error('Failed to load OCR results');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load OCR results';
      setError(errorMessage);
      console.error('Load OCR results error:', err);
    } finally {
      setIsLoadingResults(false);
    }
  }, []);

  // Delete OCR result
  const deleteOCRResult = useCallback(async (ocrId) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await ocrApi.deleteOCRResult(ocrId);
      
      if (response.success) {
        setSuccess('OCR result deleted successfully!');
        
        // Remove from OCR results list
        setOcrResults(prev => prev.filter(result => result.id !== ocrId));
        
        // Clear current data if it was the deleted result
        if (currentOCRResult?.id === ocrId) {
          setCurrentOCRResult(null);
          setExtractedData(null);
          setBillingCalculation(null);
        }
        
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete OCR result');
      }
    } catch (err) {
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

