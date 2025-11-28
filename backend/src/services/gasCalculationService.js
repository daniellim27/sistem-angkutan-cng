class GasCalculationService {
  /**
   * Calculate Super Compressibility Factor (k)
   * @param {number} pressure - Gas pressure in Bar
   * @returns {number} Super compressibility factor
   */
  calculateSuperCompressibilityFactor(pressure) {
    if (pressure < 4) {
      // For p < 4 bar: k = 1 + (0.0002 * p)
      return 1 + (0.0002 * pressure);
    } else {
      // For p >= 4 bar: use A.G.A Report NX-19 formula
      const baseFactor = 1 + (0.0002 * pressure);
      const pressureCorrection = Math.pow(pressure / 4, 0.1);
      return baseFactor * pressureCorrection;
    }
  }

  /**
   * Calculate gas volume variables - NEW SCHEMA
   * @param {number} stanAwal - Initial meter reading
   * @param {number} currentStan - Current/final meter reading
   * @param {number} pressureInlet - Gas pressure in Bar (pressure_inlet)
   * @param {number} temperature - Gas temperature in Celsius
   * @returns {object} Calculated gas values
   */
  calculateVolumeGas(stanAwal, currentStan, pressureInlet, temperature) {
    try {
      // Validate inputs
      if (!stanAwal || !currentStan || !pressureInlet || !temperature) {
        throw new Error('All gas calculation parameters are required');
      }

      // Convert to numbers
      const stanAwalNum = parseFloat(stanAwal);
      const currentStanNum = parseFloat(currentStan);
      const pressureInletNum = parseFloat(pressureInlet);
      const temperatureNum = parseFloat(temperature);

      // Calculate Vt (Volume from Meter)
      const Vt = currentStanNum - stanAwalNum;

      // Calculate k (Super Compressibility Factor)
      const k = this.calculateSuperCompressibilityFactor(pressureInletNum);

      // Calculate V (Final Volume Gas)
      const V = Vt * k;

      return {
        // ✅ NEW SCHEMA: Input values
        stan_awal: stanAwalNum,
        current_stan: currentStanNum,
        stan_akhir: currentStanNum, // stan_akhir = current_stan
        pressure_inlet: pressureInletNum,
        pressure_outlet: null, // Can be added if needed
        temperature: temperatureNum,
        
        // ✅ CALCULATED VALUES
        volume_delta: parseFloat(Vt.toFixed(3)),
        Vt: parseFloat(Vt.toFixed(3)),
        k: parseFloat(k.toFixed(6)),
        V: parseFloat(V.toFixed(3))
      };
    } catch (error) {
      console.error('Gas calculation error:', error);
      throw new Error(`Gas calculation failed: ${error.message}`);
    }
  }

  /**
   * Validate gas calculation inputs - NEW SCHEMA
   * @param {object} data - Input data to validate
   * @returns {object} Validation result
   */
  validateGasCalculationInputs(data) {
    const errors = [];
    
    // ✅ NEW SCHEMA: Validate NEW fields
    if (!data.stan_awal || isNaN(parseFloat(data.stan_awal))) {
      errors.push('Stan awal must be a valid number');
    }
    
    if (!data.current_stan && !data.stan_akhir || 
        (!data.current_stan && !isNaN(parseFloat(data.stan_akhir))) ||
        isNaN(parseFloat(data.current_stan || data.stan_akhir))) {
      errors.push('Current stan or stan akhir must be a valid number');
    }
    
    if (!data.pressure_inlet || isNaN(parseFloat(data.pressure_inlet))) {
      errors.push('Pressure inlet must be a valid number');
    }
    
    if (!data.temperature || isNaN(parseFloat(data.temperature))) {
      errors.push('Temperature must be a valid number');
    }

    // Check if current_stan > stan_awal
    const currentStan = parseFloat(data.current_stan || data.stan_akhir || 0);
    const stanAwal = parseFloat(data.stan_awal || 0);
    
    if (stanAwal && currentStan && currentStan <= stanAwal) {
      errors.push('Current stan/stan akhir must be greater than stan awal');
    }

    // Check reasonable ranges
    const pressure = parseFloat(data.pressure_inlet || 0);
    if (pressure < 0.5 || pressure > 10) {
      errors.push('Pressure inlet should be between 0.5 and 10 Bar');
    }

    const temp = parseFloat(data.temperature || 0);
    if (temp < -20 || temp > 60) {
      errors.push('Temperature should be between -20 and 60°C');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

module.exports = new GasCalculationService();