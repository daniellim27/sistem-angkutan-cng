/**
 * Location-Based Status Service
 * Automatically updates delivery order statuses based on GPS location detection
 * from Inovatrack scraping data.
 */

const { DeliveryOrder, Vehicle, DriverProfile, DriverLocation, Customer, DepositGroup } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class LocationStatusService {
  constructor() {
    // Configuration - can be overridden via environment variables
    this.geofenceRadiusMeters = parseInt(process.env.GEOFENCE_RADIUS_METERS) || 500;
    this.cooldownMinutes = parseInt(process.env.AUTO_STATUS_COOLDOWN_MINUTES) || 5;
    this.isEnabled = process.env.AUTO_STATUS_UPDATE_ENABLED !== 'false'; // Enabled by default
    
    // In-memory cache for cooldown tracking
    // Format: { deliveryOrderId: { lastUpdate: Date, lastStatus: string } }
    this.updateCache = new Map();
    
    // Statistics
    this.stats = {
      totalChecks: 0,
      statusUpdates: 0,
      skippedCooldown: 0,
      skippedNoMatch: 0,
      errors: 0
    };
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
   * Check if current location is within geofence radius of target location
   * @param {number} currentLat - Current latitude
   * @param {number} currentLng - Current longitude
   * @param {number} targetLat - Target latitude
   * @param {number} targetLng - Target longitude
   * @param {number} radiusMeters - Geofence radius in meters (optional, uses default)
   * @returns {object} { isNear: boolean, distance: number }
   */
  isNearLocation(currentLat, currentLng, targetLat, targetLng, radiusMeters = null) {
    const radius = radiusMeters || this.geofenceRadiusMeters;
    const distance = this.calculateDistance(currentLat, currentLng, targetLat, targetLng);
    return {
      isNear: distance <= radius,
      distance: Math.round(distance)
    };
  }

  /**
   * Check if a delivery order is in cooldown period
   * @param {number} deliveryOrderId - Delivery order ID
   * @returns {boolean} True if in cooldown
   */
  isInCooldown(deliveryOrderId) {
    const cached = this.updateCache.get(deliveryOrderId);
    if (!cached) return false;
    
    const cooldownMs = this.cooldownMinutes * 60 * 1000;
    const timeSinceLastUpdate = Date.now() - cached.lastUpdate.getTime();
    return timeSinceLastUpdate < cooldownMs;
  }

  /**
   * Record a status update in the cache
   * @param {number} deliveryOrderId - Delivery order ID
   * @param {string} newStatus - New status
   */
  recordUpdate(deliveryOrderId, newStatus) {
    this.updateCache.set(deliveryOrderId, {
      lastUpdate: new Date(),
      lastStatus: newStatus
    });
  }

  /**
   * Get all customer locations for a delivery order
   * Fetches coordinates from Customer model if not available in delivery order
   * @param {object} deliveryOrder - Delivery order object
   * @returns {Promise<Array>} Array of location objects with latitude, longitude, and name
   */
  async getAllCustomerLocations(deliveryOrder) {
    const locations = [];
    
    // Helper to fetch customer coordinates from Customer model
    const fetchCustomerCoords = async (locationName, customerName) => {
      if (!locationName && !customerName) return null;
      
      try {
        const whereClause = {};
        if (locationName) {
          whereClause.location = { [Op.iLike]: `%${locationName}%` };
        }
        if (customerName) {
          whereClause.customer_name = { [Op.iLike]: `%${customerName}%` };
        }
        
        const customer = await Customer.findOne({
          where: {
            ...whereClause,
            latitude: { [Op.not]: null },
            longitude: { [Op.not]: null }
          },
          order: [['created_at', 'DESC']] // Get most recent match
        });
        
        if (customer && customer.latitude && customer.longitude) {
          return {
            latitude: parseFloat(customer.latitude),
            longitude: parseFloat(customer.longitude),
            name: customer.location || customer.customer_name || locationName
          };
        }
      } catch (error) {
        logger.error('Error fetching customer coordinates:', error);
      }
      return null;
    };
    
    // Add primary unload location
    // First try to use coordinates from delivery order
    if (deliveryOrder.unload_latitude && deliveryOrder.unload_longitude) {
      locations.push({
        index: 0,
        latitude: parseFloat(deliveryOrder.unload_latitude),
        longitude: parseFloat(deliveryOrder.unload_longitude),
        name: deliveryOrder.unload_location || 'Primary Unload Location'
      });
    } else if (deliveryOrder.unload_location || deliveryOrder.customer_location || deliveryOrder.customer_name) {
      // Fetch from Customer model if coordinates not in delivery order
      const coords = await fetchCustomerCoords(
        deliveryOrder.unload_location || deliveryOrder.customer_location,
        deliveryOrder.customer_name
      );
      if (coords) {
        locations.push({
          index: 0,
          ...coords
        });
      }
    }
    
    // Add additional unload locations
    if (deliveryOrder.additional_unload_locations && Array.isArray(deliveryOrder.additional_unload_locations)) {
      for (let idx = 0; idx < deliveryOrder.additional_unload_locations.length; idx++) {
        const loc = deliveryOrder.additional_unload_locations[idx];
        
        // First try to use coordinates from additional location
        if (loc.latitude && loc.longitude) {
          locations.push({
            index: idx + 1,
            latitude: parseFloat(loc.latitude),
            longitude: parseFloat(loc.longitude),
            name: loc.location || `Additional Location ${idx + 1}`
          });
        } else if (loc.location) {
          // Fetch from Customer model if coordinates not available
          const coords = await fetchCustomerCoords(loc.location, null);
          if (coords) {
            locations.push({
              index: idx + 1,
              ...coords
            });
          }
        }
      }
    }
    
    return locations;
  }

  /**
   * Get current active customer location index based on location_documentation
   * @param {object} deliveryOrder - Delivery order object
   * @returns {Promise<number>} Current location index (0-based)
   */
  async getCurrentLocationIndex(deliveryOrder) {
    const locationDocs = deliveryOrder.location_documentation || [];
    const allLocations = await this.getAllCustomerLocations(deliveryOrder);
    
    // Find the first location that is not completed
    for (let i = 0; i < allLocations.length; i++) {
      const doc = locationDocs.find(d => d.location_index === i);
      const isCompleted = doc && (
        doc.completed === true || 
        String(doc.completed) === 'true' || 
        Number(doc.completed) === 1
      );
      if (!isCompleted) {
        return i;
      }
    }
    
    // All locations completed, return last index
    return Math.max(0, allLocations.length - 1);
  }

  /**
   * Update delivery order status with validation
   * @param {object} deliveryOrder - Delivery order object
   * @param {string} newStatus - New status to set
   * @param {string} timestampField - Field to update with timestamp
   * @param {object} context - Additional context for logging
   * @returns {object} Result object { success, message, data }
   */
  async updateStatusIfNeeded(deliveryOrder, newStatus, timestampField, context = {}) {
    try {
      const oldStatus = deliveryOrder.status;
      
      // Validate status transition
      const validTransitions = {
        // 'assigned' status was removed from enum, mapped to 'at_spbu'
        'at_spbu': ['at_spbu'],
        'at_spbu': ['otw_to_unload_location'],
        'otw_to_unload_location': ['at_unload_location'],
        'at_unload_location': ['completed'],
        'completed': [],
        'cancelled': []
      };
      
      const allowedTransitions = validTransitions[oldStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        return {
          success: false,
          message: `Invalid status transition from ${oldStatus} to ${newStatus}`,
          skipped: true
        };
      }
      
      // Check cooldown
      if (this.isInCooldown(deliveryOrder.id)) {
        this.stats.skippedCooldown++;
        return {
          success: false,
          message: 'Status update skipped - in cooldown period',
          skipped: true
        };
      }
      
      // Perform the update
      const updateData = {
        status: newStatus,
        [timestampField]: new Date(),
        status_auto_updated_at: new Date() // Mark as auto-updated
      };
      
      await deliveryOrder.update(updateData);
      
      // Update driver and vehicle status if needed
      if (newStatus === 'at_spbu' || newStatus === 'otw_to_unload_location' || newStatus === 'at_unload_location') {
        // Set driver and vehicle to busy/in_use
        if (deliveryOrder.driver_id) {
          await DriverProfile.update(
            { status: 'busy' },
            { where: { user_id: deliveryOrder.driver_id } }
          );
        }
        if (deliveryOrder.vehicle_id) {
          await Vehicle.update(
            { status: 'in_use' },
            { where: { id: deliveryOrder.vehicle_id } }
          );
        }
      }
      
      // Record the update in cache
      this.recordUpdate(deliveryOrder.id, newStatus);
      this.stats.statusUpdates++;
      
      // Log the automatic update
      logger.info(`🚀 AUTO STATUS UPDATE: DO ${deliveryOrder.id} (${deliveryOrder.do_number})`, {
        oldStatus,
        newStatus,
        distance: context.distance,
        targetLocation: context.targetLocation,
        gpsCoordinates: context.gpsCoordinates,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `Status updated from ${oldStatus} to ${newStatus}`,
        data: {
          deliveryOrderId: deliveryOrder.id,
          doNumber: deliveryOrder.do_number,
          oldStatus,
          newStatus,
          distance: context.distance,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      this.stats.errors++;
      logger.error(`❌ AUTO STATUS UPDATE ERROR: DO ${deliveryOrder.id}`, {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        message: error.message,
        error: true
      };
    }
  }

  /**
   * Check GPS location against delivery order and update status if needed
   * @param {object} gpsData - GPS data from Inovatrack { vehicleId, latitude, longitude, deviceId, timestamp }
   * @returns {object} Result object
   */
  async checkAndUpdateStatusForLocation(gpsData) {
    if (!this.isEnabled) {
      return { success: false, message: 'Auto status update is disabled' };
    }
    
    this.stats.totalChecks++;
    
    try {
      const { vehicle_id, latitude, longitude, device_id } = gpsData;
      
      if (!latitude || !longitude) {
        return { success: false, message: 'Missing GPS coordinates' };
      }
      
      const currentLat = parseFloat(latitude);
      const currentLng = parseFloat(longitude);
      
      // Find active delivery orders for this vehicle
      // Check by vehicle_id or by device_id through vehicle table
      // Note: 'assigned' status was removed from enum, use 'at_spbu' instead
      let whereClause = {
        status: {
          [Op.in]: ['at_spbu', 'otw_to_unload_location']
        }
      };
      
      if (vehicle_id) {
        whereClause.vehicle_id = vehicle_id;
      } else if (device_id) {
        // Find vehicle by device_id first
        const vehicle = await Vehicle.findOne({
          where: { device_id: device_id }
        });
        if (vehicle) {
          whereClause.vehicle_id = vehicle.id;
        } else {
          this.stats.skippedNoMatch++;
          return { success: false, message: 'No vehicle found for device_id' };
        }
      } else {
        return { success: false, message: 'No vehicle_id or device_id provided' };
      }
      
      // Query with error handling for old "assigned" status values
      // The database enum may still have "assigned" but Sequelize model doesn't
      let activeOrders = [];
      try {
        activeOrders = await DeliveryOrder.findAll({
          where: whereClause,
          // Use raw: true to bypass Sequelize enum validation if needed
          raw: false
        });
      } catch (error) {
        // Handle case where database enum doesn't match model enum
        // This can happen if migration hasn't been run or old data exists
        if (error.message && error.message.includes('invalid input value for enum delivery_status')) {
          logger.warn('Enum mismatch detected. Database may have old "assigned" status values.');
          logger.warn('Attempting to query with raw SQL to handle old status values.');
          
          // Fallback: Use raw query to handle old "assigned" status
          const sequelize = DeliveryOrder.sequelize;
          const vehicleId = whereClause.vehicle_id;
          
          const [results] = await sequelize.query(`
            SELECT * FROM delivery_orders 
            WHERE vehicle_id = :vehicle_id 
            AND status IN ('at_spbu', 'otw_to_unload_location')
            ORDER BY id DESC
          `, {
            replacements: { vehicle_id: vehicleId },
            type: sequelize.QueryTypes.SELECT
          });
          
          if (results.length === 0) {
            this.stats.skippedNoMatch++;
            return { success: false, message: 'No active delivery orders for this vehicle' };
          }
          
          // Convert raw results to Sequelize instances
          activeOrders = await DeliveryOrder.findAll({
            where: {
              id: { [Op.in]: results.map(r => r.id) }
            }
          });
          
          logger.info(`Successfully queried ${activeOrders.length} orders using fallback method.`);
        } else {
          // Re-throw if it's a different error
          throw error;
        }
      }
      
      if (activeOrders.length === 0) {
        this.stats.skippedNoMatch++;
        return { success: false, message: 'No active delivery orders for this vehicle' };
      }
      
      const results = [];
      
      for (const order of activeOrders) {
        let result = null;
        
        if (order.status === 'at_spbu') {
          // Check if near SPBU (load location)
          result = await this.checkNearSPBU(order, currentLat, currentLng);
        } else if (order.status === 'otw_to_unload_location') {
          // Check if near customer location
          result = await this.checkNearCustomerLocation(order, currentLat, currentLng);
        }
        
        if (result) {
          results.push(result);
        }
      }
      
      return {
        success: true,
        message: `Checked ${activeOrders.length} orders`,
        results
      };
      
    } catch (error) {
      this.stats.errors++;
      logger.error('❌ Error in checkAndUpdateStatusForLocation:', {
        error: error.message,
        stack: error.stack,
        gpsData
      });
      return {
        success: false,
        message: error.message,
        error: true
      };
    }
  }

  /**
   * Check if vehicle is near SPBU and update status to at_spbu
   * Fetches SPBG coordinates from DepositGroup model if not available in delivery order
   * @param {object} order - Delivery order
   * @param {number} currentLat - Current latitude
   * @param {number} currentLng - Current longitude
   * @returns {object|null} Result or null if no update needed
   */
  async checkNearSPBU(order, currentLat, currentLng) {
    let spbuLat, spbuLng, spbuName;
    
    // First try to use coordinates from delivery order
    if (order.load_latitude && order.load_longitude) {
      spbuLat = parseFloat(order.load_latitude);
      spbuLng = parseFloat(order.load_longitude);
      spbuName = order.load_location || 'SPBU';
    } else if (order.load_location) {
      // Fetch from DepositGroup model if coordinates not in delivery order
      try {
        const depositGroup = await DepositGroup.findOne({
          where: {
            spbg_location: { [Op.iLike]: `%${order.load_location}%` },
            latitude: { [Op.not]: null },
            longitude: { [Op.not]: null },
            status: { [Op.in]: ['active', 'fulfilled', 'overdrawn', 'pending_selisih'] }
          },
          order: [['created_at', 'DESC']] // Get most recent match
        });
        
        if (depositGroup && depositGroup.latitude && depositGroup.longitude) {
          spbuLat = parseFloat(depositGroup.latitude);
          spbuLng = parseFloat(depositGroup.longitude);
          spbuName = depositGroup.spbg_name || depositGroup.spbg_location || order.load_location;
        } else {
          // No SPBG found with coordinates
          logger.debug(`No SPBG coordinates found for location: ${order.load_location}`);
          return null;
        }
      } catch (error) {
        logger.error('Error fetching SPBG coordinates:', error);
        return null;
      }
    } else {
      // No load location specified
      return null;
    }
    
    if (!spbuLat || !spbuLng || isNaN(spbuLat) || isNaN(spbuLng)) {
      return null;
    }
    
    const { isNear, distance } = this.isNearLocation(currentLat, currentLng, spbuLat, spbuLng);
    
    if (isNear) {
      return await this.updateStatusIfNeeded(
        order,
        'at_spbu',
        'arrived_at_load_location_at',
        {
          distance,
          targetLocation: spbuName,
          gpsCoordinates: { lat: currentLat, lng: currentLng }
        }
      );
    }
    
    return null;
  }

  /**
   * Check if vehicle is near customer location and update status to at_unload_location
   * Fetches customer coordinates from Customer model if not available in delivery order
   * @param {object} order - Delivery order
   * @param {number} currentLat - Current latitude
   * @param {number} currentLng - Current longitude
   * @returns {object|null} Result or null if no update needed
   */
  async checkNearCustomerLocation(order, currentLat, currentLng) {
    const allLocations = await this.getAllCustomerLocations(order);
    
    if (allLocations.length === 0) {
      return null;
    }
    
    // Get current active location index
    const currentLocationIndex = await this.getCurrentLocationIndex(order);
    const targetLocation = allLocations[currentLocationIndex];
    
    if (!targetLocation) {
      return null;
    }
    
    const { isNear, distance } = this.isNearLocation(
      currentLat, 
      currentLng, 
      targetLocation.latitude, 
      targetLocation.longitude
    );
    
    if (isNear) {
      return await this.updateStatusIfNeeded(
        order,
        'at_unload_location',
        'arrived_at_unload_location_at',
        {
          distance,
          targetLocation: targetLocation.name,
          locationIndex: currentLocationIndex,
          gpsCoordinates: { lat: currentLat, lng: currentLng }
        }
      );
    }
    
    return null;
  }

  /**
   * Process batch of GPS data from scraper
   * @param {Array} gpsDataArray - Array of GPS data objects
   * @returns {object} Batch processing results
   */
  async processBatchGPSData(gpsDataArray) {
    if (!this.isEnabled) {
      return { success: false, message: 'Auto status update is disabled' };
    }
    
    const results = {
      total: gpsDataArray.length,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    for (const gpsData of gpsDataArray) {
      try {
        const result = await this.checkAndUpdateStatusForLocation(gpsData);
        results.processed++;
        
        if (result.results && result.results.length > 0) {
          result.results.forEach(r => {
            if (r.success) {
              results.updated++;
              results.details.push(r.data);
            } else if (r.skipped) {
              results.skipped++;
            }
          });
        }
      } catch (error) {
        results.errors++;
        logger.error('Error processing GPS data in batch:', {
          error: error.message,
          gpsData
        });
      }
    }
    
    if (results.updated > 0) {
      logger.info(`📊 AUTO STATUS BATCH: Processed ${results.processed}/${results.total}, Updated ${results.updated}, Skipped ${results.skipped}`);
    }
    
    return results;
  }

  /**
   * Get service statistics
   * @returns {object} Service statistics
   */
  getStats() {
    return {
      ...this.stats,
      isEnabled: this.isEnabled,
      geofenceRadiusMeters: this.geofenceRadiusMeters,
      cooldownMinutes: this.cooldownMinutes,
      cacheSize: this.updateCache.size
    };
  }

  /**
   * Clear the update cache (for testing or maintenance)
   */
  clearCache() {
    this.updateCache.clear();
    logger.info('Location status service cache cleared');
  }

  /**
   * Enable or disable the service
   * @param {boolean} enabled - Whether to enable the service
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.info(`Location status service ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update configuration
   * @param {object} config - Configuration object
   */
  updateConfig(config) {
    if (config.geofenceRadiusMeters !== undefined) {
      this.geofenceRadiusMeters = parseInt(config.geofenceRadiusMeters);
    }
    if (config.cooldownMinutes !== undefined) {
      this.cooldownMinutes = parseInt(config.cooldownMinutes);
    }
    if (config.isEnabled !== undefined) {
      this.isEnabled = config.isEnabled;
    }
    logger.info('Location status service configuration updated:', {
      geofenceRadiusMeters: this.geofenceRadiusMeters,
      cooldownMinutes: this.cooldownMinutes,
      isEnabled: this.isEnabled
    });
  }
}

// Create singleton instance
const locationStatusService = new LocationStatusService();

module.exports = locationStatusService;



