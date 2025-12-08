/**
 * Billing Calculation Service - NEW SCHEMA
 * Implements the billing formula for gas volume calculation
 * 
 * Formula: V = Vt x ((1.01325 + p) / 1.01325) x (300 / (273 + t)) x k
 * 
 * Where:
 * - V = Volume Gas (m³) - Final calculated volume for billing
 * - Vt = Volume from Meter (m³) - volume_delta (current_stan - stan_awal)
 * - p = Gas Pressure (Bar) - pressure_inlet
 * - t = Gas Temperature (°C) - temperature
 * - k = Super Compressibility Factor
 */

class BillingCalculationService {
  constructor() {
    // Standard atmospheric pressure in bar
    this.STANDARD_PRESSURE = 1.01325;
    
    // Standard temperature in Kelvin (27°C = 300K)
    this.STANDARD_TEMPERATURE = 300;
    
    // Base temperature in Kelvin (0°C = 273K)
    this.BASE_TEMPERATURE = 273;
    
    // Default gas price per m³ (can be overridden)
    this.DEFAULT_GAS_PRICE_PER_M3 = 15000; // IDR 15,000 per m³
  }

  /**
   * Calculate the final billable volume using the billing formula - NEW SCHEMA
   * @param {Object} notaKecil - The nota kecil data
   * @param {number} notaKecil.volume_delta - Volume from meter (current_stan - stan_awal)
   * @param {number} notaKecil.pressure_inlet - Gas pressure in Bar
   * @param {number} notaKecil.temperature - Gas temperature in °C
   * @returns {Object} Calculation result with volume and details
   */
  calculateVolume(notaKecil) {
    try {
      // ✅ NEW SCHEMA: Extract and validate NEW fields
      const Vt = parseFloat(notaKecil.volume_delta || notaKecil.Vt || 0);
      const p = parseFloat(notaKecil.pressure_inlet || 0);
      const t = parseFloat(notaKecil.temperature || 0);

      // Validate inputs
      if (Vt <= 0) {
        throw new Error('Volume from meter (Vt) must be greater than 0');
      }
      if (p < 0) {
        throw new Error('Gas pressure cannot be negative');
      }
      if (t < -273) {
        throw new Error('Gas temperature cannot be below absolute zero');
      }

      // Calculate super compressibility factor (k)
      const k = this.calculateSuperCompressibilityFactor(p);

      // Apply the billing formula
      // V = Vt x ((1.01325 + p) / 1.01325) x (300 / (273 + t)) x k
      const pressureFactor = (this.STANDARD_PRESSURE + p) / this.STANDARD_PRESSURE;
      const temperatureFactor = this.STANDARD_TEMPERATURE / (this.BASE_TEMPERATURE + t);
      
      const V = Vt * pressureFactor * temperatureFactor * k;

      return {
        success: true,
        volume: parseFloat(V.toFixed(3)),
        details: {
          Vt: Vt,
          pressure_inlet: p,
          temperature: t,
          pressureFactor: parseFloat(pressureFactor.toFixed(6)),
          temperatureFactor: parseFloat(temperatureFactor.toFixed(6)),
          superCompressibilityFactor: parseFloat(k.toFixed(6)),
          formula: `V = ${Vt} × ${pressureFactor.toFixed(6)} × ${temperatureFactor.toFixed(6)} × ${k.toFixed(6)} = ${V.toFixed(3)}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        volume: 0,
        details: null
      };
    }
  }

  /**
   * Calculate super compressibility factor (k) based on pressure
   * @param {number} p - Gas pressure in Bar
   * @returns {number} Super compressibility factor
   */
  calculateSuperCompressibilityFactor(p) {
    if (p < 4) {
      // For p < 4 bar: k = 1 + (0.0002 * p)
      return 1 + (0.0002 * p);
    } else {
      // For p >= 4 bar: k = [FPV]² (per A.G.A Report NX-19)
      return this.calculateFPV(p);
    }
  }

  /**
   * Calculate FPV (Fugacity Pressure Volume) factor for high pressure
   * @param {number} p - Gas pressure in Bar
   * @returns {number} FPV factor
   */
  calculateFPV(p) {
    const baseFPV = 1 + (0.0001 * p) + (0.00001 * p * p);
    return baseFPV * baseFPV; // FPV²
  }

  /**
   * Calculate total price for a volume
   * @param {number} volume - Volume in m³
   * @param {number} pricePerM3 - Price per m³ (optional)
   * @returns {number} Total price
   */
  calculatePrice(volume, pricePerM3 = null) {
    const gasPrice = pricePerM3 || this.DEFAULT_GAS_PRICE_PER_M3;
    return parseFloat((volume * gasPrice).toFixed(2));
  }

  /**
   * Process multiple nota kecils and calculate total volume and price - NEW SCHEMA
   * @param {Array} notaKecils - Array of nota kecil objects
   * @param {number} gasPricePerM3 - Gas price per m³ (optional)
   * @returns {Object} Processing result with totals and individual calculations
   */
  processMultipleNotaKecils(notaKecils, gasPricePerM3 = null) {
    const results = {
      success: true,
      totalVolume: 0,
      totalPrice: 0,
      gasPricePerM3: gasPricePerM3 || this.DEFAULT_GAS_PRICE_PER_M3,
      items: [],
      errors: []
    };

    for (let i = 0; i < notaKecils.length; i++) {
      const notaKecil = notaKecils[i];
      const calculation = this.calculateVolume(notaKecil);

      if (calculation.success) {
        const price = this.calculatePrice(calculation.volume, gasPricePerM3);
        
        results.totalVolume += calculation.volume;
        results.totalPrice += price;
        
        results.items.push({
          notaKecilId: notaKecil.id,
          customerName: notaKecil.customer_name,
          customerLocationIndex: notaKecil.customer_location_index,
          volume: calculation.volume,
          price: price,
          details: calculation.details
        });
      } else {
        results.errors.push({
          notaKecilId: notaKecil.id,
          customerName: notaKecil.customer_name,
          error: calculation.error
        });
      }
    }

    // Round totals
    results.totalVolume = parseFloat(results.totalVolume.toFixed(3));
    results.totalPrice = parseFloat(results.totalPrice.toFixed(2));

    return results;
  }

  /**
   * Validate nota kecil data for billing calculation - NEW SCHEMA
   * @param {Object} notaKecil - The nota kecil data to validate
   * @returns {Object} Validation result
   */
  validateNotaKecil(notaKecil) {
    const errors = [];

    // ✅ NEW SCHEMA: Validate NEW fields
    const Vt = parseFloat(notaKecil.volume_delta || notaKecil.Vt || 0);
    if (!Vt || Vt <= 0) {
      errors.push('Volume from meter (volume_delta or Vt) is required and must be greater than 0');
    }

    const pressure = parseFloat(notaKecil.pressure_inlet || 0);
    if (!pressure || pressure < 0) {
      errors.push('Gas pressure (pressure_inlet) is required and cannot be negative');
    }

    const temperature = parseFloat(notaKecil.temperature || 0);
    if (!temperature || temperature < -273) {
      errors.push('Gas temperature (temperature) is required and cannot be below absolute zero');
    }

    if (!notaKecil.customer_name) {
      errors.push('Customer name is required');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Process complete billing from raw OCR data - NEW SCHEMA
   * @param {Object} ocrData - Raw OCR extracted data
   * @returns {Object} Billing calculation result
   */
  processCompleteBilling(ocrData) {
    try {
      // ✅ NEW SCHEMA: Map OCR data to nota kecil format
      const notaKecilData = {
        volume_delta: ocrData.current_stan ? 
          parseFloat(ocrData.current_stan) - parseFloat(ocrData.stan_awal || 0) : 
          parseFloat(ocrData.Vt || 0),
        pressure_inlet: parseFloat(ocrData.pressure_inlet || 0),
        temperature: parseFloat(ocrData.temperature || 0),
        Vt: parseFloat(ocrData.Vt || 0)
      };

      const calculation = this.calculateVolume(notaKecilData);
      
      if (calculation.success) {
        return {
          success: true,
          ...calculation,
          ocr_source: true
        };
      } else {
        return {
          success: false,
          error: calculation.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get default gas price per m³
   * @returns {number} Default gas price
   */
  getDefaultGasPrice() {
    return this.DEFAULT_GAS_PRICE_PER_M3;
  }

  /**
   * Set gas price per m³
   * @param {number} price - New gas price per m³
   */
  setGasPrice(price) {
    if (price <= 0) {
      throw new Error('Gas price must be greater than 0');
    }
    this.DEFAULT_GAS_PRICE_PER_M3 = price;
  }
}

module.exports = new BillingCalculationService();