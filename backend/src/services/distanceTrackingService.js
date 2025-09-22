/**
 * Distance Tracking Service
 * Automatically calculates and updates distance compliance when GPS data is updated
 */

const DistanceCalculationService = require('./distanceCalculationService');
const { DeliveryOrder } = require('../models');

class DistanceTrackingService {
  /**
   * Process new GPS location and update distance compliance
   * This should be called whenever a new GPS location is recorded
   * @param {Object} locationData - GPS location data
   */
  static async processNewLocation(locationData) {
    try {
      const { delivery_order_id, latitude, longitude, timestamp } = locationData;
      
      if (!delivery_order_id || !latitude || !longitude) {
        return { success: false, message: 'Missing required location data' };
      }

      // Get delivery order to check if it's active
      const deliveryOrder = await DeliveryOrder.findByPk(delivery_order_id, {
        attributes: ['id', 'status', 'distance_compliance_status']
      });

      if (!deliveryOrder) {
        return { success: false, message: 'Delivery order not found' };
      }

      // Only process for active delivery orders
      const activeStatuses = ['assigned', 'otw_to_unload_location', 'at_unload_location'];
      if (!activeStatuses.includes(deliveryOrder.status)) {
        return { success: false, message: 'Delivery order is not in active tracking status' };
      }

      // Calculate distance compliance
      const result = await DistanceCalculationService.calculateDistanceCompliance(
        delivery_order_id,
        deliveryOrder.distance_tolerance_percentage || 31.0
      );

      if (result.success) {
        console.log(`📏 Distance compliance updated for DO ${delivery_order_id}:`, {
          planned: `${result.data.plannedDistance} km`,
          actual: `${result.data.actualDistance} km`,
          status: result.data.comparison.status,
          message: result.data.comparison.message
        });

        return {
          success: true,
          data: {
            deliveryOrderId: delivery_order_id,
            complianceStatus: result.data.comparison,
            gpsPointsCount: result.data.gpsPointsCount
          }
        };
      } else {
        console.error(`❌ Failed to calculate distance compliance for DO ${delivery_order_id}:`, result.error);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('Error processing new location for distance tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch process distance compliance for multiple delivery orders
   * @param {Array} deliveryOrderIds - Array of delivery order IDs
   * @param {number} tolerancePercentage - Tolerance percentage (default 31%)
   */
  static async batchProcessDistanceCompliance(deliveryOrderIds, tolerancePercentage = 31.0) {
    const results = [];
    
    for (const deliveryOrderId of deliveryOrderIds) {
      try {
        const result = await DistanceCalculationService.calculateDistanceCompliance(
          deliveryOrderId,
          tolerancePercentage
        );
        
        results.push({
          deliveryOrderId,
          success: result.success,
          data: result.success ? result.data : null,
          error: result.success ? null : result.error
        });
      } catch (error) {
        results.push({
          deliveryOrderId,
          success: false,
          data: null,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`📊 Batch distance compliance processing completed:`, {
      total: results.length,
      successful: successCount,
      failed: failureCount
    });

    return {
      success: true,
      data: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results
      }
    };
  }

  /**
   * Get distance compliance summary for active delivery orders
   */
  static async getActiveDeliveryOrdersCompliance() {
    try {
      const activeDeliveryOrders = await DeliveryOrder.findAll({
        where: {
          status: ['assigned', 'otw_to_unload_location', 'at_unload_location']
        },
        attributes: [
          'id',
          'do_number',
          'customer_name',
          'status',
          'planned_route_distance_km',
          'actual_traveled_distance_km',
          'distance_tolerance_percentage',
          'distance_compliance_status'
        ]
      });

      const summary = {
        total: activeDeliveryOrders.length,
        withinTolerance: 0,
        exceedsTolerance: 0,
        notCalculated: 0,
        deliveryOrders: []
      };

      activeDeliveryOrders.forEach(deliveryOrder => {
        switch (deliveryOrder.distance_compliance_status) {
          case 'within_tolerance':
            summary.withinTolerance++;
            break;
          case 'exceeds_tolerance':
            summary.exceedsTolerance++;
            break;
          case 'not_calculated':
          default:
            summary.notCalculated++;
            break;
        }

        summary.deliveryOrders.push({
          id: deliveryOrder.id,
          doNumber: deliveryOrder.do_number,
          customerName: deliveryOrder.customer_name,
          status: deliveryOrder.status,
          plannedDistance: deliveryOrder.planned_route_distance_km,
          actualDistance: deliveryOrder.actual_traveled_distance_km,
          tolerancePercentage: deliveryOrder.distance_tolerance_percentage,
          complianceStatus: deliveryOrder.distance_compliance_status
        });
      });

      return {
        success: true,
        data: summary
      };

    } catch (error) {
      console.error('Error getting active delivery orders compliance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log distance compliance alerts for drivers who exceed tolerance
   */
  static async logDistanceComplianceAlerts() {
    try {
      const deliveryOrders = await DeliveryOrder.findAll({
        where: {
          distance_compliance_status: 'exceeds_tolerance',
          status: ['assigned', 'otw_to_unload_location', 'at_unload_location']
        },
        attributes: [
          'id',
          'do_number',
          'customer_name',
          'driver_id',
          'vehicle_id',
          'planned_route_distance_km',
          'actual_traveled_distance_km',
          'distance_tolerance_percentage'
        ],
        include: [
          {
            model: require('../models').User,
            as: 'driver',
            attributes: ['username'],
            include: [{
              model: require('../models').DriverProfile,
              as: 'driverProfile',
              attributes: ['full_name', 'phone']
            }]
          },
          {
            model: require('../models').Vehicle,
            as: 'vehicle',
            attributes: ['license_plate', 'type']
          }
        ]
      });

      if (deliveryOrders.length > 0) {
        console.log(`⚠️ Distance compliance alerts - ${deliveryOrders.length} drivers exceeding tolerance:`);
        
        deliveryOrders.forEach(deliveryOrder => {
          const percentageDiff = deliveryOrder.planned_route_distance_km && deliveryOrder.actual_traveled_distance_km
            ? ((deliveryOrder.actual_traveled_distance_km - deliveryOrder.planned_route_distance_km) / deliveryOrder.planned_route_distance_km) * 100
            : 0;

          console.log(`🚨 DO ${deliveryOrder.do_number} (${deliveryOrder.customer_name}):`, {
            driver: deliveryOrder.driver?.driverProfile?.full_name || deliveryOrder.driver?.username || 'Unknown',
            vehicle: deliveryOrder.vehicle?.license_plate || 'Unknown',
            planned: `${deliveryOrder.planned_route_distance_km} km`,
            actual: `${deliveryOrder.actual_traveled_distance_km} km`,
            difference: `${percentageDiff.toFixed(1)}%`,
            tolerance: `${deliveryOrder.distance_tolerance_percentage}%`
          });
        });
      }

      return {
        success: true,
        data: {
          alertCount: deliveryOrders.length,
        deliveryOrders: deliveryOrders.map(deliveryOrder => ({
          id: deliveryOrder.id,
          doNumber: deliveryOrder.do_number,
          customerName: deliveryOrder.customer_name,
          driverName: deliveryOrder.driver?.driverProfile?.full_name || deliveryOrder.driver?.username,
          vehiclePlate: deliveryOrder.vehicle?.license_plate,
          plannedDistance: deliveryOrder.planned_route_distance_km,
          actualDistance: deliveryOrder.actual_traveled_distance_km,
          percentageDifference: deliveryOrder.planned_route_distance_km && deliveryOrder.actual_traveled_distance_km
            ? ((deliveryOrder.actual_traveled_distance_km - deliveryOrder.planned_route_distance_km) / deliveryOrder.planned_route_distance_km) * 100
            : 0
        }))
        }
      };

    } catch (error) {
      console.error('Error logging distance compliance alerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DistanceTrackingService;
