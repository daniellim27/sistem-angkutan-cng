/**
 * Idle Vehicle Detection Service
 * Detects vehicles that have been idle (not moving) for extended periods
 * and sends notifications when they are far from SPBG locations
 */

const { DriverLocation, Vehicle, DepositGroup, Customer, Notification } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class IdleVehicleDetectionService {
  constructor() {
    // Configuration
    this.idleDurationHours = parseFloat(process.env.IDLE_DURATION_HOURS) || 1.0; // 1 hour
    this.spbgRadiusMeters = parseFloat(process.env.IDLE_SPBG_RADIUS_METERS) || 1000; // 1km
    this.customerRadiusMeters = parseFloat(process.env.IDLE_CUSTOMER_RADIUS_METERS) || 2000; // 2km
    this.isEnabled = process.env.IDLE_VEHICLE_DETECTION_ENABLED !== 'false'; // Enabled by default
    this.checkIntervalMinutes = parseInt(process.env.IDLE_CHECK_INTERVAL_MINUTES) || 15; // Check every 15 minutes
    
    // Track last notification time per vehicle to avoid spam
    this.lastNotificationTime = new Map(); // { vehicleId: timestamp }
    this.notificationCooldownMinutes = 60; // Don't send another notification for same vehicle within 1 hour
  }

  /**
   * Calculate distance between two GPS points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lng1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lng2 - Longitude of second point
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  /**
   * Check if location is within radius of any SPBG
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {object} { isNear: boolean, nearestSpbg: object|null, distance: number }
   */
  async checkNearSPBG(lat, lng) {
    try {
      const spbgs = await DepositGroup.findAll({
        where: {
          latitude: { [Op.not]: null },
          longitude: { [Op.not]: null },
          status: { [Op.in]: ['active', 'fulfilled', 'overdrawn', 'pending_selisih'] }
        },
        attributes: ['id', 'spbg_name', 'spbg_location', 'latitude', 'longitude']
      });

      // If no SPBGs found in database, use dummy/test data for simulation
      let testSpbgs = [];
      if (spbgs.length === 0) {
        // Dummy SPBG locations for testing (Jakarta area)
        testSpbgs = [
          { id: 999, spbg_name: 'Test SPBG 1', spbg_location: 'Jakarta Pusat', latitude: -6.2088, longitude: 106.8456 },
          { id: 998, spbg_name: 'Test SPBG 2', spbg_location: 'Jakarta Selatan', latitude: -6.2297, longitude: 106.7970 },
          { id: 997, spbg_name: 'Test SPBG 3', spbg_location: 'Jakarta Barat', latitude: -6.1699, longitude: 106.7896 }
        ];
        logger.info('No SPBGs found in database, using dummy/test data for proximity simulation');
      }

      const allSpbgs = spbgs.length > 0 ? spbgs : testSpbgs;
      let nearestSpbg = null;
      let minDistance = Infinity;

      for (const spbg of allSpbgs) {
        const distance = this.calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(spbg.latitude),
          parseFloat(spbg.longitude)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestSpbg = spbg;
        }
      }

      return {
        isNear: minDistance <= this.spbgRadiusMeters,
        nearestSpbg: nearestSpbg,
        distance: Math.round(minDistance)
      };
    } catch (error) {
      logger.error('Error checking SPBG proximity:', error);
      return { isNear: false, nearestSpbg: null, distance: Infinity };
    }
  }

  /**
   * Check if location is within radius of any customer location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {object} { isNear: boolean, nearestCustomer: object|null, distance: number }
   */
  async checkNearCustomer(lat, lng) {
    try {
      const customers = await Customer.findAll({
        where: {
          latitude: { [Op.not]: null },
          longitude: { [Op.not]: null }
        },
        attributes: ['id', 'customer_name', 'location', 'latitude', 'longitude']
      });

      let nearestCustomer = null;
      let minDistance = Infinity;

      for (const customer of customers) {
        const distance = this.calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(customer.latitude),
          parseFloat(customer.longitude)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestCustomer = customer;
        }
      }

      return {
        isNear: minDistance <= this.customerRadiusMeters,
        nearestCustomer: nearestCustomer,
        distance: Math.round(minDistance)
      };
    } catch (error) {
      logger.error('Error checking customer proximity:', error);
      return { isNear: false, nearestCustomer: null, distance: Infinity };
    }
  }

  /**
   * Check if a vehicle has been idle (coordinates unchanged) for the configured duration
   * @param {number} vehicleId - Vehicle ID
   * @returns {object|null} { isIdle: boolean, lastLocation: object, idleSince: Date }
   */
  async checkVehicleIdle(vehicleId) {
    try {
      const oneHourAgo = new Date(Date.now() - (this.idleDurationHours * 60 * 60 * 1000));
      
      // Get the most recent location
      const latestLocation = await DriverLocation.findOne({
        where: { vehicle_id: vehicleId },
        order: [['timestamp', 'DESC']],
        limit: 1
      });

      if (!latestLocation) {
        return null; // No location data
      }

      // Check if location is older than idle duration
      const locationTime = new Date(latestLocation.timestamp);
      if (locationTime < oneHourAgo) {
        // Location is old, but we need to check if coordinates have changed
        // Get all locations in the last hour
        const locationsInLastHour = await DriverLocation.findAll({
          where: {
            vehicle_id: vehicleId,
            timestamp: { [Op.gte]: oneHourAgo }
          },
          order: [['timestamp', 'ASC']]
        });

        // If no locations in last hour, check if the latest location is from before the idle threshold
        if (locationsInLastHour.length === 0) {
          // No recent GPS updates - vehicle might be offline or truly idle
          return {
            isIdle: true,
            lastLocation: latestLocation,
            idleSince: locationTime,
            reason: 'no_recent_updates'
          };
        }

        // Check if coordinates have changed significantly (more than ~50 meters)
        const firstLocation = locationsInLastHour[0];
        const lastLocation = locationsInLastHour[locationsInLastHour.length - 1];
        
        const distance = this.calculateDistance(
          parseFloat(firstLocation.latitude),
          parseFloat(firstLocation.longitude),
          parseFloat(lastLocation.latitude),
          parseFloat(lastLocation.longitude)
        );

        // If distance is less than 50 meters, consider it idle
        if (distance < 50) {
          return {
            isIdle: true,
            lastLocation: latestLocation,
            idleSince: firstLocation.timestamp,
            reason: 'coordinates_unchanged'
          };
        }
      }

      return { isIdle: false };
    } catch (error) {
      logger.error(`Error checking vehicle idle status for vehicle ${vehicleId}:`, error);
      return null;
    }
  }

  /**
   * Process idle vehicle detection and create notifications
   * @returns {object} Result object with statistics
   */
  async processIdleVehicles() {
    if (!this.isEnabled) {
      return { success: false, message: 'Idle vehicle detection is disabled' };
    }

    try {
      logger.info('🔍 Starting idle vehicle detection...');
      
      // Get all active vehicles with GPS tracking
      const vehicles = await Vehicle.findAll({
        where: {
          device_id: { [Op.not]: null }
        },
        include: [
          {
            model: require('../models').User,
            as: 'driver',
            attributes: ['id', 'username']
          }
        ]
      });

      let checkedCount = 0;
      let idleCount = 0;
      let notifiedCount = 0;
      let skippedCount = 0;

      for (const vehicle of vehicles) {
        checkedCount++;
        
        // Check if vehicle is idle
        const idleStatus = await this.checkVehicleIdle(vehicle.id);
        
        if (!idleStatus || !idleStatus.isIdle) {
          continue; // Vehicle is not idle
        }

        idleCount++;
        
        const { lastLocation, idleSince } = idleStatus;
        const lat = parseFloat(lastLocation.latitude);
        const lng = parseFloat(lastLocation.longitude);

        // Check proximity to SPBG (must be > 1km away)
        const spbgCheck = await this.checkNearSPBG(lat, lng);
        
        if (spbgCheck.isNear) {
          // Vehicle is near SPBG, skip notification
          skippedCount++;
          logger.debug(`Vehicle ${vehicle.license_plate} (ID: ${vehicle.id}) is idle but near SPBG, skipping notification`);
          continue;
        }

        // Check proximity to customer (if within 2km, skip notification)
        const customerCheck = await this.checkNearCustomer(lat, lng);
        
        if (customerCheck.isNear) {
          // Vehicle is near customer, skip notification
          skippedCount++;
          logger.debug(`Vehicle ${vehicle.license_plate} (ID: ${vehicle.id}) is idle but near customer, skipping notification`);
          continue;
        }

        // Check if we've sent a notification for this vehicle recently
        const lastNotificationTime = this.lastNotificationTime.get(vehicle.id);
        const now = Date.now();
        if (lastNotificationTime && (now - lastNotificationTime) < (this.notificationCooldownMinutes * 60 * 1000)) {
          skippedCount++;
          logger.debug(`Vehicle ${vehicle.license_plate} (ID: ${vehicle.id}) notification on cooldown`);
          continue;
        }

        // Create notification
        try {
          const idleDurationHours = (Date.now() - new Date(idleSince).getTime()) / (1000 * 60 * 60);
          
          await Notification.create({
            type: 'idle_vehicle',
            title: `Kendaraan Idle: ${vehicle.license_plate || vehicle.device_id}`,
            message: `Kendaraan ${vehicle.license_plate || vehicle.device_id} telah idle selama ${idleDurationHours.toFixed(1)} jam. Lokasi: ${lat.toFixed(6)}, ${lng.toFixed(6)}. Jarak dari SPBG terdekat: ${(spbgCheck.distance / 1000).toFixed(2)} km.`,
            vehicle_id: vehicle.id,
            driver_id: vehicle.driver_id,
            latitude: lat,
            longitude: lng,
            metadata: {
              idleDurationHours: idleDurationHours.toFixed(2),
              idleSince: idleSince,
              spbgDistance: spbgCheck.distance,
              customerDistance: customerCheck.distance,
              nearestSpbg: spbgCheck.nearestSpbg ? {
                id: spbgCheck.nearestSpbg.id,
                name: spbgCheck.nearestSpbg.spbg_name || spbgCheck.nearestSpbg.spbg_location
              } : null,
              vehicleLicensePlate: vehicle.license_plate,
              deviceId: vehicle.device_id
            }
          });

          this.lastNotificationTime.set(vehicle.id, now);
          notifiedCount++;
          
          logger.info(`⚠️ Created idle vehicle notification for vehicle ${vehicle.license_plate} (ID: ${vehicle.id})`);
        } catch (error) {
          logger.error(`Error creating notification for vehicle ${vehicle.id}:`, error);
        }
      }

      const result = {
        success: true,
        checked: checkedCount,
        idle: idleCount,
        notified: notifiedCount,
        skipped: skippedCount
      };

      logger.info(`✅ Idle vehicle detection completed: ${checkedCount} checked, ${idleCount} idle, ${notifiedCount} notified, ${skippedCount} skipped`);
      
      return result;
    } catch (error) {
      logger.error('Error processing idle vehicles:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new IdleVehicleDetectionService();

