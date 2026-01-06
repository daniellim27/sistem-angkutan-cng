// backend/src/services/receiptOcrService.js

/**
 * Receipt OCR Service for Gas Station Receipts
 * 
 * Extracts data from gas station receipts in Indonesian format:
 * - Jml Liter (volume in liters) → volume_m3 (convert to m³)
 * - Harga/Liter (price per liter) → rate_per_m3 (convert to per m³)
 * - Jml Rupiah (total amount) → total_cost
 */

const { OpenAI } = require('openai');

class ReceiptOcrService {
    constructor() {
        // Use OpenAI Vision API for OCR - same as MeterOcrService
        const rawKey = process.env.OPENAI_API_KEY || '';
        const apiKey = rawKey.trim();

        this.currentApiKey = apiKey;
        this.modelName = 'gpt-5-mini'; // Using same model as MeterOcrService
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
            console.log('🔄 Receipt OCR model updated in runtime:', this.modelName);
        }
    }

    /**
     * Process gas station receipt and extract data
     * @param {Buffer|string} imageBuffer - Image buffer or base64 string
     * @returns {Promise<Object>} Extracted receipt data
     */
    async processReceipt(imageBuffer) {
        try {
            this.refreshFromEnvIfChanged();
            
            if (!this.isConfigured) {
                throw new Error('OpenAI API key not configured');
            }

            console.log(`🔍 Processing gas receipt OCR from image buffer...`);

            // Convert buffer to base64 if needed
            let base64Image;
            if (Buffer.isBuffer(imageBuffer)) {
                base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
            } else if (typeof imageBuffer === 'string' && imageBuffer.startsWith('data:')) {
                base64Image = imageBuffer;
            } else {
                throw new Error('Invalid image format. Expected Buffer or base64 string');
            }

            const prompt = `You are reading a GAS STATION RECEIPT in Indonesian.

            EXTRACT ONLY THESE THREE VALUES:
            1. "Jml Liter" - the total volume in LITERS (e.g., 884.860)
            2. "Harga/Liter" - the price per liter in RUPIAH (e.g., 100)
            3. "Jml Rupiah" - the total amount in RUPIAH (e.g., 88.486)

            RECEIPT FORMAT EXAMPLE:
            Harga/Liter: Rp.    100
            Jml Liter    : 884.860
            Jml Rupiah : Rp.    88.486

            IMPORTANT RULES:
            - Extract ONLY the numbers, ignore "Rp.", spaces, and labels
            - Numbers may use dots as decimal separators (e.g., 884.860 means 884.860 liters)
            - Return each value as a plain number (e.g., 884.860, 100, 88486)
            - Do NOT include units, only the numeric value
            - If you cannot find a value, return "null"

            Reply ONLY with three numbers separated by commas in this exact order:
            volume_liters, rate_per_liter, total_cost

            Example: 884.860,100,88486

            Now read the receipt and provide the three numbers:`;

            const response = await this.openai.chat.completions.create({
                model: this.modelName,
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
                                    url: base64Image
                                }
                            }
                        ]
                    }
                ],
                reasoning_effort: 'low'
            });

            const content = response.choices[0].message.content.trim();
            console.log(`✅ Receipt OCR → "${content}"`);

            // Parse the comma-separated values
            const parts = content.split(',').map(part => part.trim());
            
            if (parts.length !== 3) {
                throw new Error(`Expected 3 values but got ${parts.length}: ${content}`);
            }

            // Parse each value
            const volume_liters = this.parseNumber(parts[0]);
            const rate_per_liter = this.parseNumber(parts[1]);
            const total_cost = this.parseNumber(parts[2]);

            // Check if we got valid numbers
            const isValid = volume_liters !== null && rate_per_liter !== null && total_cost !== null;

            if (!isValid) {
                throw new Error(`Failed to parse all numbers: ${content}`);
            }

            // Convert to system units (m³)
            const volume_m3 = volume_liters / 1000; // Convert liters to m³
            const rate_per_m3 = rate_per_liter * 1000; // Convert per liter to per m³

            console.log(`📊 Extracted values:`);
            console.log(`   Volume: ${volume_liters} L → ${volume_m3} m³`);
            console.log(`   Rate: Rp ${rate_per_liter}/L → Rp ${rate_per_m3}/m³`);
            console.log(`   Total: Rp ${total_cost}`);

            return {
                success: true,
                data: {
                    volume_m3: volume_m3,
                    calculation_method: 'fixed_rate',
                    rate_per_m3: rate_per_m3,
                    total_cost: total_cost,
                    currency: 'IDR',
                    ocr_confidence: 0.95,
                    raw_extracted: {
                        volume_liters: volume_liters,
                        rate_per_liter: rate_per_liter,
                        total_cost: total_cost
                    }
                },
                raw_response: content
            };

        } catch (error) {
            console.error(`❌ Receipt OCR error:`, error.message);
            
            return {
                success: false,
                error: error.message,
                data: null,
                raw_response: null
            };
        }
    }

    /**
     * Parse number from string, handling Indonesian format
     */
    parseNumber(str) {
        if (str === 'null' || str === null || str === undefined) {
            return null;
        }
        
        try {
            // Remove any non-numeric characters except dots and commas
            let cleaned = str.toString().trim();
            
            // Remove currency symbols, letters, and extra spaces
            cleaned = cleaned.replace(/[^\d.,]/g, '');
            
            // Handle Indonesian number format
            // If there's a comma and it's not the last character, assume comma as decimal
            if (cleaned.includes(',') && cleaned.indexOf(',') < cleaned.length - 1) {
                // Remove dots (thousand separators) and replace comma with dot
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else if (cleaned.includes('.') && cleaned.lastIndexOf('.') === cleaned.length - 4) {
                // Format like 884.860 (dot as decimal with 3 decimal places)
                // Keep as is
            } else {
                // Remove all dots (thousand separators)
                cleaned = cleaned.replace(/\./g, '');
            }
            
            const result = parseFloat(cleaned);
            return isNaN(result) ? null : result;
            
        } catch (error) {
            console.error('Number parsing error:', error, 'for:', str);
            return null;
        }
    }

    /**
     * Simple test function
     */
    async testWithLocalFile(filePath, fsModule) {
        try {
            const fs = fsModule || require('fs');
            const imageBuffer = fs.readFileSync(filePath);
            const result = await this.processReceipt(imageBuffer);
            console.log('Test result:', result);
            return result;
        } catch (error) {
            console.error('Test failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ReceiptOcrService();