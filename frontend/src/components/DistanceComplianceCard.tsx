import React from 'react';

interface DistanceComplianceData {
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

interface DistanceComplianceCardProps {
  data: DistanceComplianceData;
  className?: string;
}

const DistanceComplianceCard: React.FC<DistanceComplianceCardProps> = ({ 
  data, 
  className = "" 
}) => {
  // Debug logging removed - issue was string vs number type mismatch
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'within_tolerance':
        return 'text-green-600 bg-green-100';
      case 'exceeds_tolerance':
        return 'text-red-600 bg-red-100';
      case 'not_calculated':
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'within_tolerance':
        return '✅';
      case 'exceeds_tolerance':
        return '⚠️';
      case 'not_calculated':
      default:
        return '📊';
    }
  };

  const formatDistance = (distance: number | string | null) => {
    if (distance === null || distance === undefined) return 'N/A';
    
    // Convert string to number if needed
    const numDistance = typeof distance === 'string' ? parseFloat(distance) : distance;
    
    if (typeof numDistance !== 'number' || isNaN(numDistance)) return 'N/A';
    return `${numDistance.toFixed(2)} km`;
  };

  const formatPercentage = (percentage: number | null) => {
    if (percentage === null || percentage === undefined) return 'N/A';
    if (typeof percentage !== 'number' || isNaN(percentage)) return 'N/A';
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  const formatDistanceDifference = (actualDistance: number | string | null, plannedDistance: number | string | null) => {
    if (actualDistance === null || actualDistance === undefined || 
        plannedDistance === null || plannedDistance === undefined) return 'N/A';
    
    // Convert strings to numbers if needed
    const numActualDistance = typeof actualDistance === 'string' ? parseFloat(actualDistance) : actualDistance;
    const numPlannedDistance = typeof plannedDistance === 'string' ? parseFloat(plannedDistance) : plannedDistance;
    
    if (typeof numActualDistance !== 'number' || typeof numPlannedDistance !== 'number' || 
        isNaN(numActualDistance) || isNaN(numPlannedDistance)) return 'N/A';
    
    const difference = numActualDistance - numPlannedDistance;
    const sign = difference > 0 ? '+' : '';
    return `${sign}${difference.toFixed(2)} km`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Distance Compliance
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Planned Distance (Route)</div>
          <div className="text-lg font-bold text-blue-900">
            {formatDistance(data.plannedDistance)}
          </div>
        </div>
        
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">Actual Distance</div>
          <div className="text-lg font-bold text-purple-900">
            {formatDistance(data.currentActualDistance)}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="text-sm text-orange-600 font-medium">Difference</div>
          <div className={`text-lg font-bold ${
            data.complianceStatus.percentageDifference !== null && 
            data.complianceStatus.percentageDifference > data.tolerancePercentage
              ? 'text-red-600' 
              : 'text-green-600'
          }`}>
            {data.complianceStatus.percentageDifference !== null && 
             data.complianceStatus.percentageDifference > data.tolerancePercentage
              ? `⚠️ EXCEEDS TOLERANCE (${formatDistanceDifference(data.currentActualDistance, data.plannedDistance)})`
              : '✅ WITHIN TOLERANCE'
            }
          </div>
        </div>
      </div>


      <div className="flex justify-between text-xs text-gray-500">
        <span>GPS Points: {data.gpsPointsCount}</span>
        <span>
          Last Update: {data.lastUpdate 
            ? new Date(data.lastUpdate).toLocaleString() 
            : 'Never'
          }
        </span>
      </div>
    </div>
  );
};

export default DistanceComplianceCard;
