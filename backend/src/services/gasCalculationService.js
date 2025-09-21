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
      // This is a simplified version - in production, you'd use the full FPV calculation
      // For now, we'll use a more complex formula that accounts for higher pressures
      const baseFactor = 1 + (0.0002 * pressure);
      const pressureCorrection = Math.pow(pressure / 4, 0.1); // Simplified correction
      return baseFactor * pressureCorrection;
    }
  }

  /**
   * Calculate gas volume variables
   * @param {number} stanAwal - Initial meter reading
   * @param {number} stanAkhir - Final meter reading
   * @param {number} pressure - Gas pressure in Bar
   * @param {number} temperature - Gas temperature in Celsius
   * @returns {object} Calculated gas values
   */
  calculateVolumeGas(stanAwal, stanAkhir, pressure, temperature) {
    try {
      // Validate inputs
      if (!stanAwal || !stanAkhir || !pressure || !temperature) {
        throw new Error('All gas calculation parameters are required');
      }

      // Convert to numbers
      const stanAwalNum = parseFloat(stanAwal);
      const stanAkhirNum = parseFloat(stanAkhir);
      const pressureNum = parseFloat(pressure);
      const temperatureNum = parseFloat(temperature);

      // Calculate Vt (Volume from Meter)
      const Vt = stanAkhirNum - stanAwalNum;

      // Calculate k (Super Compressibility Factor)
      const k = this.calculateSuperCompressibilityFactor(pressureNum);

      // Calculate V (Final Volume Gas)
      const V = Vt * k;

      return {
        stan_awal: stanAwalNum,
        stan_akhir: stanAkhirNum,
        tekanan_operasi: pressureNum,
        temperatur_operasi: temperatureNum,
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
   * Validate gas calculation inputs
   * @param {object} data - Input data to validate
   * @returns {object} Validation result
   */
  validateGasCalculationInputs(data) {
    const errors = [];
    
    if (!data.stan_awal || isNaN(parseFloat(data.stan_awal))) {
      errors.push('Stan awal must be a valid number');
    }
    
    if (!data.stan_akhir || isNaN(parseFloat(data.stan_akhir))) {
      errors.push('Stan akhir must be a valid number');
    }
    
    if (!data.tekanan_operasi || isNaN(parseFloat(data.tekanan_operasi))) {
      errors.push('Tekanan operasi must be a valid number');
    }
    
    if (!data.temperatur_operasi || isNaN(parseFloat(data.temperatur_operasi))) {
      errors.push('Temperatur operasi must be a valid number');
    }

    // Check if stan akhir > stan awal
    if (data.stan_awal && data.stan_akhir) {
      const stanAwal = parseFloat(data.stan_awal);
      const stanAkhir = parseFloat(data.stan_akhir);
      
      if (stanAkhir <= stanAwal) {
        errors.push('Stan akhir must be greater than stan awal');
      }
    }

    // Check reasonable ranges
    if (data.tekanan_operasi) {
      const pressure = parseFloat(data.tekanan_operasi);
      if (pressure < 0.5 || pressure > 10) {
        errors.push('Tekanan operasi should be between 0.5 and 10 Bar');
      }
    }

    if (data.temperatur_operasi) {
      const temp = parseFloat(data.temperatur_operasi);
      if (temp < -20 || temp > 60) {
        errors.push('Temperatur operasi should be between -20 and 60°C');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

module.exports = new GasCalculationService();
