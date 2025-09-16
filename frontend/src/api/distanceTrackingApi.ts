import apiClient from './axiosConfig';

export interface DistanceComplianceData {
  deliveryOrderId: number | string;
  plannedDistance: number | string;
  currentActualDistance: number | string;
  tolerancePercentage: number | string;
  complianceStatus: {
    withinTolerance: boolean | null;
    percentageDifference: number | null;
    status: 'within_tolerance' | 'exceeds_tolerance' | 'not_calculated';
    message: string;
  };
  gpsPointsCount: number;
  lastUpdate: string | null;
}

export interface DistanceComplianceStatus {
  deliveryOrderId: number;
  plannedDistance: number | null;
  actualDistance: number | null;
  tolerancePercentage: number | null;
  status: string | null;
}

export interface DistanceComplianceSummary {
  total: number;
  withinTolerance: number;
  exceedsTolerance: number;
  notCalculated: number;
  deliveryOrders: Array<{
    id: number;
    doNumber: string;
    customerName: string;
    status: string;
    plannedDistance: number | null;
    actualDistance: number | null;
    tolerancePercentage: number | null;
    complianceStatus: string | null;
  }>;
}

export interface DistanceComplianceAlert {
  id: number;
  doNumber: string;
  customerName: string;
  driverName: string;
  vehiclePlate: string;
  plannedDistance: number | null;
  actualDistance: number | null;
  percentageDifference: number;
}

export const distanceTrackingApi = {
  /**
   * Get real-time distance tracking for a delivery order
   */
  getDistanceTracking: async (deliveryOrderId: number): Promise<DistanceComplianceData> => {
    const response = await apiClient.get(`/tracking/delivery/${deliveryOrderId}/distance-tracking`);
    return response.data.data;
  },

  /**
   * Get distance compliance status for a delivery order
   */
  getDistanceComplianceStatus: async (deliveryOrderId: number): Promise<DistanceComplianceStatus> => {
    const response = await apiClient.get(`/tracking/delivery/${deliveryOrderId}/distance-compliance`);
    return response.data.data;
  },

  /**
   * Calculate distance compliance for a delivery order
   */
  calculateDistanceCompliance: async (
    deliveryOrderId: number, 
    tolerancePercentage: number = 31.0,
    plannedDistance?: number
  ): Promise<any> => {
    const response = await apiClient.post(
      `/tracking/delivery/${deliveryOrderId}/calculate-distance-compliance`,
      { tolerancePercentage, plannedDistance }
    );
    return response.data.data;
  },

  /**
   * Get distance compliance summary for all active delivery orders
   */
  getDistanceComplianceSummary: async (): Promise<DistanceComplianceSummary> => {
    const response = await apiClient.get('/tracking/distance-compliance/summary');
    return response.data.data;
  },

  /**
   * Get distance compliance alerts for drivers exceeding tolerance
   */
  getDistanceComplianceAlerts: async (): Promise<{
    alertCount: number;
    deliveryOrders: DistanceComplianceAlert[];
  }> => {
    const response = await apiClient.get('/tracking/distance-compliance/alerts');
    return response.data.data;
  },

  /**
   * Batch process distance compliance for multiple delivery orders
   */
  batchProcessDistanceCompliance: async (
    deliveryOrderIds: number[], 
    tolerancePercentage: number = 31.0
  ): Promise<any> => {
    const response = await apiClient.post('/tracking/distance-compliance/batch-process', {
      deliveryOrderIds,
      tolerancePercentage
    });
    return response.data.data;
  }
};
