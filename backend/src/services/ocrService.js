const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Ensure dotenv is loaded (override system env vars to use .env file)
require('dotenv').config({ override: true });

class OCRService {
  constructor() {
    // Trim whitespace from API key
    const rawKey = process.env.OPENAI_API_KEY || '';
    const apiKey = rawKey.trim();
    
    this.isConfigured = !!apiKey;
    if (this.isConfigured) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      this.modelName = process.env.OPENAI_NOTA_OCR_MODEL || process.env.OPENAI_OCR_MODEL || 'gpt-5-mini';
      console.log('✅ OpenAI OCR service initialized successfully');
      
      // Warn if key had whitespace
      if (rawKey !== apiKey) {
        console.warn('⚠️ OPENAI_API_KEY contained leading/trailing whitespace; it has been trimmed');
      }
    } else {
      console.warn('⚠️ OpenAI API key not configured. OCR service will be disabled.');
    }
  }

  /**
   * Check if OCR service is properly configured
   * @returns {Object} Configuration status
   */
  checkConfiguration() {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    return {
      isConfigured: hasApiKey,
      hasApiKey: hasApiKey,
      apiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
      apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'undefined'
    };
  }

  /**
   * Process nota image using OpenAI GPT-4 Vision - NEW SCHEMA
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} options - Processing options
   * @returns {Object} Extracted data and confidence scores
   */
  async processNotaImage(imageBuffer, options = {}) {
    // Double-check configuration before processing
    const config = this.checkConfiguration();
    
    if (!this.isConfigured || !config.isConfigured) {
      throw new Error('OCR service is not configured. Please set OPENAI_API_KEY environment variable.');
    }

    try {
      const prompt = this.buildNotaPrompt(options);
      
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` 
              }
            }
          ]
        }],
        // GPT‑5 family: use max_completion_tokens instead of max_tokens
        max_completion_tokens: 1000
      });

      // Parse the response, handling markdown code blocks
      let responseContent = response.choices[0].message.content;
      
      // Remove markdown code blocks if present
      if (responseContent.includes('```json')) {
        responseContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (responseContent.includes('```')) {
        responseContent = responseContent.replace(/```\n?/g, '');
      }
      
      // Clean up any extra whitespace
      responseContent = responseContent.trim();
      
      const extractedData = JSON.parse(responseContent);
      
      // Validate and clean the extracted data
      return this.validateAndCleanNotaData(extractedData);
      
    } catch (error) {
      console.error('OCR Processing Error:', error);
      
      // Provide more helpful error messages for common issues
      if (error.message && (error.message.includes('401') || error.message.includes('Incorrect API key'))) {
        throw new Error(`OCR processing failed: Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env file. The key may be expired or incorrect. Visit https://platform.openai.com/account/api-keys to verify your key.`);
      } else {
      throw new Error(`OCR processing failed: ${error.message}`);
      }
    }
  }

  /**
   * Build the prompt for nota OCR processing - NEW SCHEMA
   * @param {Object} options - Processing options
   * @returns {String} Formatted prompt
   */
  buildNotaPrompt(options = {}) {
    return `
Analyze this gas station receipt (nota) image and extract the following information in JSON format.

CRITICAL: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Do not wrap the response in \`\`\`json or \`\`\`.

{
  "tanggal_mulai": "YYYY-MM-DD HH:mm:ss",
  "tanggal_selesai": "YYYY-MM-DD HH:mm:ss", 
  "stan_awal": number,
  "current_stan": number,
  "pressure_inlet": number,
  "pressure_outlet": number,
  "temperature": number,
  "harga_satuan": number,
  "total_harga": number,
  "confidence": number
}

Look for these specific fields:
- Date/time stamps (TANGGAL/JAM) - convert to YYYY-MM-DD HH:mm:ss format
- Initial meter reading (STAN AWAL / Meter Awal) - extract as number
- Current/final meter reading (STAN AKHIR / Meter Akhir / Current Stan) - extract as number
- Inlet pressure (Tekanan Masuk / Pressure Inlet) - extract as decimal number in Bar
- Outlet pressure (Tekanan Keluar / Pressure Outlet) - extract as decimal number in Bar  
- Temperature (Suhu / Temperature) - extract as decimal number in °C
- Unit price and total price - extract as decimal numbers

Rules:
- If any field cannot be found, use null
- "current_stan" is the final meter reading (STAN AKHIR)
- Confidence should be 0-100 based on image clarity and text readability
- For dates, use current year if only day/month is visible
- For numbers, remove any thousand separators and convert to decimal
- If multiple values found for same field, use the most recent/last one

Return ONLY the JSON object starting with { and ending with }. No markdown, no code blocks, no explanations.
    `.trim();
  }

  /**
   * Validate and clean nota extracted data - NEW SCHEMA
   * @param {Object} data - Raw extracted data
   * @returns {Object} Cleaned and validated data
   */
  validateAndCleanNotaData(data) {
    const cleaned = {
      tanggal_mulai: this.parseDateTime(data.tanggal_mulai),
      tanggal_selesai: this.parseDateTime(data.tanggal_selesai),
      stan_awal: this.parseNumber(data.stan_awal),
      current_stan: this.parseNumber(data.current_stan),
      pressure_inlet: this.parseNumber(data.pressure_inlet),
      pressure_outlet: this.parseNumber(data.pressure_outlet),
      temperature: this.parseNumber(data.temperatur_operasi || data.temperature),
      harga_satuan: this.parseNumber(data.harga_satuan),
      total_harga: this.parseNumber(data.total_harga),
      confidence: this.parseNumber(data.confidence) || 0,
      extracted_at: new Date(),
      raw_data: data
    };

    // Calculate overall confidence based on field completeness - NEW SCHEMA
    const fields = ['stan_awal', 'current_stan', 'pressure_inlet', 'temperature'];
    const filledFields = fields.filter(field => cleaned[field] !== null).length;
    const completenessScore = (filledFields / fields.length) * 100;
    
    cleaned.overall_confidence = Math.round((cleaned.confidence + completenessScore) / 2);

    return cleaned;
  }

  /**
   * Parse date time string
   * @param {String} dateString - Date string to parse
   * @returns {Date|null} Parsed date or null
   */
  parseDateTime(dateString) {
    if (!dateString || dateString === 'null') return null;
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse number string
   * @param {String|Number} value - Value to parse
   * @returns {Number|null} Parsed number or null
   */
  parseNumber(value) {
    if (value === null || value === undefined || value === 'null') return null;
    
    if (typeof value === 'number') return value;
    
    // Remove thousand separators and convert to number
    const cleaned = String(value).replace(/[,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Process multiple images (for batch processing)
   * @param {Array} imageBuffers - Array of image buffers
   * @param {Object} options - Processing options
   * @returns {Array} Array of extracted data
   */
  async processMultipleImages(imageBuffers, options = {}) {
    const results = [];
    
    for (let i = 0; i < imageBuffers.length; i++) {
      try {
        const result = await this.processNotaImage(imageBuffers[i], options);
        results.push({
          index: i,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message,
          data: null
        });
      }
    }
    
    return results;
  }

  /**
   * Process surat jalan image using OpenAI GPT-4 Vision
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} options - Processing options
   * @returns {Object} Extracted data and confidence scores
   */
  async processSuratJalanImage(imageBuffer, options = {}) {
    const config = this.checkConfiguration();
    
    if (!this.isConfigured || !config.isConfigured) {
      throw new Error('OCR service is not configured. Please set OPENAI_API_KEY environment variable.');
    }

    try {
      const prompt = this.buildSuratJalanPrompt(options);
      
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` 
              }
            }
          ]
        }],
        max_completion_tokens: 1000
      });

      let responseContent = response.choices[0].message.content;
      
      // Remove markdown code blocks if present
      if (responseContent.includes('```json')) {
        responseContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (responseContent.includes('```')) {
        responseContent = responseContent.replace(/```\n?/g, '');
      }
      
      responseContent = responseContent.trim();
      const extractedData = JSON.parse(responseContent);
      
      return this.validateAndCleanSuratJalanData(extractedData);
      
    } catch (error) {
      console.error('Surat Jalan OCR Processing Error:', error);
      
      // Provide more helpful error messages for common issues
      if (error.message && (error.message.includes('401') || error.message.includes('Incorrect API key'))) {
        throw new Error(`Surat Jalan OCR processing failed: Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env file. The key may be expired or incorrect. Visit https://platform.openai.com/account/api-keys to verify your key.`);
      } else {
      throw new Error(`Surat Jalan OCR processing failed: ${error.message}`);
      }
    }
  }

  /**
   * Build the prompt for surat jalan OCR processing
   * @param {Object} options - Processing options
   * @returns {String} Formatted prompt
   */
  buildSuratJalanPrompt(options = {}) {
    return `
Analyze this "Surat Jalan" (delivery note) image and extract the following information in JSON format.

CRITICAL: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Do not wrap the response in \`\`\`json or \`\`\`.

{
  "total_volume_pengisian": number,
  "nomor_surat_jalan": string,
  "tanggal": "YYYY-MM-DD",
  "nama_pengirim": string,
  "alamat_pengirim": string,
  "nama_penerima": string,
  "alamat_penerima": string,
  "jenis_barang": string,
  "satuan": string,
  "keterangan": string,
  "confidence": number
}

Look for these specific fields:
- "Total Volume Pengisian" - the most important field, extract as a decimal number
- Document number (Nomor Surat Jalan/No.)
- Date (Tanggal)
- Sender information (Pengirim/From)
- Receiver information (Penerima/To/Kepada)
- Type of goods (Jenis Barang/Nama Barang)
- Unit of measurement (Satuan/Unit) - typically m³, kg, liter, etc.
- Additional notes (Keterangan/Catatan)

Rules:
- If any field cannot be found, use null for numbers/objects or empty string for strings
- Confidence should be 0-100 based on image clarity and text readability
- For "total_volume_pengisian", look for variations like: "Total Volume", "Volume Pengisian", "Jumlah", "Qty"
- Remove any thousand separators and convert numbers to decimal
- For tanggal, try to extract in YYYY-MM-DD format, use null if not found

Return ONLY the JSON object starting with { and ending with }. No markdown, no code blocks, no explanations.
    `.trim();
  }

  /**
   * Validate and clean surat jalan extracted data
   * @param {Object} data - Raw extracted data
   * @returns {Object} Cleaned and validated data
   */
  validateAndCleanSuratJalanData(data) {
    const cleaned = {
      total_volume_pengisian: this.parseNumber(data.total_volume_pengisian),
      nomor_surat_jalan: data.nomor_surat_jalan || null,
      tanggal: this.parseDateTime(data.tanggal),
      nama_pengirim: data.nama_pengirim || null,
      alamat_pengirim: data.alamat_pengirim || null,
      nama_penerima: data.nama_penerima || null,
      alamat_penerima: data.alamat_penerima || null,
      jenis_barang: data.jenis_barang || null,
      satuan: data.satuan || null,
      keterangan: data.keterangan || null,
      confidence: this.parseNumber(data.confidence) || 0,
      extracted_at: new Date(),
      raw_data: data
    };

    // Calculate overall confidence
    const criticalFields = ['total_volume_pengisian'];
    const optionalFields = ['nomor_surat_jalan', 'tanggal', 'nama_pengirim', 'nama_penerima'];
    
    const criticalFilled = criticalFields.filter(field => cleaned[field] !== null).length;
    const optionalFilled = optionalFields.filter(field => cleaned[field] !== null).length;
    
    const criticalScore = (criticalFilled / criticalFields.length) * 60; // 60% weight
    const optionalScore = (optionalFilled / optionalFields.length) * 40; // 40% weight
    
    cleaned.overall_confidence = Math.round(criticalScore + optionalScore);

    return cleaned;
  }

  /**
   * Get processing statistics
   * @param {Array} results - Processing results
   * @returns {Object} Statistics
   */
  getProcessingStats(results) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgConfidence = results
      .filter(r => r.success && r.data.overall_confidence)
      .reduce((sum, r) => sum + r.data.overall_confidence, 0) / successful || 0;

    return {
      total,
      successful,
      failed,
      success_rate: total > 0 ? (successful / total) * 100 : 0,
      average_confidence: Math.round(avgConfidence)
    };
  }
}

module.exports = new OCRService();