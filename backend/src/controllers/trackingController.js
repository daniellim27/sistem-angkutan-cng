const { DriverLocation, Vehicle, User, DeliveryOrder, DriverProfile } = require('../models');
const { Op } = require('sequelize');
const InovatracksScraper = require('../services/inovatracksScraper');

// Initialize scraper instance
const scraper = new InovatracksScraper();

/**
 * Get current location for a specific vehicle
 */
exports.getVehicleCurrentLocation = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    const location = await DriverLocation.findOne({
      where: { vehicle_id: vehicleId },
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          include: [{
            model: DriverProfile,
            as: 'driverProfile',
            attributes: ['full_name', 'phone']
          }]
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type', 'device_id']
        },
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number', 'status']
        }
      ]
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for this vehicle'
      });
    }

    res.json({
      success: true,
      data: location
    });

  } catch (error) {
    console.error('Error getting vehicle location:', error);
    next(error);
  }
};

/**
 * Get current location for a specific driver
 */
exports.getDriverCurrentLocation = async (req, res, next) => {
  try {
    const { driverId } = req.params;

    const location = await DriverLocation.findOne({
      where: { driver_id: driverId },
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          include: [{
            model: DriverProfile,
            as: 'driverProfile',
            attributes: ['full_name', 'phone']
          }]
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type', 'device_id']
        },
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number', 'status']
        }
      ]
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for this driver'
      });
    }

    res.json({
      success: true,
      data: location
    });

  } catch (error) {
    console.error('Error getting driver location:', error);
    next(error);
  }
};

/**
 * Get all active vehicles with their latest locations
 */
exports.getAllActiveVehicles = async (req, res, next) => {
  try {
    const { timeWindow = 5 } = req.query; // Default 30 minutes
    const timeAgo = new Date(Date.now() - timeWindow * 60 * 1000);

    // Get latest location for each vehicle - only include scraped vehicles with device IDs
    const locations = await DriverLocation.findAll({
      where: {
        timestamp: {
          [Op.gte]: timeAgo
        },
        device_id: {
          [Op.ne]: null // Only include records with device_id
        }
      },
      order: [['vehicle_id', 'ASC'], ['timestamp', 'DESC']],
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          include: [{
            model: DriverProfile,
            as: 'driverProfile',
            attributes: ['full_name', 'phone']
          }]
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type', 'device_id', 'status']
        },
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number', 'status', 'customer_name']
        }
      ]
    });

    // Helper function to extract core device ID (removes location suffix)
    const extractCoreDeviceId = (deviceId) => {
      if (!deviceId) return deviceId;
      
      // Extract the core device ID by device number only
      // Examples:
      // "BE8877ADUCiasem, Kabupaten Subang" -> "BE8877"
      // "BE8877ADUPCiasem, Kabupaten Subang" -> "BE8877"  
      // "BE8877ADUSukasari, Kabupaten Subang" -> "BE8877"
      // This groups all variants of the same physical device
      
      // Pattern: extract device number only (BE + digits)
      const coreMatch = deviceId.match(/^(BE\d+)/);
      if (coreMatch) {
        return coreMatch[1];
      }
      
      // For numeric device IDs (like 130526, 130540, etc.)
      const numericMatch = deviceId.match(/^(\d+)/);
      if (numericMatch) {
        return numericMatch[1];
      }
      
      // Fallback: take everything before first comma or space
      return deviceId.split(/[,\s]/)[0];
    };

    // Group by core device ID to show only unique scraped vehicles
    const latestLocations = [];
    const processedDevices = new Set();

    for (const location of locations) {
      // Only include vehicles that are being actively scraped (have device_id)
      if (location.device_id) {
        const coreDeviceId = extractCoreDeviceId(location.device_id);
        
        if (!processedDevices.has(coreDeviceId)) {
          latestLocations.push(location);
          processedDevices.add(coreDeviceId);
        }
      }
    }

    res.json({
      success: true,
      data: latestLocations,
      meta: {
        total: latestLocations.length,
        timeWindow: `${timeWindow} minutes`,
        lastUpdated: new Date(),
        note: 'Only showing actively scraped vehicles with GPS devices'
      }
    });

  } catch (error) {
    console.error('Error getting active vehicles:', error);
    next(error);
  }
};

/**
 * Get location history for a vehicle
 */
exports.getVehicleHistory = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { 
      startDate,
      endDate,
      limit = 100,
      page = 1
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { vehicle_id: vehicleId };

    if (startDate && endDate) {
      where.timestamp = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const result = await DriverLocation.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          include: [{
            model: DriverProfile,
            as: 'driverProfile',
            attributes: ['full_name']
          }]
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type']
        }
      ]
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit)
      }
    });

  } catch (error) {
    console.error('Error getting vehicle history:', error);
    next(error);
  }
};

/**
 * Get live tracking for a delivery order
 */
exports.getDeliveryTracking = async (req, res, next) => {
  try {
    const { deliveryOrderId } = req.params;

    // Get delivery order details
    const deliveryOrder = await DeliveryOrder.findByPk(deliveryOrderId, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type', 'device_id']
        },
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          include: [{
            model: DriverProfile,
            as: 'driverProfile',
            attributes: ['full_name', 'phone']
          }]
        }
      ]
    });

    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Get latest tracking data
    const latestLocation = await DriverLocation.findOne({
      where: {
        [Op.or]: [
          { delivery_order_id: deliveryOrderId },
          { vehicle_id: deliveryOrder.vehicle_id }
        ]
      },
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        deliveryOrder: {
          id: deliveryOrder.id,
          do_number: deliveryOrder.do_number,
          status: deliveryOrder.status,
          customer_name: deliveryOrder.customer_name,
          load_location: deliveryOrder.load_location,
          unload_location: deliveryOrder.unload_location,
          vehicle: deliveryOrder.vehicle,
          driver: deliveryOrder.driver
        },
        currentLocation: latestLocation,
        route: {
          start: {
            latitude: deliveryOrder.load_latitude,
            longitude: deliveryOrder.load_longitude,
            address: deliveryOrder.load_location
          },
          end: {
            latitude: deliveryOrder.unload_latitude,
            longitude: deliveryOrder.unload_longitude,
            address: deliveryOrder.unload_location
          }
        }
      }
    });

  } catch (error) {
    console.error('Error getting delivery tracking:', error);
    next(error);
  }
};

/**
 * Manual trigger for GPS data scraping
 */
exports.triggerScraping = async (req, res, next) => {
  try {
    const { concurrent } = req.query; // Allow enabling/disabling concurrent mode via query param
    const enableConcurrent = concurrent === 'true' || process.env.ENABLE_CONCURRENT_SCRAPING === 'true';
    const maxTabs = parseInt(process.env.MAX_CONCURRENT_TABS) || 3;
    
    console.log('🔄 Manual GPS scraping triggered');
    console.log(`🚀 Using ${enableConcurrent ? `concurrent mode (${maxTabs} tabs)` : 'sequential mode'}`);
    
    const startTime = Date.now();
    const gpsData = await scraper.runScrapingCycle(enableConcurrent);
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'GPS scraping completed successfully',
      data: {
        recordsScraped: gpsData.length,
        timestamp: new Date(),
        processingMode: enableConcurrent ? 'concurrent' : 'sequential',
        concurrentTabs: enableConcurrent ? maxTabs : 1,
        duration: `${duration}ms`,
        performanceNote: enableConcurrent ? 
          `Processed ${gpsData.length} vehicles concurrently using ${maxTabs} browser tabs` :
          `Processed ${gpsData.length} vehicles sequentially`
      }
    });

  } catch (error) {
    console.error('Error during manual scraping:', error);
    res.status(500).json({
      success: false,
      message: 'GPS scraping failed',
      error: error.message
    });
  }
};

/**
 * Test concurrent scraping with custom parameters
 */
exports.testConcurrentScraping = async (req, res, next) => {
  try {
    const { tabs = 3, delay = 1000, mode = 'concurrent' } = req.query;
    const maxTabs = Math.min(Math.max(parseInt(tabs), 1), 5); // Limit between 1-5 tabs
    const processingDelay = Math.max(parseInt(delay), 500); // Minimum 500ms delay
    const enableConcurrent = mode === 'concurrent';
    
    console.log('🧪 Testing GPS scraping with custom parameters');
    console.log(`🔧 Mode: ${enableConcurrent ? 'concurrent' : 'sequential'}`);
    console.log(`🔧 Max tabs: ${maxTabs}`);
    console.log(`🔧 Processing delay: ${processingDelay}ms`);
    
    // Temporarily override scraper settings
    const originalMaxTabs = scraper.maxConcurrentTabs;
    const originalDelay = scraper.tabProcessingDelay;
    
    scraper.maxConcurrentTabs = maxTabs;
    scraper.tabProcessingDelay = processingDelay;
    
    const startTime = Date.now();
    const gpsData = await scraper.runScrapingCycle(enableConcurrent);
    const duration = Date.now() - startTime;
    
    // Restore original settings
    scraper.maxConcurrentTabs = originalMaxTabs;
    scraper.tabProcessingDelay = originalDelay;
    
    res.json({
      success: true,
      message: 'Test scraping completed successfully',
      testParameters: {
        mode: enableConcurrent ? 'concurrent' : 'sequential',
        maxTabs: maxTabs,
        processingDelay: `${processingDelay}ms`
      },
      results: {
        recordsScraped: gpsData.length,
        duration: `${duration}ms`,
        timestamp: new Date(),
        performanceEstimate: enableConcurrent ? 
          `~${Math.round(duration / maxTabs)}ms per tab (concurrent)` :
          `${duration}ms total (sequential)`
      },
      data: gpsData
    });

  } catch (error) {
    console.error('Error during test scraping:', error);
    res.status(500).json({
      success: false,
      message: 'Test scraping failed',
      error: error.message
    });
  }
};

/**
 * Get tracking statistics
 */
exports.getTrackingStats = async (req, res, next) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Helper function to extract core device ID
    const extractCoreDeviceId = (deviceId) => {
      if (!deviceId) return deviceId;
      
      const coreMatch = deviceId.match(/^(BE\d+)/);
      if (coreMatch) {
        return coreMatch[1];
      }
      
      const numericMatch = deviceId.match(/^(\d+)/);
      if (numericMatch) {
        return numericMatch[1];
      }
      
      return deviceId.split(/[,\s]/)[0];
    };

    // Get active scraped vehicles (unique device IDs in last 30 minutes)
    const activeDeviceResults = await DriverLocation.findAll({
      where: {
        timestamp: { [Op.gte]: fiveMinutesAgo },
        device_id: { [Op.ne]: null }
      },
      attributes: ['device_id'],
      group: ['device_id']
    });

    // Count unique core device IDs for active vehicles
    const activeDeviceIds = new Set();
    activeDeviceResults.forEach(result => {
      const coreDeviceId = extractCoreDeviceId(result.device_id);
      activeDeviceIds.add(coreDeviceId);
    });

    // Get total scraped vehicles (unique device IDs ever recorded)
    const totalDeviceResults = await DriverLocation.findAll({
      where: {
        device_id: { [Op.ne]: null }
      },
      attributes: ['device_id'],
      group: ['device_id']
    });

    // Count unique core device IDs for total vehicles
    const totalDeviceIds = new Set();
    totalDeviceResults.forEach(result => {
      const coreDeviceId = extractCoreDeviceId(result.device_id);
      totalDeviceIds.add(coreDeviceId);
    });

    const [
      recentLocations,
      oldestLocation,
      newestLocation
    ] = await Promise.all([
      DriverLocation.count({
        where: {
          timestamp: { [Op.gte]: twentyFourHoursAgo },
          device_id: { [Op.ne]: null }
        }
      }),
      DriverLocation.findOne({
        where: {
          device_id: { [Op.ne]: null }
        },
        order: [['timestamp', 'ASC']],
        attributes: ['timestamp']
      }),
      DriverLocation.findOne({
        where: {
          device_id: { [Op.ne]: null }
        },
        order: [['timestamp', 'DESC']],
        attributes: ['timestamp']
      })
    ]);

    const activeVehicles = activeDeviceIds.size;
    const totalVehicles = totalDeviceIds.size;

    res.json({
      success: true,
      data: {
        activeVehicles: activeVehicles || 0,
        totalVehicles: totalVehicles || 0,
        activePercentage: totalVehicles > 0 ? ((activeVehicles / totalVehicles) * 100).toFixed(1) : 0,
        recentLocations: recentLocations || 0,
        dataRange: {
          oldest: oldestLocation?.timestamp || null,
          newest: newestLocation?.timestamp || null
        },
        lastUpdated: new Date(),
        note: 'Statistics for actively scraped vehicles only'
      }
    });

  } catch (error) {
    console.error('Error getting tracking stats:', error);
    next(error);
  }
};

/**
 * Update vehicle device mapping
 */
exports.updateVehicleDevice = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    await vehicle.update({ device_id });

    res.json({
      success: true,
      message: 'Vehicle device mapping updated successfully',
      data: vehicle
    });

  } catch (error) {
    console.error('Error updating vehicle device:', error);
    next(error);
  }
}; 

/**
 * Get all GPS locations including unmatched devices
 */
exports.getAllGPSLocations = async (req, res, next) => {
  try {
    const { timeWindow = 30, limit = 50 } = req.query; // Default 30 minutes, max 50 records
    const timeAgo = new Date(Date.now() - timeWindow * 60 * 1000);

    // Get all recent GPS locations including unmatched devices
    const locations = await DriverLocation.findAll({
      where: {
        timestamp: {
          [Op.gte]: timeAgo
        }
      },
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          required: false, // Left join - include records even without driver
          include: [{
            model: DriverProfile,
            as: 'driverProfile',
            attributes: ['full_name', 'phone'],
            required: false
          }]
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type', 'device_id', 'status'],
          required: false // Left join - include records even without vehicle
        },
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number', 'status', 'customer_name'],
          required: false
        }
      ]
    });

    // Group by device_id to get only the latest location per device
    const latestByDevice = {};
    const allDevices = [];
    
    for (const location of locations) {
      const deviceId = location.device_id;
      if (!latestByDevice[deviceId] || 
          new Date(location.timestamp) > new Date(latestByDevice[deviceId].timestamp)) {
        latestByDevice[deviceId] = location;
      }
    }

    // Convert to array and add device info
    Object.values(latestByDevice).forEach(location => {
      allDevices.push({
        ...location.toJSON(),
        deviceInfo: {
          id: location.device_id,
          name: location.device_id,
          isMatched: !!location.vehicle_id,
          lastSeen: location.timestamp
        }
      });
    });

    res.json({
      success: true,
      data: allDevices,
      meta: {
        total: allDevices.length,
        matched: allDevices.filter(d => d.deviceInfo.isMatched).length,
        unmatched: allDevices.filter(d => !d.deviceInfo.isMatched).length,
        timeWindow: `${timeWindow} minutes`,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Error getting all GPS locations:', error);
    next(error);
  }
}; 

/**
 * Get vehicle trails (historical path) for map visualization
 */
exports.getVehicleTrails = async (req, res, next) => {
  try {
    const { hours = 24, vehicleId, deliveryOrderId } = req.query;
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    let whereClause = {
      timestamp: {
        [Op.gte]: timeAgo
      },
      device_id: {
        [Op.ne]: null // Only include records with device_id
      }
    };

    // Filter by specific vehicle if provided
    if (vehicleId) {
      whereClause.vehicle_id = vehicleId;
    }

    // Filter by delivery order if provided
    if (deliveryOrderId) {
      whereClause.delivery_order_id = deliveryOrderId;
    }

    const trails = await DriverLocation.findAll({
      where: whereClause,
      order: [['timestamp', 'ASC']], // Order by timestamp only - not device_id first
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type', 'device_id']
        },
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          include: [{
            model: DriverProfile,
            as: 'driverProfile',
            attributes: ['full_name']
          }]
        }
      ]
    });

    // Helper function to extract core device ID - more precise matching
    const extractCoreDeviceId = (deviceId) => {
      if (!deviceId) return deviceId;
      
      // For BE series: match BE followed by digits (BE8879)
      const beMatch = deviceId.match(/^(BE\d+)/);
      if (beMatch) {
        return beMatch[1];
      }
      
      // For pure numeric: match leading digits
      const numericMatch = deviceId.match(/^(\d+)/);
      if (numericMatch) {
        return numericMatch[1];
      }
      
      // Default: take first part before comma or space
      return deviceId.split(/[,\s]/)[0];
    };

    // Helper function to calculate distance between two GPS points
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c; // Distance in kilometers
    };

    // Helper function to validate GPS point
    const isValidGPSPoint = (point, previousPoint = null) => {
      const lat = parseFloat(point.latitude);
      const lng = parseFloat(point.longitude);
      
      // Basic coordinate validation
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return false;
      }
      
      // Check for null island (0,0) and other obvious errors
      if (lat === 0 && lng === 0) {
        return false;
      }
      
      // If we have a previous point, check for unrealistic jumps
      if (previousPoint) {
        const distance = calculateDistance(
          parseFloat(previousPoint.latitude), 
          parseFloat(previousPoint.longitude), 
          lat, 
          lng
        );
        
        // Calculate time difference in hours
        const timeDiff = (new Date(point.timestamp) - new Date(previousPoint.timestamp)) / (1000 * 60 * 60);
        
        // If distance > 100km in < 1 hour, likely GPS error (unrealistic speed > 100km/h for trucks)
        if (timeDiff > 0 && distance / timeDiff > 150) {
          console.warn(`Skipping GPS point for unrealistic speed: ${distance.toFixed(2)}km in ${timeDiff.toFixed(2)}h = ${(distance/timeDiff).toFixed(2)}km/h`);
          return false;
        }
      }
      
      return true;
    };

    // Group trails by core device ID
    const groupedTrails = {};
    
    trails.forEach(location => {
      const coreDeviceId = extractCoreDeviceId(location.device_id);
      
      if (!groupedTrails[coreDeviceId]) {
        groupedTrails[coreDeviceId] = {
          deviceId: coreDeviceId,
          originalDeviceId: location.device_id,
          vehicle: location.vehicle,
          driver: location.driver,
          points: [],
          allDeviceIds: new Set() // Track all device ID variations
        };
      }
      
      // Track all device ID variations for this core device
      groupedTrails[coreDeviceId].allDeviceIds.add(location.device_id);
      
      const gpsPoint = {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        timestamp: location.timestamp,
        speed: location.speed ? parseFloat(location.speed) : 0,
        heading: location.heading ? parseFloat(location.heading) : null,
        status: location.status,
        originalDeviceId: location.device_id
      };
      
      // Validate GPS point before adding
      const previousPoint = groupedTrails[coreDeviceId].points.length > 0 
        ? groupedTrails[coreDeviceId].points[groupedTrails[coreDeviceId].points.length - 1] 
        : null;
      
      if (isValidGPSPoint(gpsPoint, previousPoint)) {
        groupedTrails[coreDeviceId].points.push(gpsPoint);
      }
    });

    // Convert to array and add trail metadata - filter out trails with insufficient points
    const trailsArray = Object.values(groupedTrails)
      .filter(trail => trail.points.length >= 2) // Only show trails with at least 2 valid points
      .map((trail, index) => ({
        deviceId: trail.deviceId,
        originalDeviceId: trail.originalDeviceId,
        vehicle: trail.vehicle,
        driver: trail.driver,
        points: trail.points,
        pointCount: trail.points.length,
        startTime: trail.points[0]?.timestamp,
        endTime: trail.points[trail.points.length - 1]?.timestamp,
        colorIndex: index,
        deviceVariations: Array.from(trail.allDeviceIds), // Show all device ID variations
        // Calculate total distance
        totalDistance: trail.points.reduce((total, point, i) => {
          if (i === 0) return 0;
          const prev = trail.points[i - 1];
          return total + calculateDistance(prev.latitude, prev.longitude, point.latitude, point.longitude);
        }, 0)
      }));

    res.json({
      success: true,
      data: trailsArray,
      meta: {
        totalTrails: trailsArray.length,
        totalPoints: trails.length,
        validPoints: trailsArray.reduce((sum, t) => sum + t.pointCount, 0),
        timeRange: `${hours} hours`,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error getting vehicle trails:', error);
    next(error);
  }
}; 