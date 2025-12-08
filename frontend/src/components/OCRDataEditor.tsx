// src/components/OCRDataEditor.tsx
import React, { useState, useEffect } from 'react';
import { ExtractedData } from '../api/ocrApi';

interface OCRDataEditorProps {
  isOpen: boolean;
  onClose: () => void;
  extractedData: ExtractedData | null;
  onSave: (data: ExtractedData) => void;
  isSaving?: boolean;
}

const OCRDataEditor: React.FC<OCRDataEditorProps> = ({
  isOpen,
  onClose,
  extractedData,
  onSave,
  isSaving = false,
}) => {
  const [formData, setFormData] = useState<ExtractedData>({
    tanggal_mulai: null,
    tanggal_selesai: null,
    stan_awal: null,
    current_stan: null,
    pressure_inlet: null,
    pressure_outlet: null,
    temperature: null,
    harga_satuan: null,
    total_harga: null,
    confidence: 0,
    overall_confidence: 0,
    extracted_at: new Date().toISOString(),
    raw_data: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (extractedData) {
      setFormData(extractedData);
    }
  }, [extractedData]);

  const handleInputChange = (field: keyof ExtractedData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // ✅ NEW SCHEMA: Validate NEW required fields
    if (!formData.stan_awal || formData.stan_awal <= 0) {
      newErrors.stan_awal = 'Stan awal must be a positive number';
    }

    if (!formData.current_stan || formData.current_stan <= 0) {
      newErrors.current_stan = 'Current stan must be a positive number';
    }

    if (!formData.pressure_inlet || formData.pressure_inlet <= 0) {
      newErrors.pressure_inlet = 'Pressure inlet must be a positive number';
    }

    if (!formData.temperature) {
      newErrors.temperature = 'Temperature is required';
    }

    // Validate logical constraints
    if (formData.current_stan && formData.stan_awal && formData.current_stan <= formData.stan_awal) {
      newErrors.current_stan = 'Current stan must be greater than stan awal';
    }

    // ✅ NEW SCHEMA: Validate ranges
    if (formData.pressure_inlet && (formData.pressure_inlet < 0.1 || formData.pressure_inlet > 100)) {
      newErrors.pressure_inlet = 'Pressure inlet should be between 0.1 and 100 bar';
    }

    if (formData.temperature && (formData.temperature < -50 || formData.temperature > 100)) {
      newErrors.temperature = 'Temperature should be between -50°C and 100°C';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const parseDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return null;
    return new Date(dateTimeString).toISOString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Edit OCR Data</h2>
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
          {/* Date/Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Mulai
              </label>
              <input
                type="datetime-local"
                value={formatDateTime(formData.tanggal_mulai)}
                onChange={(e) => handleInputChange('tanggal_mulai', parseDateTime(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Selesai
              </label>
              <input
                type="datetime-local"
                value={formatDateTime(formData.tanggal_selesai)}
                onChange={(e) => handleInputChange('tanggal_selesai', parseDateTime(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* ✅ NEW SCHEMA: Meter Readings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stan Awal (m³) *
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.stan_awal || ''}
                onChange={(e) => handleInputChange('stan_awal', e.target.value ? parseFloat(e.target.value) : null)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.stan_awal ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter stan awal"
              />
              {errors.stan_awal && (
                <p className="mt-2 text-sm text-red-600">{errors.stan_awal}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Stan (m³) *
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.current_stan || ''}
                onChange={(e) => handleInputChange('current_stan', e.target.value ? parseFloat(e.target.value) : null)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.current_stan ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter current stan"
              />
              {errors.current_stan && (
                <p className="mt-2 text-sm text-red-600">{errors.current_stan}</p>
              )}
            </div>
          </div>

          {/* ✅ NEW SCHEMA: Operational Data */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pressure Inlet (Bar) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.pressure_inlet || ''}
                onChange={(e) => handleInputChange('pressure_inlet', e.target.value ? parseFloat(e.target.value) : null)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.pressure_inlet ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter pressure inlet"
              />
              {errors.pressure_inlet && (
                <p className="mt-2 text-sm text-red-600">{errors.pressure_inlet}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pressure Outlet (Bar)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.pressure_outlet || ''}
                onChange={(e) => handleInputChange('pressure_outlet', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter pressure outlet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (°C) *
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature || ''}
                onChange={(e) => handleInputChange('temperature', e.target.value ? parseFloat(e.target.value) : null)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.temperature ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter temperature"
              />
              {errors.temperature && (
                <p className="mt-2 text-sm text-red-600">{errors.temperature}</p>
              )}
            </div>
          </div>

          {/* Pricing Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga Satuan (IDR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.harga_satuan || ''}
                onChange={(e) => handleInputChange('harga_satuan', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter harga satuan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Harga (IDR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total_harga || ''}
                onChange={(e) => handleInputChange('total_harga', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter total harga"
              />
            </div>
          </div>

          {/* Confidence Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Score (0-100)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.confidence || 0}
                onChange={(e) => handleInputChange('confidence', parseFloat(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Low</span>
                <span>{Math.round(formData.confidence || 0)}%</span>
                <span>High</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Confidence
              </label>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full"
                  style={{ width: `${formData.overall_confidence || 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {Math.round(formData.overall_confidence || 0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || Object.keys(errors).length > 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OCRDataEditor;