// src/components/OCRResultModal.tsx
import React from 'react';
import { 
  OCRResult, 
  ExtractedData, 
  BillingCalculation, 
  ConfidenceScores 
} from '../api/ocrApi';

interface OCRResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrResult: OCRResult | null;
  extractedData: ExtractedData | null;
  billingCalculation: BillingCalculation | null;
  onReprocess?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  isReprocessing?: boolean;
  isTestMode?: boolean;
  testModeImageUrl?: string;
  manualPressure?: string;
  manualTemperature?: string;
}

const OCRResultModal: React.FC<OCRResultModalProps> = ({
  isOpen,
  onClose,
  ocrResult,
  extractedData,
  billingCalculation,
  onReprocess,
  onEdit,
  onDelete,
  isReprocessing = false,
  isTestMode = false,
  testModeImageUrl,
  manualPressure,
  manualTemperature,
}) => {
  if (!isOpen || (!ocrResult && !isTestMode)) return null;

  // Create combined extracted data with manual inputs in test mode
  const getCombinedExtractedData = () => {
    if (!extractedData) return null;
    
    if (isTestMode && (manualPressure || manualTemperature)) {
      return {
        ...extractedData,
        ...(manualPressure && { tekanan_operasi: parseFloat(manualPressure) }),
        ...(manualTemperature && { temperatur_operasi: parseFloat(manualTemperature) })
      };
    }
    
    return extractedData;
  };

  const combinedExtractedData = getCombinedExtractedData();

  const formatConfidence = (score: number) => {
    const percentage = Math.round(score);
    const color = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
    return <span className={`font-semibold ${color}`}>{percentage}%</span>;
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('id-ID');
  };

  const formatNumber = (value: number | null, decimals: number = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(decimals);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">OCR Processing Results</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Processing Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {isTestMode ? 'Test Mode Results' : 'Processing Status'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  isTestMode ? 'bg-blue-100 text-blue-800' :
                  ocrResult?.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                  ocrResult?.processing_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  ocrResult?.processing_status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {isTestMode ? 'TEST MODE' : ocrResult?.processing_status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Overall Confidence</label>
                <div className="text-lg">
                  {formatConfidence(isTestMode ? combinedExtractedData?.overall_confidence || combinedExtractedData?.confidence || 0 : ocrResult?.confidence_scores?.overall || 0)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Processed At</label>
                <div className="text-sm text-gray-600">{formatDateTime(combinedExtractedData?.extracted_at || ocrResult?.processed_at)}</div>
              </div>
              {isTestMode && (combinedExtractedData?.tekanan_operasi || combinedExtractedData?.temperatur_operasi) && (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Data Sources</label>
                  <div className="text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                      OCR + Manual Input
                    </span>
                    Some values were manually entered to complete the data
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Data */}
          {combinedExtractedData && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Extracted Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                  <div className="text-sm text-gray-900">{formatDateTime(combinedExtractedData.tanggal_mulai)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                  <div className="text-sm text-gray-900">{formatDateTime(combinedExtractedData.tanggal_selesai)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stan Awal (m³)</label>
                  <div className="text-sm text-gray-900">{formatNumber(combinedExtractedData.stan_awal, 3)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stan Akhir (m³)</label>
                  <div className="text-sm text-gray-900">{formatNumber(combinedExtractedData.stan_akhir, 3)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tekanan Operasi (Bar)</label>
                  <div className="text-sm text-gray-900">
                    {formatNumber(combinedExtractedData.tekanan_operasi, 2)}
                    {combinedExtractedData.tekanan_operasi && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {isTestMode ? 'Manual Input' : 'OCR Extracted'}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temperatur Operasi (°C)</label>
                  <div className="text-sm text-gray-900">
                    {formatNumber(combinedExtractedData.temperatur_operasi, 1)}
                    {combinedExtractedData.temperatur_operasi && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {isTestMode ? 'Manual Input' : 'OCR Extracted'}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Harga Satuan</label>
                  <div className="text-sm text-gray-900">{formatCurrency(combinedExtractedData.harga_satuan)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Harga</label>
                  <div className="text-sm text-gray-900">{formatCurrency(combinedExtractedData.total_harga)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Confidence Scores */}
          {(ocrResult?.confidence_scores || isTestMode) && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Confidence Scores</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                  <div className="text-sm">{formatConfidence(isTestMode ? 0 : ocrResult?.confidence_scores?.tanggal_mulai || 0)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stan Awal</label>
                  <div className="text-sm">{formatConfidence(isTestMode ? 0 : ocrResult?.confidence_scores?.stan_awal || 0)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stan Akhir</label>
                  <div className="text-sm">{formatConfidence(isTestMode ? (combinedExtractedData?.stan_akhir ? 90 : 0) : ocrResult?.confidence_scores?.stan_akhir || 0)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tekanan Operasi</label>
                  <div className="text-sm">
                    {isTestMode && combinedExtractedData?.tekanan_operasi ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Manual Input
                      </span>
                    ) : (
                      formatConfidence(isTestMode ? 0 : ocrResult?.confidence_scores?.tekanan_operasi || 0)
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temperatur Operasi</label>
                  <div className="text-sm">
                    {isTestMode && combinedExtractedData?.temperatur_operasi ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Manual Input
                      </span>
                    ) : (
                      formatConfidence(isTestMode ? 0 : ocrResult?.confidence_scores?.temperatur_operasi || 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Calculation */}
          {billingCalculation && billingCalculation.success && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing Calculation</h3>
              {billingCalculation.summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Final Volume (m³)</label>
                    <div className="text-lg font-semibold text-green-800">
                      {formatNumber(billingCalculation.summary.final_volume_m3, 3)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                    <div className="text-lg font-semibold text-green-800">
                      {formatCurrency(billingCalculation.summary.unit_price)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <div className="text-lg font-semibold text-green-800">
                      {formatCurrency(billingCalculation.summary.total_amount)}
                    </div>
                  </div>
                </div>
              )}
              {billingCalculation.volume_calculation && (
                <div className="bg-white rounded p-3">
                  <h4 className="font-medium text-gray-900 mb-2">Calculation Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Meter Difference:</span>
                      <div className="font-medium">{formatNumber(billingCalculation.volume_calculation.result.meter_difference, 3)} m³</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Pressure:</span>
                      <div className="font-medium">{formatNumber(billingCalculation.volume_calculation.result.pressure_bar, 2)} bar</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Temperature:</span>
                      <div className="font-medium">{formatNumber(billingCalculation.volume_calculation.result.temperature_celsius, 1)}°C</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Compressibility:</span>
                      <div className="font-medium">{formatNumber(billingCalculation.volume_calculation.result.compressibility_factor, 6)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {billingCalculation && !billingCalculation.success && (
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Calculation Error</h3>
              <p className="text-red-700">{billingCalculation.error}</p>
            </div>
          )}

          {/* Image Preview */}
          {((ocrResult?.image_url) || (isTestMode && testModeImageUrl)) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Processed Image</h3>
              <div className="flex justify-center">
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000'}${isTestMode ? testModeImageUrl : `/uploads/ocr/${ocrResult?.image_url}`}`}
                  alt="Processed nota"
                  className="max-w-full h-auto max-h-64 rounded-lg shadow-md"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex space-x-2">
            {!isTestMode && onReprocess && ocrResult && (
              <button
                onClick={() => onReprocess(ocrResult.id)}
                disabled={isReprocessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isReprocessing ? 'Reprocessing...' : 'Reprocess OCR'}
              </button>
            )}
            {!isTestMode && onEdit && ocrResult && (
              <button
                onClick={() => onEdit(ocrResult.id)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Edit Data
              </button>
            )}
            {!isTestMode && onDelete && ocrResult && (
              <button
                onClick={() => onDelete(ocrResult.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OCRResultModal;
