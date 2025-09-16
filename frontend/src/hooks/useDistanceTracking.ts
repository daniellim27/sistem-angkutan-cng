import { useState, useEffect, useCallback } from 'react';
import { distanceTrackingApi, DistanceComplianceData } from '../api/distanceTrackingApi';

interface UseDistanceTrackingOptions {
  deliveryOrderId: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  tolerancePercentage?: number;
  plannedDistance?: number;
}

interface UseDistanceTrackingReturn {
  data: DistanceComplianceData | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
  calculateCompliance: () => Promise<void>;
}

export const useDistanceTracking = ({
  deliveryOrderId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  tolerancePercentage = 31.0,
  plannedDistance
}: UseDistanceTrackingOptions): UseDistanceTrackingReturn => {
  const [data, setData] = useState<DistanceComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchDistanceTracking = useCallback(async () => {
    // Don't fetch if deliveryOrderId is invalid
    if (!deliveryOrderId || deliveryOrderId <= 0) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await distanceTrackingApi.getDistanceTracking(deliveryOrderId);
      setData(result);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch distance tracking data');
      console.error('Error fetching distance tracking:', err);
    } finally {
      setLoading(false);
    }
  }, [deliveryOrderId]);

  const calculateCompliance = useCallback(async () => {
    // Don't calculate if deliveryOrderId is invalid
    if (!deliveryOrderId || deliveryOrderId <= 0) {
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await distanceTrackingApi.calculateDistanceCompliance(deliveryOrderId, tolerancePercentage, plannedDistance);
      // Refresh data after calculation
      await fetchDistanceTracking();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate distance compliance');
      console.error('Error calculating distance compliance:', err);
    } finally {
      setLoading(false);
    }
  }, [deliveryOrderId, tolerancePercentage, plannedDistance, fetchDistanceTracking]);

  // Initial fetch
  useEffect(() => {
    fetchDistanceTracking();
  }, [fetchDistanceTracking]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDistanceTracking();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDistanceTracking]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh: fetchDistanceTracking,
    calculateCompliance
  };
};
