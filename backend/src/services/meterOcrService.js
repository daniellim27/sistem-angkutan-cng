/**
 * Meter OCR Service
 * 
 * Specialized OCR processing for gas meter readings
 * Extracts:
 * - Meter reading (volume in m³)
 * - Pressure (bar or psi)
 * - Temperature (°C)
 * - Flow rate (m³/h)
 * - Timestamp from meter display
 */

const axios = require('axios');
const { OpenAI } = require('openai');

class MeterOcrService {
  constructor() {
    // Use OpenAI Vision API for OCR
    const rawKey = process.env.OPENAI_API_KEY || '';
    const apiKey = rawKey.trim();

    this.currentApiKey = apiKey;
    this.openai = new OpenAI({ apiKey: this.currentApiKey });
    this.isConfigured = !!this.currentApiKey;

    if (!this.currentApiKey) {
      console.warn('⚠️ OPENAI_API_KEY is empty or not set');
    } else if (/\s/.test(rawKey)) {
      console.warn('⚠️ OPENAI_API_KEY contained leading/trailing whitespace; it has been trimmed');
    }
  }

  refreshFromEnvIfChanged() {
    const rawKey = process.env.OPENAI_API_KEY || '';
    const newKey = rawKey.trim();
    if (newKey !== this.currentApiKey) {
      this.currentApiKey = newKey;
      this.openai = new OpenAI({ apiKey: this.currentApiKey });
      this.isConfigured = !!this.currentApiKey;
      console.log('🔄 OpenAI API key updated in runtime:', this.isConfigured ? 'configured' : 'not configured');
    }
  }


  /**
   * Process meter reading from screenshot WITH meter_type
   * @param {string} imageUrl - URL of the screenshot  
   * @param {string} meterType - REQUIRED meter type
   * @returns {Promise<Object>} Extracted meter data
   */
  async processMeterReading(imageUrl, meterType) {
    try {
      this.refreshFromEnvIfChanged();
      
      // ✅ Use meterType (camelCase) consistently
      if (!meterType) {
        throw new Error('meter_type is REQUIRED (temperature, pressure, stan_awal, stan_akhir, other)');
      }

      console.log(`🔍 Processing ${meterType} meter OCR: ${imageUrl}`);

      if (!this.isConfigured) {
        throw new Error('OpenAI API key not configured');
      }

      // ✅ CALL WITH meterType (camelCase)
      const ocrResponse = await this.callOcrApi(imageUrl, meterType);

      // ✅ meterType SPECIFIC parsing - use camelCase consistently
      let parsedData = {
        meter_reading: null,
        pressure: null,
        temperature: null,
        flow_rate: null,
        unit: 'm³',
        timestamp_on_meter: null,
        raw_text: ocrResponse.text,
        meter_type: meterType  // ✅ Save for reference - use camelCase parameter
      };

      // Extract based on meterType
      switch (meterType) {
        case 'temperature':
          parsedData.temperature = ocrResponse.number;
          break;
        case 'pressure_inlet':
        case 'pressure_outlet':
          parsedData.pressure = ocrResponse.number;  // Both pressure types → same field
          parsedData[meterType] = ocrResponse.number;  // Store separately too
          break;
        case 'stan':
          parsedData.meter_reading = ocrResponse.number;
          parsedData.stan = ocrResponse.number;  // ✅ Continuous STAN
          break;
      }

      // Validate - make sure validateMeterData uses meterType parameter
      parsedData = this.validateMeterData(parsedData, meterType);

      // Confidence (higher for specialized prompts)
      const confidenceScore = ocrResponse.number ? 0.95 : 0.65;

      return {
        success: true,
        data: parsedData,
        raw_response: ocrResponse,
        confidence_score: confidenceScore,
      };
    } catch (error) {
      console.error(`Meter OCR ${meterType} error:`, error);
      return {
        success: false,
        error: error.message,
        data: null,
        raw_response: null,
        confidence_score: 0,
      };
    }
  }

  /**
   * Call OCR API with meter_type-specific prompts
   * @param {string} imageUrl - URL of the image
   * @param {string} meterType - Type of meter ('temperature', 'pressure', 'stan_awal', 'stan_akhir', 'other')
   * @returns {Promise<Object>} OCR response
   */
  async callOcrApi(imageUrl, meterType = 'other') {
    try {
      this.refreshFromEnvIfChanged();
      if (!this.isConfigured) throw new Error('OpenAI API key missing');

      console.log(`🤖 OCR for ${meterType.toUpperCase()} meter: ${imageUrl}`);

      // ✅ METER-TYPE SPECIFIC PROMPTS
      const prompts = {
        temperature: `You are reading a THERMOMETER (CELSIUS).

      FOCUS ONLY on the BLACK CELSIUS SCALE (below the circle).

      RULES:
      1. Each SMALL TICK = 2°C
      2. Find BIG NUMBER BELOW needle (10, 20, 30, etc.)
      3. COUNT small ticks AFTER big number to needle
      4. INCLUDE hidden tick behind needle
      5. Formula: value = base + (ticks × 2)

      EXAMPLE: Needle at 25.4°C → "25.4"

      REPLY ONLY WITH NUMBER (e.g., "28.6")`,

        pressure_inlet: `You are reading PRESSURE INLET GAUGE (BAR).

      FOCUS ONLY on INLET PRESSURE gauge (usually LEFT or labeled "INLET").

      RULES:
      1. Each SMALL TICK = 0.1 bar
      2. Find BIG NUMBER BELOW needle (200, 210, 220, etc.)
      3. COUNT small ticks AFTER big number to needle
      4. INCLUDE hidden tick behind needle
      5. Formula: value = base + (ticks × 0.1)

      EXAMPLE: Needle at 215.3 bar → "215.3"

      REPLY ONLY WITH NUMBER (e.g., "215.3")`,

        pressure_outlet: `You are reading PRESSURE OUTLET GAUGE (BAR).

      FOCUS ONLY on OUTLET PRESSURE gauge (usually RIGHT or labeled "OUTLET").

      RULES:
      1. Each SMALL TICK = 0.1 bar
      2. Find BIG NUMBER BELOW needle (200, 210, 220, etc.)
      3. COUNT small ticks AFTER big number to needle
      4. INCLUDE hidden tick behind needle
      5. Formula: value = base + (ticks × 0.1)

      EXAMPLE: Needle at 205.8 bar → "205.8"

      REPLY ONLY WITH NUMBER (e.g., "205.8")`,

        stan: `You are reading CONTINUOUS GAS METER (STAN).

      FOCUS on DIGITAL DISPLAY showing TOTAL VOLUME in m³.

      1. Look for largest number with m³ unit
      2. Usually 4-6 digits with decimals (e.g., 12345.678)
      3. This is CONTINUOUS reading (increases over time)

      EXAMPLE: 12345.678 m³ → "12345.678"

      REPLY ONLY WITH NUMBER (e.g., "12345.678")`
      };

      const prompt = prompts[meterType] || prompts.other;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 20,        // ✅ SHORT - just a number!
        temperature: 0.1       // ✅ CONSISTENT
      });

      const content = response.choices[0].message.content.trim();
      console.log(`✅ ${meterType} OCR → "${content}"`);

      // ✅ PARSE AS NUMBER (since prompts return just numbers)
      let extractedNumber = null;
      try {
        extractedNumber = parseFloat(content);
        if (isNaN(extractedNumber)) extractedNumber = null;
      } catch (e) {
        extractedNumber = null;
      }

      return {
        text: content,
        confidence: extractedNumber ? 0.95 : 0.6,
        raw: {
          meter_type: meterType,
          extracted_number: extractedNumber,
          raw_text: content
        },
        number: extractedNumber  // ✅ EASY ACCESS
      };

    } catch (error) {
      console.error(`OCR failed for ${meterType}:`, error.message);
      throw new Error(`OCR ${meterType}: ${error.message}`);
    }
  }

  /**
   * Get mock OCR response for development/testing
   * @returns {Object} Mock OCR data
   */
  getMockOcrResponse() {
    const mockReadings = [
      {
        meter_reading: 1234.56,
        pressure: 205.3,
        temperature: 28.5,
        flow_rate: 15.2,
        unit: 'm³',
      },
      {
        meter_reading: 2456.78,
        pressure: 198.7,
        temperature: 27.3,
        flow_rate: 14.8,
        unit: 'm³',
      },
      {
        meter_reading: 3678.90,
        pressure: 212.1,
        temperature: 29.1,
        flow_rate: 16.5,
        unit: 'm³',
      },
    ];

    // Return random mock reading
    const reading = mockReadings[Math.floor(Math.random() * mockReadings.length)];

    return {
      text: `
        METER READING: ${reading.meter_reading} ${reading.unit}
        PRESSURE: ${reading.pressure} bar
        TEMPERATURE: ${reading.temperature} °C
        FLOW RATE: ${reading.flow_rate} m³/h
        DATE: ${new Date().toLocaleDateString()}
        TIME: ${new Date().toLocaleTimeString()}
      `.trim(),
      confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
      raw: { mock: true, reading },
    };
  }

  /**
   * Parse OCR text to extract meter data
   * @param {string} text - OCR extracted text
   * @returns {Object} Parsed meter data
   */
  parseMeterData(text) {
    let data = {
      meter_reading: null,
      pressure: null,
      temperature: null,
      flow_rate: null,
      unit: 'm³',
      timestamp_on_meter: null,
      raw_text: text,
    };

    if (!text) {
      return data;
    }

    const upperText = text.toUpperCase();

    // Extract meter reading
    // Look for patterns like "METER: 1234.56" or "READING: 1234.56" or just numbers
    const meterPatterns = [
      /METER\s*READING[:\s]+(\d+\.?\d*)/i,
      /READING[:\s]+(\d+\.?\d*)/i,
      /METER[:\s]+(\d+\.?\d*)/i,
      /(\d{3,}\.?\d*)\s*m³?/i, // Numbers followed by m³
    ];

    for (const pattern of meterPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.meter_reading = parseFloat(match[1]);
        break;
      }
    }

    // Extract pressure (bar or psi)
    const pressurePatterns = [
      /PRESSURE[:\s]+(\d+\.?\d*)\s*(bar|psi)?/i,
      /(\d+\.?\d*)\s*bar/i,
      /(\d+\.?\d*)\s*psi/i,
    ];

    for (const pattern of pressurePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.pressure = parseFloat(match[1]);
        break;
      }
    }

    // Extract temperature (°C or °F)
    const tempPatterns = [
      /TEMPERATURE[:\s]+(\d+\.?\d*)\s*°?[CF]?/i,
      /TEMP[:\s]+(\d+\.?\d*)\s*°?[CF]?/i,
      /(\d+\.?\d*)\s*°C/i,
      /(\d+\.?\d*)\s*°F/i,
    ];

    for (const pattern of tempPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.temperature = parseFloat(match[1]);
        break;
      }
    }

    // Extract flow rate
    const flowPatterns = [
      /FLOW\s*RATE[:\s]+(\d+\.?\d*)/i,
      /FLOW[:\s]+(\d+\.?\d*)/i,
      /(\d+\.?\d*)\s*m³\/h/i,
    ];

    for (const pattern of flowPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.flow_rate = parseFloat(match[1]);
        break;
      }
    }

    // Extract timestamp from meter
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    const timeMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);

    if (dateMatch || timeMatch) {
      let timestamp = '';
      if (dateMatch) {
        timestamp = `${dateMatch[0]}`;
      }
      if (timeMatch) {
        timestamp += ` ${timeMatch[0]}`;
      }
      data.timestamp_on_meter = timestamp.trim();
    }

    // Validate extracted data
    data = this.validateMeterData(data);

    return data;
  }

  /**
   * Validate extracted meter data
   * @param {Object} data - Extracted data
   * @returns {Object} Validated data
   */
  validateMeterData(data) {
    // Validate meter reading (should be positive, reasonable range)
    if (data.meter_reading !== null) {
      if (data.meter_reading < 0 || data.meter_reading > 999999) {
        console.warn(`⚠️ Suspicious meter reading: ${data.meter_reading}`);
      }
    }

    // Validate pressure (typical CNG pressure: 200-250 bar)
    if (data.pressure !== null) {
      if (data.pressure < 0 || data.pressure > 500) {
        console.warn(`⚠️ Suspicious pressure reading: ${data.pressure}`);
      }
    }

    // Validate temperature (typical range: -20 to 60°C)
    if (data.temperature !== null) {
      if (data.temperature < -50 || data.temperature > 100) {
        console.warn(`⚠️ Suspicious temperature reading: ${data.temperature}`);
      }
    }

    // Validate flow rate (typical range: 0-100 m³/h)
    if (data.flow_rate !== null) {
      if (data.flow_rate < 0 || data.flow_rate > 200) {
        console.warn(`⚠️ Suspicious flow rate: ${data.flow_rate}`);
      }
    }

    return data;
  }

  /**
   * Calculate confidence score for OCR results
   * @param {Object} parsedData - Parsed meter data
   * @param {Object} ocrResponse - Raw OCR response
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(parsedData, ocrResponse) {
    let score = 0;
    let maxScore = 0;

    // Base confidence from OCR API
    if (ocrResponse.confidence) {
      score += ocrResponse.confidence * 0.3; // 30% weight
      maxScore += 0.3;
    }

    // Data completeness
    if (parsedData.meter_reading !== null) {
      score += 0.3; // 30% weight for meter reading
    }
    maxScore += 0.3;

    if (parsedData.pressure !== null) {
      score += 0.15; // 15% weight for pressure
    }
    maxScore += 0.15;

    if (parsedData.temperature !== null) {
      score += 0.15; // 15% weight for temperature
    }
    maxScore += 0.15;

    if (parsedData.flow_rate !== null) {
      score += 0.1; // 10% weight for flow rate
    }
    maxScore += 0.1;

    // Normalize to 0-1
    const confidence = maxScore > 0 ? score / maxScore : 0;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Retry OCR processing with different parameters
   * @param {string} imageUrl - URL of the screenshot
   * @param {Object} options - Retry options
   * @returns {Promise<Object>} OCR result
   */
  async retryWithEnhancements(imageUrl, options = {}) {
    try {
      // In a real implementation, you might:
      // 1. Pre-process the image (adjust contrast, brightness)
      // 2. Try different OCR engines
      // 3. Use different language models
      // 4. Apply image filters

      console.log('🔄 Retrying OCR with enhancements...');

      // For now, just call the standard process again
      return await this.processMeterReading(imageUrl);
    } catch (error) {
      console.error('Enhanced OCR retry failed:', error);
      throw error;
    }
  }

  /**
   * Batch process multiple screenshots
   * @param {Array} imageUrls - Array of image URLs
   * @returns {Promise<Array>} Array of OCR results
   */
  async batchProcess(imageUrls) {
    try {
      console.log(`📊 Batch processing ${imageUrls.length} screenshots...`);

      const results = await Promise.allSettled(
        imageUrls.map((url) => this.processMeterReading(url))
      );

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason.message,
            imageUrl: imageUrls[index],
          };
        }
      });
    } catch (error) {
      console.error('Batch OCR processing error:', error);
      throw error;
    }
  }
}

module.exports = new MeterOcrService();