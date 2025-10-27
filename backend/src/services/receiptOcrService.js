const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class ReceiptOcrService {
  constructor() {
    this.ocrApiUrl = process.env.OCR_API_URL || 'http://localhost:5000/api/ocr';
    this.confidenceThreshold = 0.7; // Minimum confidence score for auto-acceptance
  }

  /**
   * Process receipt image and extract structured data
   * @param {Object} imageFile - Multer file object
   * @returns {Object} Extracted receipt data
   */
  async processReceiptImage(imageFile) {
    try {
      console.log('Processing receipt image for OCR...');
      
      // For now, we'll use simulated data based on the PGN GAGAS receipt format
      // In production, this would call an actual OCR service
      const simulatedData = await this.simulateReceiptOCR(imageFile);
      
      return {
        success: true,
        data: simulatedData,
        message: 'Receipt processed successfully'
      };
    } catch (error) {
      console.error('Error processing receipt image:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to process receipt image'
      };
    }
  }

  /**
   * Simulate OCR processing for CNG receipt
   * @param {Object} imageFile - Image file
   * @returns {Object} Simulated extracted data
   */
  async simulateReceiptOCR(imageFile) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate extracted data based on the PGN GAGAS receipt format
    const extractedData = {
      filling_station_name: 'SPBG Rawu',
      customer_name: 'PT Qurpol',
      filling_date: '2025-09-23',
      filling_time_start: '19:01',
      filling_time_end: '19:42',
      initial_pressure: 105,
      final_pressure: 200,
      total_volume: 93.423,
      customer_signatory: 'UJAJANG',
      provider_signatory: 'Angyu',
      confidence_scores: {
        filling_station_name: 0.95,
        customer_name: 0.92,
        filling_date: 0.88,
        filling_time_start: 0.90,
        filling_time_end: 0.90,
        initial_pressure: 0.93,
        final_pressure: 0.94,
        total_volume: 0.91,
        customer_signatory: 0.85,
        provider_signatory: 0.87
      },
      receipt_photo_url: await this.saveReceiptImage(imageFile),
      ocr_confidence_score: 0.91 // Overall confidence
    };

    return extractedData;
  }

  /**
   * Save receipt image and return URL
   * @param {Object} imageFile - Multer file object
   * @returns {string} Image URL
   */
  async saveReceiptImage(imageFile) {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../uploads/receipts');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `receipt_${timestamp}.jpg`;
      const filepath = path.join(uploadsDir, filename);

      // Save file
      fs.writeFileSync(filepath, imageFile.buffer);

      // Return relative URL
      return `/uploads/receipts/${filename}`;
    } catch (error) {
      console.error('Error saving receipt image:', error);
      throw new Error('Failed to save receipt image');
    }
  }

  /**
   * Validate extracted receipt data
   * @param {Object} data - Extracted data
   * @returns {Object} Validation result
   */
  validateExtractedData(data) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!data.filling_station_name) {
      errors.push('Filling station name is required');
    }
    if (!data.customer_name) {
      errors.push('Customer name is required');
    }
    if (!data.filling_date) {
      errors.push('Filling date is required');
    }
    if (!data.total_volume || data.total_volume <= 0) {
      errors.push('Total volume must be greater than 0');
    }

    // Confidence score validation
    if (data.ocr_confidence_score < 0.5) {
      warnings.push('Low OCR confidence score - manual review recommended');
    }

    // Date format validation
    if (data.filling_date && !this.isValidDate(data.filling_date)) {
      warnings.push('Invalid date format');
    }

    // Pressure validation
    if (data.initial_pressure && data.final_pressure && 
        data.initial_pressure >= data.final_pressure) {
      warnings.push('Initial pressure should be less than final pressure');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if date string is valid
   * @param {string} dateString - Date string to validate
   * @returns {boolean} Is valid date
   */
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Calculate overall confidence score
   * @param {Object} confidenceScores - Individual field confidence scores
   * @returns {number} Overall confidence score
   */
  calculateOverallConfidence(confidenceScores) {
    const scores = Object.values(confidenceScores);
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return sum / scores.length;
  }

  /**
   * Process receipt with real OCR service (for future implementation)
   * @param {Object} imageFile - Image file
   * @returns {Object} OCR result
   */
  async processWithRealOCR(imageFile) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile.buffer, {
        filename: imageFile.originalname,
        contentType: imageFile.mimetype
      });

      const response = await axios.post(`${this.ocrApiUrl}/process-receipt`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.message || 'OCR processing failed');
      }
    } catch (error) {
      console.error('Real OCR processing error:', error);
      throw new Error('OCR service unavailable');
    }
  }

  /**
   * Extract specific fields from OCR text
   * @param {string} ocrText - Raw OCR text
   * @returns {Object} Extracted fields
   */
  extractFieldsFromText(ocrText) {
    const extracted = {};

    // Extract filling station name (look for "SPBG" pattern)
    const stationMatch = ocrText.match(/SPBG\s+(\w+)/i);
    if (stationMatch) {
      extracted.filling_station_name = `SPBG ${stationMatch[1]}`;
    }

    // Extract customer name (look for "PT" pattern)
    const customerMatch = ocrText.match(/PT\s+(\w+)/i);
    if (customerMatch) {
      extracted.customer_name = `PT ${customerMatch[1]}`;
    }

    // Extract date (look for date patterns)
    const dateMatch = ocrText.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      extracted.filling_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Extract time range
    const timeMatch = ocrText.match(/(\d{1,2}):(\d{2})\s*[-\/]\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const [, startHour, startMin, endHour, endMin] = timeMatch;
      extracted.filling_time_start = `${startHour.padStart(2, '0')}:${startMin}`;
      extracted.filling_time_end = `${endHour.padStart(2, '0')}:${endMin}`;
    }

    // Extract pressures
    const pressureMatch = ocrText.match(/(\d+)\s*bar/gi);
    if (pressureMatch && pressureMatch.length >= 2) {
      extracted.initial_pressure = parseInt(pressureMatch[0]);
      extracted.final_pressure = parseInt(pressureMatch[1]);
    }

    // Extract volume
    const volumeMatch = ocrText.match(/(\d+\.?\d*)\s*M³/i);
    if (volumeMatch) {
      extracted.total_volume = parseFloat(volumeMatch[1]);
    }

    return extracted;
  }

  /**
   * Generate confidence scores for extracted fields
   * @param {Object} extractedData - Extracted data
   * @param {string} ocrText - Original OCR text
   * @returns {Object} Confidence scores
   */
  generateConfidenceScores(extractedData, ocrText) {
    const scores = {};
    const text = ocrText.toLowerCase();

    // Simple confidence scoring based on field presence and patterns
    scores.filling_station_name = extractedData.filling_station_name ? 0.9 : 0.0;
    scores.customer_name = extractedData.customer_name ? 0.9 : 0.0;
    scores.filling_date = extractedData.filling_date ? 0.8 : 0.0;
    scores.filling_time_start = extractedData.filling_time_start ? 0.8 : 0.0;
    scores.filling_time_end = extractedData.filling_time_end ? 0.8 : 0.0;
    scores.initial_pressure = extractedData.initial_pressure ? 0.9 : 0.0;
    scores.final_pressure = extractedData.final_pressure ? 0.9 : 0.0;
    scores.total_volume = extractedData.total_volume ? 0.9 : 0.0;
    scores.customer_signatory = extractedData.customer_signatory ? 0.7 : 0.0;
    scores.provider_signatory = extractedData.provider_signatory ? 0.7 : 0.0;

    return scores;
  }
}

module.exports = new ReceiptOcrService();


