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
const path = require('path');
const fs = require('fs');

class MeterOcrService {
  constructor() {
    // Use OpenAI Vision API for OCR
    const rawKey = process.env.OPENAI_API_KEY || '';
    const apiKey = rawKey.trim();

    this.currentApiKey = apiKey;
    // Allow overriding model via env; default to GPT‑5 mini family
    this.modelName = 'gpt-5-mini';
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

    // Allow model to change via env at runtime
    const newModel = 'gpt-5-mini';
    if (newModel !== this.modelName) {
      this.modelName = newModel;
      console.log('🔄 Meter OCR model updated in runtime:', this.modelName);
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

      // Validate with meterType-aware rules
      parsedData = this.validateMeterData(parsedData, meterType);

      // Determine primary value for this meter type
      let primaryValue = null;
      switch (meterType) {
        case 'temperature':
          primaryValue = parsedData.temperature;
          break;
        case 'pressure_inlet':
        case 'pressure_outlet':
          primaryValue = parsedData[meterType] ?? parsedData.pressure;
          break;
        case 'stan':
          primaryValue = parsedData.stan ?? parsedData.meter_reading;
          break;
        default:
          primaryValue = parsedData.meter_reading ?? parsedData.temperature ?? parsedData.pressure;
          break;
      }

      const isPrimaryValid = primaryValue !== null && primaryValue !== undefined;

      // Confidence: use richer calculation, drop if primary value invalid
      const confidenceScore = isPrimaryValid
        ? this.calculateConfidence(parsedData, ocrResponse)
        : 0;

      // If we couldn't parse a usable number, surface a clear error message so UI can show why
      const errorMessage = isPrimaryValid
        ? null
        : `No valid numeric reading could be parsed from OCR text: "${ocrResponse?.text ?? ''}"`;

      return {
        success: isPrimaryValid,
        data: isPrimaryValid
          ? {
              ...parsedData,
              primary_value: primaryValue,
            }
          : null,
        raw_response: ocrResponse,
        confidence_score: confidenceScore,
        error: errorMessage,
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

  async convertUrlToBase64(imageUrl) {
    try {
        // 1. Define where you want to save the temp file
        const tempFilePath = path.join(__dirname, 'temp_image.jpg'); 

        console.log("Downloading image...");

        // 2. Download the image data
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer' // Important: ensures we get raw data
        });

        // 3. Write to a temporary file
        fs.writeFileSync(tempFilePath, response.data);
        console.log("Temp file saved.");

        // 4. Read the file back and convert to Base64
        const fileData = fs.readFileSync(tempFilePath);
        const base64Image = fileData.toString('base64');
        
        // 5. Add the data prefix (Optional, depending on your API needs)
        // You usually need this if you are displaying it or sending to certain APIs
        const fullBase64 = `data:image/jpeg;base64,${base64Image}`;

        // 6. Delete the temp file to keep folder clean
        fs.unlinkSync(tempFilePath);
        console.log("Temp file deleted.");

        return fullBase64;

    } catch (error) {
        console.error("Error converting image:", error);
        return null;
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
      temperature: `You are reading a THERMOMETER that shows temperature in CELSIUS (°C).

      Focus on where the needle is pointing on the Celsius scale and estimate the temperature as a decimal number.

      Rules:
      - Read the scale naturally as a technician would.
      - If the value is between two ticks, interpolate and give a decimal (e.g. 28.5).
      - Do NOT apply any artificial range limits; use what you see on the gauge.
      - If the value you get is more than 60, then substract it by 80
      - If the value you get is less than 60, then add it by 80

      EXAMPLE:
      Detected value: 120, substract by 80 so the real value you return is = 40.

      Reply ONLY with the numeric value in Celsius, for example "28.6". Do NOT include units or explanation.`,

        pressure_inlet: `You are reading PRESSURE INLET GAUGE (BAR).

      FOCUS ONLY on INLET PRESSURE gauge (usually LEFT or labeled "INLET").

      RULES:
      1. Each SMALL TICK = 0.1 bar
      2. Read the scale naturally as a technician would.
      3. If the value is between two ticks, interpolate and give a decimal (e.g. 28.5).
      4. Do NOT apply any artificial range limits; use what you see on the gauge.
      5. FOCUS on the pointy/sharpest/smaller part of the needle as its the point.

      EXAMPLE: Needle at 3 and half bar → "4.5"

      Remember, the range is only between 0-4, so even a single mistake really matter. Be aware of the decimals.
      If not confident (<40% confidence), its more likely to have values between 1-3, so just keep that in mind.

      MUST:
      Find the closest left and closest right numbers that the needle landed between. Then the value must be in that range.

      REPLY ONLY WITH NUMBER (e.g., "2.6")`,

        pressure_outlet: `You are reading PRESSURE OUTLET GAUGE (BAR).

      FOCUS ONLY on OUTLET PRESSURE gauge (The scale where the longest needle point lands).

      The range is only from 0 - 250.
      Each big ticks are 50 in difference, e.g (0, 50, 100, 150, 200, 250)

      RULES:
      1. Each SMALL TICK = 10 bar
      2. Read the scale naturally as a technician would.
      3. If the value is between two ticks, interpolate and give a decimal (e.g. 28.5).
      4. Do NOT apply any artificial range limits; use what you see on the gauge.
      5. FOCUS on the pointy/sharpest/smaller part of the needle as its the point, not the bigger bottom part of the needle.

      MUST:
      Find the closest left and closest right numbers that the needle landed between. Then the value must be in that range.

      EXAMPLE: Needle at 210 bar → "210"

      REPLY ONLY WITH NUMBER (e.g., "210")`,

        stan: `You are reading CONTINUOUS GAS METER (STAN).

      FOCUS on DIGITAL DISPLAY showing TOTAL VOLUME in m³.

      1. Look for largest number with m³ unit
      2. Usually 4-6 digits with decimals (e.g., 12345.678)
      3. This is CONTINUOUS reading (increases over time)

      EXAMPLE: 020675.12 m³ → "20675.12"

      It's more likely to have 7-8 digit results including the decimals than only 6 digits.
      So make sure you read the 0s between the numbers too.

      REPLY ONLY WITH NUMBER (e.g., "12345.678")`
      };

      const prompt = prompts[meterType] || prompts.other;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
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
                  "url": imageUrl,
                  'detail': 'high'
                }
              }
            ]
          }
        ],
        reasoning_effort: 'low'
      });

      // console.log("INI RAW IMAGE URL AHAHAHAHAHA: ", imageUrl);
      console.log("INI RAW RESPONSENYAAAAAAAAAAAAAAAAAAAAAA", response.choices[0].message.content);
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
   * Validate extracted meter data with meterType-aware limits
   * @param {Object} data - Extracted data
   * @param {string} meterType - meter type (temperature, pressure_inlet, pressure_outlet, stan, etc.)
   * @returns {Object} Validated data
   */
  validateMeterData(data, meterType = 'other') {
    // Global sanity checks (very wide)
    if (data.meter_reading !== null && (data.meter_reading < 0 || data.meter_reading > 999999)) {
      console.warn(`⚠️ Suspicious meter reading: ${data.meter_reading}`);
    }
    if (data.pressure !== null && (data.pressure < 0 || data.pressure > 1000)) {
      console.warn(`⚠️ Suspicious pressure reading: ${data.pressure}`);
    }
    if (data.temperature !== null && (data.temperature < -100 || data.temperature > 200)) {
      console.warn(`⚠️ Suspicious temperature reading: ${data.temperature}`);
    }

    // Meter-type specific physical limits
    switch (meterType) {
      case 'temperature': {
        // Previously we hard-rejected temperatures outside [-20, 60] by setting them to null.
        // This proved too strict in production and caused many valid readings to be discarded.
        // Now we only log suspicious values above, but we do NOT force them to null here.
        break;
      }
      case 'pressure_inlet':
      case 'pressure_outlet': {
        // Typical CNG pressure range (very conservative): 0–300 bar
        const pressureValue = data[meterType] ?? data.pressure;
        if (pressureValue !== null && pressureValue !== undefined) {
          if (pressureValue < 0 || pressureValue > 300) {
            console.warn(`⚠️ Discarding invalid pressure reading for ${meterType}: ${pressureValue}`);
            data[meterType] = null;
            if (data.pressure === pressureValue) data.pressure = null;
          }
        }
        break;
      }
      case 'stan': {
        const stanValue = data.stan ?? data.meter_reading;
        if (stanValue !== null && stanValue !== undefined) {
          if (stanValue < 0 || stanValue > 10_000_000) {
            console.warn(`⚠️ Discarding invalid STAN reading: ${stanValue}`);
            data.stan = null;
            if (data.meter_reading === stanValue) data.meter_reading = null;
          }
        }
        break;
      }
      default:
        // For other types we keep only global sanity checks
        break;
    }

    // Validate flow rate (typical range: 0-200 m³/h)
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