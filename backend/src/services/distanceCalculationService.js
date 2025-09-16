/**
 * Distance Calculation Service
 * Handles Haversine formula calculations and route distance comparisons
 */

const { DriverLocation, DeliveryOrder } = require('../models');
const { Op } = require('sequelize');

class DistanceCalculationService {
  /**
   * Calculate distance between two GPS points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lng1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lng2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  static calculateHaversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  /**
   * Calculate total traveled distance from GPS tracking points
   * @param {Array} gpsPoints - Array of GPS points with latitude, longitude, timestamp
   * @returns {number} Total distance in kilometers
   */
  static calculateTotalTraveledDistance(gpsPoints) {
    if (!gpsPoints || gpsPoints.length < 2) {
      return 0;
    }

    // Sort points by timestamp to ensure correct order
    const sortedPoints = [...gpsPoints].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    let totalDistance = 0;
    
    for (let i = 1; i < sortedPoints.length; i++) {
      const prev = sortedPoints[i - 1];
      const curr = sortedPoints[i];
      
      const distance = this.calculateHaversineDistance(
        parseFloat(prev.latitude),
        parseFloat(prev.longitude),
        parseFloat(curr.latitude),
        parseFloat(curr.longitude)
      );
      
      totalDistance += distance;
    }

    return Math.round(totalDistance * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Calculate planned route distance between delivery order locations
   * @param {Object} deliveryOrder - Delivery order with location coordinates
   * @returns {number} Planned route distance in kilometers
   */
  static calculatePlannedRouteDistance(deliveryOrder) {
    const waypoints = [];
    
    // Add load location (SPBU)
    if (deliveryOrder.load_latitude && deliveryOrder.load_longitude) {
      waypoints.push({
        latitude: parseFloat(deliveryOrder.load_latitude),
        longitude: parseFloat(deliveryOrder.load_longitude),
        type: 'load'
      });
    }
    
    // Add unload location
    if (deliveryOrder.unload_latitude && deliveryOrder.unload_longitude) {
      waypoints.push({
        latitude: parseFloat(deliveryOrder.unload_latitude),
        longitude: parseFloat(deliveryOrder.unload_longitude),
        type: 'unload'
      });
    }
    
    // Add additional unload locations
    if (deliveryOrder.additional_unload_locations && Array.isArray(deliveryOrder.additional_unload_locations)) {
      deliveryOrder.additional_unload_locations.forEach(location => {
        if (location.latitude && location.longitude) {
          waypoints.push({
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
            type: 'additional_unload'
          });
        }
      });
    }

    if (waypoints.length < 2) {
      return 0;
    }

    // Calculate total distance between waypoints
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      
      const distance = this.calculateHaversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
      
      totalDistance += distance;
    }

    return Math.round(totalDistance * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Compare actual traveled distance with planned route distance
   * @param {number} actualDistance - Actual traveled distance in km
   * @param {number} plannedDistance - Planned route distance in km
   * @param {number} tolerancePercentage - Tolerance percentage (default 31%)
   * @returns {Object} Comparison result
   */
  static compareDistances(actualDistance, plannedDistance, tolerancePercentage = 31.0) {
    if (!plannedDistance || plannedDistance === 0) {
      return {
        withinTolerance: null,
        percentageDifference: null,
        tolerancePercentage,
        status: 'not_calculated',
        message: 'Planned distance not available'
      };
    }

    const percentageDifference = ((actualDistance - plannedDistance) / plannedDistance) * 100;
    
    // Only detect anomalies when actual distance is HIGHER than planned (positive difference)
    // If actual distance is lower than planned, it's always considered within tolerance
    const withinTolerance = percentageDifference <= tolerancePercentage;
    
    let status, message;
    if (withinTolerance) {
      status = 'within_tolerance';
      if (percentageDifference < 0) {
        message = `Driver took a shorter route (${Math.abs(percentageDifference).toFixed(1)}% shorter) - within tolerance`;
      } else {
        message = `Driver stayed within ${tolerancePercentage}% tolerance (${percentageDifference.toFixed(1)}% difference)`;
      }
    } else {
      status = 'exceeds_tolerance';
      message = `Driver exceeded ${tolerancePercentage}% tolerance (${percentageDifference.toFixed(1)}% longer route)`;
    }

    return {
      withinTolerance,
      percentageDifference: Math.round(percentageDifference * 10) / 10, // Round to 1 decimal
      tolerancePercentage,
      status,
      message,
      actualDistance: Math.round(actualDistance * 1000) / 1000,
      plannedDistance: Math.round(plannedDistance * 1000) / 1000
    };
  }

  /**
   * Calculate and update distance compliance for a delivery order
   * @param {number} deliveryOrderId - Delivery order ID
   * @param {number} tolerancePercentage - Tolerance percentage (default 31%)
   * @param {number} plannedDistance - Optional planned distance (if not provided, will calculate)
   * @returns {Object} Distance compliance result
   */
  static async calculateDistanceCompliance(deliveryOrderId, tolerancePercentage = 31.0, plannedDistance = null) {
    try {
      // Get delivery order with location data
      const deliveryOrder = await DeliveryOrder.findByPk(deliveryOrderId);
      if (!deliveryOrder) {
        throw new Error('Delivery order not found');
      }

      // Use provided planned distance or calculate it
      const finalPlannedDistance = plannedDistance || this.calculatePlannedRouteDistance(deliveryOrder);
      
      // Get GPS tracking points for this delivery order
      const gpsPoints = await DriverLocation.findAll({
        where: {
          delivery_order_id: deliveryOrderId,
          latitude: { [Op.ne]: null },
          longitude: { [Op.ne]: null }
        },
        order: [['timestamp', 'ASC']],
        attributes: ['latitude', 'longitude', 'timestamp']
      });

      // Calculate actual traveled distance
      const actualDistance = this.calculateTotalTraveledDistance(gpsPoints);

      // Compare distances
      const comparison = this.compareDistances(actualDistance, finalPlannedDistance, tolerancePercentage);

      // Update delivery order with calculated values
      await deliveryOrder.update({
        planned_route_distance_km: finalPlannedDistance,
        actual_traveled_distance_km: actualDistance,
        distance_tolerance_percentage: tolerancePercentage,
        distance_compliance_status: comparison.status
      });

      console.log(`📏 Distance compliance calculated for DO ${deliveryOrderId}:`, {
        planned: `${finalPlannedDistance} km`,
        actual: `${actualDistance} km`,
        status: comparison.status,
        message: comparison.message
      });

      return {
        success: true,
        data: {
          deliveryOrderId,
          plannedDistance: finalPlannedDistance,
          actualDistance,
          comparison,
          gpsPointsCount: gpsPoints.length
        }
      };

    } catch (error) {
      console.error('Error calculating distance compliance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get distance compliance status for a delivery order
   * @param {number} deliveryOrderId - Delivery order ID
   * @returns {Object} Distance compliance status
   */
  static async getDistanceComplianceStatus(deliveryOrderId) {
    try {
      const deliveryOrder = await DeliveryOrder.findByPk(deliveryOrderId, {
        attributes: [
          'id',
          'planned_route_distance_km',
          'actual_traveled_distance_km',
          'distance_tolerance_percentage',
          'distance_compliance_status'
        ]
      });

      if (!deliveryOrder) {
        throw new Error('Delivery order not found');
      }

      return {
        success: true,
        data: {
          deliveryOrderId,
          plannedDistance: deliveryOrder.planned_route_distance_km,
          actualDistance: deliveryOrder.actual_traveled_distance_km,
          tolerancePercentage: deliveryOrder.distance_tolerance_percentage,
          status: deliveryOrder.distance_compliance_status
        }
      };

    } catch (error) {
      console.error('Error getting distance compliance status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DistanceCalculationService;
