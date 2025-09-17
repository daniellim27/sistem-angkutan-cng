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
    stan_akhir: null,
    tekanan_operasi: null,
    temperatur_operasi: null,
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

    // Validate required fields
    if (!formData.stan_awal || formData.stan_awal <= 0) {
      newErrors.stan_awal = 'Stan awal must be a positive number';
    }

    if (!formData.stan_akhir || formData.stan_akhir <= 0) {
      newErrors.stan_akhir = 'Stan akhir must be a positive number';
    }

    if (!formData.tekanan_operasi || formData.tekanan_operasi <= 0) {
      newErrors.tekanan_operasi = 'Tekanan operasi must be a positive number';
    }

    if (!formData.temperatur_operasi || formData.temperatur_operasi <= 0) {
      newErrors.temperatur_operasi = 'Temperatur operasi must be a positive number';
    }

    // Validate logical constraints
    if (formData.stan_akhir && formData.stan_awal && formData.stan_akhir <= formData.stan_awal) {
      newErrors.stan_akhir = 'Stan akhir must be greater than stan awal';
    }

    // Validate ranges
    if (formData.tekanan_operasi && (formData.tekanan_operasi < 0.1 || formData.tekanan_operasi > 100)) {
      newErrors.tekanan_operasi = 'Tekanan operasi should be between 0.1 and 100 bar';
    }

    if (formData.temperatur_operasi && (formData.temperatur_operasi < -50 || formData.temperatur_operasi > 100)) {
      newErrors.temperatur_operasi = 'Temperatur operasi should be between -50°C and 100°C';
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
        <div className="p-6 space-y-4">
          {/* Date/Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="datetime-local"
                value={formatDateTime(formData.tanggal_mulai)}
                onChange={(e) => handleInputChange('tanggal_mulai', parseDateTime(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Selesai
              </label>
              <input
                type="datetime-local"
                value={formatDateTime(formData.tanggal_selesai)}
                onChange={(e) => handleInputChange('tanggal_selesai', parseDateTime(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Meter Readings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stan Awal (m³) *
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.stan_awal || ''}
                onChange={(e) => handleInputChange('stan_awal', e.target.value ? parseFloat(e.target.value) : null)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.stan_awal ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter stan awal"
              />
              {errors.stan_awal && (
                <p className="mt-1 text-sm text-red-600">{errors.stan_awal}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stan Akhir (m³) *
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.stan_akhir || ''}
                onChange={(e) => handleInputChange('stan_akhir', e.target.value ? parseFloat(e.target.value) : null)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.stan_akhir ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter stan akhir"
              />
              {errors.stan_akhir && (
                <p className="mt-1 text-sm text-red-600">{errors.stan_akhir}</p>
              )}
            </div>
          </div>

          {/* Operational Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tekanan Operasi (Bar) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tekanan_operasi || ''}
                onChange={(e) => handleInputChange('tekanan_operasi', e.target.value ? parseFloat(e.target.value) : null)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.tekanan_operasi ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter tekanan operasi"
              />
              {errors.tekanan_operasi && (
                <p className="mt-1 text-sm text-red-600">{errors.tekanan_operasi}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperatur Operasi (°C) *
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperatur_operasi || ''}
                onChange={(e) => handleInputChange('temperatur_operasi', e.target.value ? parseFloat(e.target.value) : null)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.temperatur_operasi ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter temperatur operasi"
              />
              {errors.temperatur_operasi && (
                <p className="mt-1 text-sm text-red-600">{errors.temperatur_operasi}</p>
              )}
            </div>
          </div>

          {/* Pricing Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Satuan (IDR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.harga_satuan || ''}
                onChange={(e) => handleInputChange('harga_satuan', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter harga satuan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Harga (IDR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total_harga || ''}
                onChange={(e) => handleInputChange('total_harga', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter total harga"
              />
            </div>
          </div>

          {/* Confidence Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confidence Score (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.confidence || ''}
              onChange={(e) => handleInputChange('confidence', e.target.value ? parseFloat(e.target.value) : 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter confidence score"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OCRDataEditor;

