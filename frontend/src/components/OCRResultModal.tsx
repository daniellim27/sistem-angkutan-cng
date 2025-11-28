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

  // ✅ NEW SCHEMA: Create combined extracted data with manual inputs
  const getCombinedExtractedData = () => {
    if (!extractedData) return null;
    
    if (isTestMode && (manualPressure || manualTemperature)) {
      return {
        ...extractedData,
        ...(manualPressure && { pressure_inlet: parseFloat(manualPressure) }),
        ...(manualTemperature && { temperature: parseFloat(manualTemperature) })
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

  // ✅ NEW SCHEMA: Calculate volume delta
  const volumeDelta = combinedExtractedData 
    ? (combinedExtractedData.current_stan || 0) - (combinedExtractedData.stan_awal || 0)
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
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
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isTestMode ? '🧪 Test Mode Results' : '✅ Processing Status'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  isTestMode ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' :
                  ocrResult?.processing_status === 'completed' ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white' :
                  ocrResult?.processing_status === 'processing' ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white' :
                  ocrResult?.processing_status === 'failed' ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white' :
                  'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
                }`}>
                  {isTestMode ? 'TEST MODE' : ocrResult?.processing_status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">Overall Confidence</label>
                <div className="text-2xl font-bold">
                  {formatConfidence(combinedExtractedData?.overall_confidence || combinedExtractedData?.confidence || 0)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">Volume Delta</label>
                <div className="text-2xl font-bold text-blue-600">
                  {volumeDelta !== null ? `${volumeDelta.toFixed(3)} m³` : 'N/A'}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">Processed At</label>
                <div className="text-sm text-gray-600">{formatDateTime(combinedExtractedData?.extracted_at || ocrResult?.processed_at)}</div>
              </div>
            </div>
          </div>

          {/* ✅ NEW SCHEMA: Extracted Data */}
          {combinedExtractedData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Meter & Volume Data */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📏</span> Meter Readings
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stan Awal</label>
                      <div className="text-2xl font-bold text-gray-900">{formatNumber(combinedExtractedData.stan_awal, 3)} m³</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Stan</label>
                      <div className="text-2xl font-bold text-gray-900">{formatNumber(combinedExtractedData.current_stan, 3)} m³</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Volume Delta (Vt)</span>
                      <span className="text-3xl font-bold">{volumeDelta !== null ? volumeDelta.toFixed(3) : 'N/A'} m³</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational Data */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🌡️</span> Operational Data
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pressure Inlet</label>
                    <div className="text-2xl font-bold text-gray-900 flex items-center justify-between">
                      <span>{formatNumber(combinedExtractedData.pressure_inlet, 2)} bar</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {isTestMode && manualPressure ? 'Manual' : 'OCR'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pressure Outlet</label>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(combinedExtractedData.pressure_outlet, 2)} bar</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                    <div className="text-2xl font-bold text-gray-900 flex items-center justify-between">
                      <span>{formatNumber(combinedExtractedData.temperature, 1)}°C</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {isTestMode && manualTemperature ? 'Manual' : 'OCR'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Range</label>
                    <div className="text-sm text-gray-900">
                      {formatDateTime(combinedExtractedData.tanggal_mulai)} → {formatDateTime(combinedExtractedData.tanggal_selesai)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ NEW SCHEMA: Confidence Scores */}
          {(ocrResult?.confidence_scores || isTestMode) && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📊</span> Confidence Scores
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stan Awal</label>
                  <div className="text-xl font-bold">{formatConfidence(ocrResult?.confidence_scores?.stan_awal || 0)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Stan</label>
                  <div className="text-xl font-bold">{formatConfidence(ocrResult?.confidence_scores?.current_stan || 0)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pressure Inlet</label>
                  <div className="text-xl font-bold">{formatConfidence(ocrResult?.confidence_scores?.pressure_inlet || 0)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pressure Outlet</label>
                  <div className="text-xl font-bold">{formatConfidence(ocrResult?.confidence_scores?.pressure_outlet || 0)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
                  <div className="text-xl font-bold">{formatConfidence(ocrResult?.confidence_scores?.temperature || 0)}</div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ NEW SCHEMA: Billing Calculation */}
          {billingCalculation && billingCalculation.success && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <span className="mr-2">💰</span> Billing Calculation
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-l-green-500">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Final Billable Volume</label>
                  <div className="text-4xl font-bold text-green-700">{formatNumber(billingCalculation.volume, 3)} m³</div>
                </div>
                {billingCalculation.details && (
                  <div className="lg:col-span-2">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Calculation Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <span className="text-sm text-gray-600">Vt (Meter Diff)</span>
                          <div className="font-mono text-lg font-semibold">{formatNumber(billingCalculation.details.Vt, 3)} m³</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Pressure Factor</span>
                          <div className="font-mono text-lg font-semibold">{formatNumber(billingCalculation.details.pressureFactor, 4)}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Temp Factor</span>
                          <div className="font-mono text-lg font-semibold">{formatNumber(billingCalculation.details.temperatureFactor, 4)}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Compressibility (k)</span>
                          <div className="font-mono text-lg font-semibold">{formatNumber(billingCalculation.details.superCompressibilityFactor, 6)}</div>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="font-mono text-sm text-gray-700 bg-white p-3 rounded-lg">
                          {billingCalculation.details.formula}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {billingCalculation && !billingCalculation.success && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-6 border-l-4 border-l-red-500">
              <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                <span className="mr-2">⚠️</span> Calculation Error
              </h3>
              <p className="text-red-700 bg-white p-4 rounded-lg">{billingCalculation.error}</p>
            </div>
          )}

          {/* Pricing Data */}
          {combinedExtractedData && (combinedExtractedData.harga_satuan || combinedExtractedData.total_harga) && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">💵</span> Pricing Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harga Satuan</label>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(combinedExtractedData.harga_satuan)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Harga</label>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(combinedExtractedData.total_harga)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Image Preview */}
          {((ocrResult?.image_url) || (isTestMode && testModeImageUrl)) && (
            <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🖼️</span> Processed Image
              </h3>
              <div className="flex justify-center">
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000'}${isTestMode ? testModeImageUrl! : `/uploads/ocr/${ocrResult?.image_url}`}`}
                  alt="Processed nota"
                  className="max-w-4xl w-full h-auto max-h-96 rounded-xl shadow-lg ring-2 ring-gray-200"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex flex-wrap gap-3 mb-4 sm:mb-0">
            {!isTestMode && onReprocess && ocrResult && (
              <button
                onClick={() => onReprocess(ocrResult.id)}
                disabled={isReprocessing}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-semibold flex items-center gap-2"
              >
                {isReprocessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Reprocessing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reprocess OCR
                  </>
                )}
              </button>
            )}
            {!isTestMode && onEdit && ocrResult && (
              <button
                onClick={() => onEdit(ocrResult.id)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl hover:from-amber-600 hover:to-yellow-700 transition-all shadow-lg font-semibold"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232a3.75 3.75 0 11-5.31 5.31m5.31-5.31a3.75 3.75 0 11-5.31-5.31m5.31 5.31L21 21.25" />
                </svg>
                Edit Data
              </button>
            )}
            {!isTestMode && onDelete && ocrResult && (
              <button
                onClick={() => onDelete(ocrResult.id)}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all shadow-lg font-semibold"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg font-semibold"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OCRResultModal;