// src/pages/OCRProcessing.tsx
import React, { useState, useRef } from 'react';
import { useOCRProcessing } from '../hooks/useOCRProcessing';
import OCRResultModal from '../components/OCRResultModal';
import OCRDataEditor from '../components/OCRDataEditor';

const OCRProcessing: React.FC = () => {
  const {
    isProcessing,
    isReprocessing,
    isUpdating,
    error,
    success,
    currentOCRResult,
    extractedData,
    billingCalculation,
    ocrResults,
    isLoadingResults,
    processImage,
    testProcessImage,
    updateExtractedData,
    reprocessOCR,
    loadOCRResults,
    deleteOCRResult,
    clearError,
    clearSuccess,
  } = useOCRProcessing();

  const [selectedDeliveryOrderId, setSelectedDeliveryOrderId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [editingOCRId, setEditingOCRId] = useState<number | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testModeImageUrl, setTestModeImageUrl] = useState<string | null>(null);
  const [manualPressure, setManualPressure] = useState<string>('');
  const [manualTemperature, setManualTemperature] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      clearError();
      clearSuccess();
    }
  };

  const handleProcessImage = async () => {
    if (!selectedFile) {
      alert('Please select an image file');
      return;
    }

    if (!manualPressure || !manualTemperature) {
      alert('Please fill in both Pressure (PRSSR) and Temperature (TEMPT) fields');
      return;
    }

    if (isTestMode) {
      // Test mode - no delivery order required
      const response = await testProcessImage(selectedFile);
      if (response) {
        setTestModeImageUrl(response.data.image_url);
        setShowResultModal(true);
      }
    } else {
      // Normal mode - delivery order required
      if (!selectedDeliveryOrderId) {
        alert('Please select a delivery order');
        return;
      }

      const response = await processImage({
        delivery_order_id: selectedDeliveryOrderId,
        image: selectedFile,
      });

      if (response) {
        setShowResultModal(true);
        // Refresh OCR results
        await loadOCRResults(selectedDeliveryOrderId);
      }
    }
  };

  const handleEditData = (ocrId: number) => {
    setEditingOCRId(ocrId);
    setShowDataEditor(true);
  };

  const handleSaveEditedData = async (data: any) => {
    if (editingOCRId) {
      const success = await updateExtractedData(editingOCRId, data);
      if (success) {
        setShowDataEditor(false);
        setEditingOCRId(null);
        setShowResultModal(true);
        // Refresh OCR results
        if (selectedDeliveryOrderId) {
          await loadOCRResults(selectedDeliveryOrderId);
        }
      }
    }
  };

  const handleReprocessOCR = async (ocrId: number) => {
    const success = await reprocessOCR(ocrId);
    if (success) {
      setShowResultModal(true);
      // Refresh OCR results
      if (selectedDeliveryOrderId) {
        await loadOCRResults(selectedDeliveryOrderId);
      }
    }
  };

  const handleDeleteOCR = async (ocrId: number) => {
    if (window.confirm('Are you sure you want to delete this OCR result?')) {
      const success = await deleteOCRResult(ocrId);
      if (success) {
        // Refresh OCR results
        if (selectedDeliveryOrderId) {
          await loadOCRResults(selectedDeliveryOrderId);
        }
      }
    }
  };

  const handleViewResult = (ocrResult: any) => {
    // This would be implemented to show the result in the modal
    setShowResultModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">OCR Processing</h1>
              <p className="mt-2 text-gray-600">
                Process nota images with OCR to extract gas meter readings and calculate billing
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isTestMode}
                  onChange={(e) => {
                    setIsTestMode(e.target.checked);
                    setSelectedDeliveryOrderId(null);
                    setTestModeImageUrl(null);
                    setManualPressure('');
                    setManualTemperature('');
                    clearError();
                    clearSuccess();
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Test Mode (No Delivery Order Required)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
                <div className="mt-3">
                  <button
                    onClick={clearError}
                    className="text-sm font-medium text-red-800 hover:text-red-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.293 7.293a1 1 0 011.414 0L10 8.586l2.293-2.293a1 1 0 111.414 1.414L11.414 10l2.293 2.293a1 1 0 01-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">{success}</div>
                <div className="mt-3">
                  <button
                    onClick={clearSuccess}
                    className="text-sm font-medium text-green-800 hover:text-green-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Order Selection - Only show in normal mode */}
        {!isTestMode && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Order Selection</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Order ID <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter delivery order ID"
                value={selectedDeliveryOrderId || ''}
                onChange={(e) => setSelectedDeliveryOrderId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Select the delivery order to process OCR for</p>
            </div>
          </div>
        )}

        {/* Manual Input Fields for Required Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Input Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pressure (PRSSR) - Bar <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g., 2.5"
                value={manualPressure}
                onChange={(e) => setManualPressure(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter gas pressure in Bar</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (TEMPT) - °C <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g., 25.0"
                value={manualTemperature}
                onChange={(e) => setManualTemperature(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter gas temperature in Celsius</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Upload Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Nota Image</h2>
            

            {/* Test Mode Info */}
            {isTestMode && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Test Mode Active</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>You can test OCR processing without selecting a delivery order. This will show you the extracted MTR|PRSSR|TEMPT data and billing calculations.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        ref={fileInputRef}
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            {/* Process Button */}
            <button
              onClick={handleProcessImage}
              disabled={!selectedFile || (!isTestMode && !selectedDeliveryOrderId) || !manualPressure || !manualTemperature || isProcessing}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : isTestMode ? 'Test OCR Processing' : 'Process Image with OCR'}
            </button>
            {(!manualPressure || !manualTemperature) && (
              <p className="text-sm text-red-500 mt-2 text-center">
                Please fill in both Pressure (PRSSR) and Temperature (TEMPT) fields to enable processing
              </p>
            )}
          </div>

            {/* OCR Results Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">OCR Results</h2>
            
            {isTestMode ? (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2">Test Mode - Results will appear here after processing</p>
                </div>
              </div>
            ) : selectedDeliveryOrderId ? (
              <div>
                <button
                  onClick={() => loadOCRResults(selectedDeliveryOrderId)}
                  disabled={isLoadingResults}
                  className="mb-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {isLoadingResults ? 'Loading...' : 'Load Results'}
                </button>

                {ocrResults.length > 0 ? (
                  <div className="space-y-3">
                    {ocrResults.map((result) => (
                      <div
                        key={result.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              OCR Result #{result.id}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Status: <span className={`font-medium ${
                                result.processing_status === 'completed' ? 'text-green-600' :
                                result.processing_status === 'processing' ? 'text-blue-600' :
                                result.processing_status === 'failed' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {result.processing_status.toUpperCase()}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Confidence: {Math.round(result.confidence_scores.overall)}%
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewResult(result)}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditData(result.id)}
                              className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleReprocessOCR(result.id)}
                              disabled={isReprocessing}
                              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                            >
                              Reprocess
                            </button>
                            <button
                              onClick={() => handleDeleteOCR(result.id)}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No OCR results found for this delivery order
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Please select a delivery order to view OCR results
              </p>
            )}
          </div>
        </div>

        {/* Modals */}
        <OCRResultModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          ocrResult={currentOCRResult}
          extractedData={extractedData}
          billingCalculation={billingCalculation}
          onReprocess={isTestMode ? undefined : handleReprocessOCR}
          onEdit={isTestMode ? undefined : handleEditData}
          onDelete={isTestMode ? undefined : handleDeleteOCR}
          isReprocessing={isReprocessing}
          isTestMode={isTestMode}
          testModeImageUrl={testModeImageUrl || undefined}
          manualPressure={manualPressure}
          manualTemperature={manualTemperature}
        />

        <OCRDataEditor
          isOpen={showDataEditor}
          onClose={() => {
            setShowDataEditor(false);
            setEditingOCRId(null);
          }}
          extractedData={extractedData}
          onSave={handleSaveEditedData}
          isSaving={isUpdating}
        />
      </div>
    </div>
  );
};

export default OCRProcessing;

