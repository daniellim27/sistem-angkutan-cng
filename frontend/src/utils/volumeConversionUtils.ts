/**
 * Utility functions for converting between money and volume for CNG gas calculations
 */

export interface VolumeConversionResult {
  jisdorVolume: number;
  fixedRateVolume: number;
  jisdorRate: number;
  fixedRate: number;
}

/**
 * Convert money amount to volume using both JISDOR and Fixed Rate methods
 * @param amount - The money amount in IDR
 * @param jisdorRate - Current JISDOR rate (optional, will use default if not provided)
 * @returns VolumeConversionResult with both conversion methods
 */
export const convertMoneyToVolume = (
  amount: number, 
  jisdorRate?: number | null
): VolumeConversionResult => {
  const FIXED_RATE_PER_M3 = 7800;
  const CONVERSION_FACTOR = 27.27;
  const MULTIPLIER = 12.7;
  
  // Default JISDOR rate if not provided (matches the default used in DepositGroupManagement)
  const defaultJisdorRate = 16364.42;
  const currentJisdorRate = jisdorRate || defaultJisdorRate;
  
  // Fixed Rate calculation: amount / 7800
  const fixedRateVolume = amount / FIXED_RATE_PER_M3;
  
  // JISDOR calculation: amount / ((12.7 * jisdor_rate) / 27.27)
  const jisdorVolume = amount / ((MULTIPLIER * currentJisdorRate) / CONVERSION_FACTOR);
  
  return {
    jisdorVolume: Math.round(jisdorVolume * 100) / 100, // Round to 2 decimal places
    fixedRateVolume: Math.round(fixedRateVolume * 100) / 100, // Round to 2 decimal places
    jisdorRate: currentJisdorRate,
    fixedRate: FIXED_RATE_PER_M3
  };
};

/**
 * Format volume for display with proper units
 * @param volume - Volume in m³
 * @returns Formatted string with units
 */
export const formatVolume = (volume: number): string => {
  return `${volume.toFixed(2)} m³`;
};

/**
 * Get the current JISDOR rate from the API
 * This function fetches the current rate from your backend
 * @returns Promise<number> - Current JISDOR rate
 */
export const fetchCurrentJisdorRate = async (): Promise<number> => {
  try {
    const response = await fetch('/api/exchange-rates/current');
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data.data.rate || 16364.42;
      }
    }
    return 16364.42; // Default fallback (same as used in DepositGroupManagement)
  } catch (error) {
    console.error('Failed to fetch JISDOR rate:', error);
    return 16364.42; // Default fallback
  }
};
