/**
 * Billing Calculation Service
 * Implements gas volume calculation using the client's specified formula
 */

class BillingCalculationService {
  constructor() {
    // Constants for the calculation
    this.STANDARD_PRESSURE = 1.01325; // Standard atmospheric pressure in bar
    this.STANDARD_TEMPERATURE = 300; // Standard temperature in Kelvin (27°C)
    this.ZERO_CELSIUS_KELVIN = 273; // Conversion from Celsius to Kelvin
  }

  /**
   * Calculate final billable gas volume using the client's formula
   * V = Vt × ((1.01325 + p) / 1.01325) × (300 / (273 + t)) × k
   * 
   * @param {Object} ocrData - Extracted OCR data
   * @returns {Object} Calculation result
   */
  calculateGasVolume(ocrData) {
    try {
      // Validate required data
      const validation = this.validateOCRData(ocrData);
      if (!validation.isValid) {
        throw new Error(`Invalid OCR data: ${validation.errors.join(', ')}`);
      }

      // Extract values
      const vt = ocrData.stan_akhir - ocrData.stan_awal; // Meter reading difference
      const p = ocrData.tekanan_operasi; // Gas pressure in Bar
      const t = ocrData.temperatur_operasi; // Gas temperature in Celsius

      // Calculate super compressibility factor (k)
      const k = this.calculateSuperCompressibilityFactor(p);

      // Apply the formula
      const pressureFactor = (this.STANDARD_PRESSURE + p) / this.STANDARD_PRESSURE;
      const temperatureFactor = this.STANDARD_TEMPERATURE / (this.ZERO_CELSIUS_KELVIN + t);
      
      const finalVolume = vt * pressureFactor * temperatureFactor * k;

      return {
        success: true,
        calculation_data: {
          vt: vt, // Volume from meter (m³)
          p: p, // Gas pressure (Bar)
          t: t, // Gas temperature (°C)
          k: k, // Super compressibility factor
          pressure_factor: pressureFactor,
          temperature_factor: temperatureFactor,
          final_volume: finalVolume
        },
        result: {
          calculated_volume_m3: parseFloat(finalVolume.toFixed(3)),
          meter_difference: vt,
          pressure_bar: p,
          temperature_celsius: t,
          compressibility_factor: k,
          calculation_method: 'ocr_formula',
          calculated_at: new Date()
        },
        formula_used: 'V = Vt × ((1.01325 + p) / 1.01325) × (300 / (273 + t)) × k'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        calculation_data: null,
        result: null
      };
    }
  }

  /**
   * Calculate super compressibility factor (k)
   * Based on pressure:
   * - If p < 4 bar: k = 1 + (0.0002 * p)
   * - If p >= 4 bar: k = [FPV]² (per A.G.A Report NX-19)
   * 
   * @param {Number} pressure - Gas pressure in Bar
   * @returns {Number} Super compressibility factor
   */
  calculateSuperCompressibilityFactor(pressure) {
    if (pressure < 4) {
      // For pressure < 4 bar: k = 1 + (0.0002 * p)
      return 1 + (0.0002 * pressure);
    } else {
      // For pressure >= 4 bar: k = [FPV]²
      // FPV (Fugacity Pressure Volume) calculation
      // This is a simplified version - in practice, you might need more complex A.G.A calculations
      const fpv = this.calculateFPV(pressure);
      return Math.pow(fpv, 2);
    }
  }

  /**
   * Calculate FPV (Fugacity Pressure Volume) for A.G.A Report NX-19
   * This is a simplified implementation
   * 
   * @param {Number} pressure - Gas pressure in Bar
   * @returns {Number} FPV value
   */
  calculateFPV(pressure) {
    // Simplified FPV calculation
    // In a real implementation, this would use the full A.G.A Report NX-19 methodology
    // For now, using a reasonable approximation
    return 1 + (pressure * 0.001);
  }

  /**
   * Validate OCR data for calculation
   * @param {Object} ocrData - OCR extracted data
   * @returns {Object} Validation result
   */
  validateOCRData(ocrData) {
    const errors = [];
    
    // Check required fields
    if (!ocrData.stan_awal || ocrData.stan_awal <= 0) {
      errors.push('stan_awal must be a positive number');
    }
    
    if (!ocrData.stan_akhir || ocrData.stan_akhir <= 0) {
      errors.push('stan_akhir must be a positive number');
    }
    
    if (!ocrData.tekanan_operasi || ocrData.tekanan_operasi <= 0) {
      errors.push('tekanan_operasi must be a positive number');
    }
    
    if (!ocrData.temperatur_operasi || ocrData.temperatur_operasi <= 0) {
      errors.push('temperatur_operasi must be a positive number');
    }
    
    // Check logical constraints
    if (ocrData.stan_akhir && ocrData.stan_awal && ocrData.stan_akhir <= ocrData.stan_awal) {
      errors.push('stan_akhir must be greater than stan_awal');
    }
    
    // Check reasonable ranges
    if (ocrData.tekanan_operasi && (ocrData.tekanan_operasi < 0.1 || ocrData.tekanan_operasi > 100)) {
      errors.push('tekanan_operasi should be between 0.1 and 100 bar');
    }
    
    if (ocrData.temperatur_operasi && (ocrData.temperatur_operasi < -50 || ocrData.temperatur_operasi > 100)) {
      errors.push('temperatur_operasi should be between -50°C and 100°C');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Calculate billing amount based on volume and unit price
   * @param {Number} volume - Calculated volume in m³
   * @param {Number} unitPrice - Price per m³
   * @returns {Object} Billing calculation
   */
  calculateBillingAmount(volume, unitPrice) {
    if (!volume || volume <= 0) {
      return {
        success: false,
        error: 'Invalid volume for billing calculation'
      };
    }

    if (!unitPrice || unitPrice <= 0) {
      return {
        success: false,
        error: 'Invalid unit price for billing calculation'
      };
    }

    const totalAmount = volume * unitPrice;

    return {
      success: true,
      result: {
        volume_m3: volume,
        unit_price: unitPrice,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        calculated_at: new Date()
      }
    };
  }

  /**
   * Process complete billing calculation from OCR data
   * @param {Object} ocrData - OCR extracted data
   * @param {Number} unitPrice - Price per m³ (optional, from OCR if not provided)
   * @returns {Object} Complete billing calculation
   */
  processCompleteBilling(ocrData, unitPrice = null) {
    try {
      // Calculate gas volume
      const volumeCalculation = this.calculateGasVolume(ocrData);
      
      if (!volumeCalculation.success) {
        return volumeCalculation;
      }

      // Use provided unit price or extract from OCR data
      const finalUnitPrice = unitPrice || ocrData.harga_satuan;
      
      if (!finalUnitPrice) {
        return {
          success: false,
          error: 'Unit price is required for billing calculation'
        };
      }

      // Calculate billing amount
      const billingCalculation = this.calculateBillingAmount(
        volumeCalculation.result.calculated_volume_m3,
        finalUnitPrice
      );

      if (!billingCalculation.success) {
        return billingCalculation;
      }

      return {
        success: true,
        volume_calculation: volumeCalculation,
        billing_calculation: billingCalculation,
        summary: {
          final_volume_m3: volumeCalculation.result.calculated_volume_m3,
          unit_price: finalUnitPrice,
          total_amount: billingCalculation.result.total_amount,
          calculation_method: 'ocr_automated',
          processed_at: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get calculation history for a delivery order
   * @param {Number} deliveryOrderId - Delivery order ID
   * @returns {Array} Calculation history
   */
  async getCalculationHistory(deliveryOrderId) {
    // This would typically query the database for calculation history
    // Implementation depends on your database structure
    return [];
  }
}

module.exports = new BillingCalculationService();

