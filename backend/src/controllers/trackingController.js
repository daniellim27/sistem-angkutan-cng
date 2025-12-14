const { DriverLocation, Vehicle, User, DeliveryOrder, DriverProfile, DepositGroup, Customer } = require('../models');
const { Op } = require('sequelize');
const InovatracksScraper = require('../services/inovatracksScraper');
const DistanceCalculationService = require('../services/distanceCalculationService');
const DistanceTrackingService = require('../services/distanceTrackingService');
const locationStatusService = require('../services/locationStatusService');

// Initialize scraper instance
const scraper = new InovatracksScraper();

/**
 * Helper function to calculate distance between two GPS points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
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
 * Check if driver is near a delivery order's target location
 * Used to disable buttons in mobile app when driver is not near location
 */
exports.checkProximityForDeliveryOrder = async (req, res, next) => {
  try {
    const { deliveryOrderId } = req.params;
    const driverId = req.user.id;
    const locationStatusService = require('../services/locationStatusService');
    const { DeliveryOrder, DepositGroup, Customer } = require('../models');

    // Get delivery order
    const deliveryOrder = await DeliveryOrder.findOne({
      where: { id: deliveryOrderId, driver_id: driverId }
    });

    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Get latest GPS location
    let latestLocation = null;
    
    if (deliveryOrder.vehicle_id) {
      latestLocation = await DriverLocation.findOne({
        where: { vehicle_id: deliveryOrder.vehicle_id },
        order: [['timestamp', 'DESC']],
        limit: 1
      });
    }
    
    if (!latestLocation && driverId) {
      latestLocation = await DriverLocation.findOne({
        where: { driver_id: driverId },
        order: [['timestamp', 'DESC']],
        limit: 1
      });
    }

    if (!latestLocation || !latestLocation.latitude || !latestLocation.longitude) {
      return res.json({
        success: true,
        isNear: false,
        canProceed: true, // Allow if GPS not available
        message: 'GPS location not available'
      });
    }

    const currentLat = parseFloat(latestLocation.latitude);
    const currentLng = parseFloat(latestLocation.longitude);
    let isNear = false;
    let distance = null;
    let targetName = null;

    // Check proximity based on status
    if (deliveryOrder.status === 'at_spbu') {
      // Check if near SPBU
      let spbuLat, spbuLng;
      
      if (deliveryOrder.load_latitude && deliveryOrder.load_longitude) {
        spbuLat = parseFloat(deliveryOrder.load_latitude);
        spbuLng = parseFloat(deliveryOrder.load_longitude);
        targetName = deliveryOrder.load_location || 'SPBU';
      } else if (deliveryOrder.load_location) {
        const depositGroup = await DepositGroup.findOne({
          where: {
            spbg_location: { [Op.iLike]: `%${deliveryOrder.load_location}%` },
            latitude: { [Op.not]: null },
            longitude: { [Op.not]: null },
            status: { [Op.in]: ['active', 'fulfilled', 'overdrawn', 'pending_selisih'] }
          },
          order: [['created_at', 'DESC']]
        });
        
        if (depositGroup && depositGroup.latitude && depositGroup.longitude) {
          spbuLat = parseFloat(depositGroup.latitude);
          spbuLng = parseFloat(depositGroup.longitude);
          targetName = depositGroup.spbg_name || depositGroup.spbg_location || deliveryOrder.load_location;
        }
      }

      if (spbuLat && spbuLng && !isNaN(spbuLat) && !isNaN(spbuLng)) {
        const result = locationStatusService.isNearLocation(currentLat, currentLng, spbuLat, spbuLng);
        isNear = result.isNear;
        distance = result.distance;
      } else {
        // Coordinates not available - allow
        return res.json({
          success: true,
          isNear: false,
          canProceed: true,
          message: 'SPBU coordinates not available'
        });
      }
    } else if (deliveryOrder.status === 'otw_to_unload_location') {
      // Check if near customer location
      const allLocations = await locationStatusService.getAllCustomerLocations(deliveryOrder);
      
      if (allLocations.length > 0) {
        const currentLocationIndex = await locationStatusService.getCurrentLocationIndex(deliveryOrder);
        const targetLocation = allLocations[currentLocationIndex];

        if (targetLocation && targetLocation.latitude && targetLocation.longitude) {
          const result = locationStatusService.isNearLocation(
            currentLat,
            currentLng,
            targetLocation.latitude,
            targetLocation.longitude
          );
          isNear = result.isNear;
          distance = result.distance;
          targetName = targetLocation.name;
        } else {
          // Coordinates not available - allow
          return res.json({
            success: true,
            isNear: false,
            canProceed: true,
            message: 'Customer location coordinates not available'
          });
        }
      } else {
        // No customer locations - allow
        return res.json({
          success: true,
          isNear: false,
          canProceed: true,
          message: 'No customer locations found'
        });
      }
    } else {
      // For other statuses, don't check proximity
      return res.json({
        success: true,
        isNear: true,
        canProceed: true,
        message: 'Proximity check not required for this status'
      });
    }

    res.json({
      success: true,
      isNear,
      canProceed: isNear, // Can only proceed if near
      distance: distance ? Math.round(distance) : null,
      distanceKm: distance ? (distance / 1000).toFixed(2) : null,
      targetName,
      message: isNear 
        ? `Anda berada di dekat ${targetName || 'lokasi target'}`
        : `Anda belum berada di dekat ${targetName || 'lokasi target'}${distance ? ` (${(distance / 1000).toFixed(2)} km)` : ''}`
    });

  } catch (error) {
    console.error('Error checking proximity:', error);
    next(error);
  }
};

/**
 * Get all active vehicles with their latest locations
 * Scraped vehicles (with device_id): 5 minutes time window
 * Test vehicles (with vehicle_id but no device_id): 30 minutes time window
 */
exports.getAllActiveVehicles = async (req, res, next) => {
  try {
    const { timeWindow } = req.query; // Allow override, but defaults differ by vehicle type
    
    // Different time windows for different vehicle types
    const SCRAPED_VEHICLE_WINDOW = 5; // 5 minutes for Inovatracks scraped vehicles
    const TEST_VEHICLE_WINDOW = 30; // 30 minutes for test vehicles
    
    const scrapedTimeAgo = new Date(Date.now() - SCRAPED_VEHICLE_WINDOW * 60 * 1000);
    const testTimeAgo = new Date(Date.now() - TEST_VEHICLE_WINDOW * 60 * 1000);

    console.log(`🔍 Fetching active vehicles:`);
    console.log(`   Scraped vehicles (with device_id): ${SCRAPED_VEHICLE_WINDOW} minutes`);
    console.log(`   Test vehicles (vehicle_id only): ${TEST_VEHICLE_WINDOW} minutes`);

    // Get scraped vehicles (with device_id, but NOT test devices) - 5 minutes window
    // Test devices are identified by DEV- or TEST- prefix
    const scrapedLocations = await DriverLocation.findAll({
      where: {
        [Op.and]: [
          {
            timestamp: {
              [Op.gte]: scrapedTimeAgo
            }
          },
          {
            device_id: {
              [Op.ne]: null
            }
          },
          {
            [Op.not]: {
              [Op.or]: [
                {
                  device_id: {
                    [Op.like]: 'DEV-%'
                  }
                },
                {
                  device_id: {
                    [Op.like]: 'TEST-%'
                  }
                }
              ]
            }
          }
        ]
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

    // Get test vehicles - 30 minutes window
    // Test vehicles are: (1) vehicles with DEV- or TEST- device_id, OR (2) vehicles with vehicle_id but no device_id
    const testLocations = await DriverLocation.findAll({
      where: {
        timestamp: {
          [Op.gte]: testTimeAgo
        },
        [Op.or]: [
          {
            device_id: {
              [Op.like]: 'DEV-%' // Test devices with DEV- prefix
            }
          },
          {
            device_id: {
              [Op.like]: 'TEST-%' // Test devices with TEST- prefix
            }
          },
          {
            device_id: null, // No device_id but has vehicle_id
            vehicle_id: {
              [Op.ne]: null
            }
          }
        ]
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

    // Combine both result sets
    const locations = [...scrapedLocations, ...testLocations];

    // Helper function to extract core device ID (removes location suffix)
    const extractCoreDeviceId = (deviceId) => {
      if (!deviceId) return deviceId;
      
      // Extract the core device ID by device number only
      // Examples:
      // "BE8877ADUCiasem, Kabupaten Subang" -> "BE8877"
      // "BE8877ADUPCiasem, Kabupaten Subang" -> "BE8877"  
      // "BE8877ADUSukasari, Kabupaten Subang" -> "BE8877"
      // "DEV-TEST-DEVICE-1" -> "DEV-TEST-DEVICE-1" (test devices)
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
      
      // For test device IDs (like DEV-TEST-DEVICE-1), keep as-is
      if (deviceId.startsWith('DEV-') || deviceId.startsWith('TEST-')) {
        return deviceId;
      }
      
      // Fallback: take everything before first comma or space
      return deviceId.split(/[,\s]/)[0];
    };

    // Group by core device ID or vehicle_id to show only unique vehicles
    const latestLocations = [];
    const processedDevices = new Set();
    const processedVehicles = new Set();

    for (const location of locations) {
      // Include vehicles with device_id (scraped) or vehicle_id (manual/test)
      if (location.device_id) {
        const coreDeviceId = extractCoreDeviceId(location.device_id);
        
        if (!processedDevices.has(coreDeviceId)) {
          latestLocations.push(location);
          processedDevices.add(coreDeviceId);
          // Also track vehicle_id to avoid duplicates
          if (location.vehicle_id) {
            processedVehicles.add(location.vehicle_id);
          }
        }
      } else if (location.vehicle_id) {
        // Include vehicles without device_id but with vehicle_id (test vehicles, manual entries)
        // Only add if not already processed via device_id
        if (!processedVehicles.has(location.vehicle_id)) {
          latestLocations.push(location);
          processedVehicles.add(location.vehicle_id);
          console.log(`✅ Including vehicle without device_id: vehicle_id=${location.vehicle_id}, license_plate=${location.vehicle?.license_plate || 'N/A'}`);
        }
      }
    }

    console.log(`📊 Found ${latestLocations.length} active vehicles (${processedDevices.size} scraped with device_id, ${processedVehicles.size} test vehicles without device_id)`);

    res.json({
      success: true,
      data: latestLocations,
      meta: {
        total: latestLocations.length,
        scrapedVehicles: processedDevices.size,
        testVehicles: processedVehicles.size,
        timeWindows: {
          scraped: `${SCRAPED_VEHICLE_WINDOW} minutes`,
          test: `${TEST_VEHICLE_WINDOW} minutes`
        },
        lastUpdated: new Date(),
        note: 'Scraped vehicles: 5min window, Test vehicles: 30min window'
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
 * Get route history for a specific vehicle within a date range
 */
exports.getVehicleRouteHistory = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { 
      startDate, 
      endDate, 
      limit = 1000,
      deviceId 
    } = req.query;

    console.log(`📍 Fetching route history for vehicle ${vehicleId || 'device: ' + deviceId}`);

    // Build where clause
    let whereClause = {};
    
    if (vehicleId && vehicleId !== 'null') {
      whereClause.vehicle_id = vehicleId;
    } else if (deviceId) {
      whereClause.device_id = deviceId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either vehicleId or deviceId is required'
      });
    }

    // Add date filtering if provided
    if (startDate && endDate) {
      whereClause.timestamp = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.timestamp = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.timestamp = {
        [Op.lte]: new Date(endDate)
      };
    }

    const routeHistory = await DriverLocation.findAll({
      where: whereClause,
      order: [['timestamp', 'ASC']], // Chronological order for route plotting
      limit: parseInt(limit),
      attributes: [
        'id', 
        'latitude', 
        'longitude', 
        'timestamp', 
        'speed', 
        'device_id',
        'status'
      ],
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type'],
          required: false
        }
      ]
    });

    // Calculate route statistics
    const routeStats = {
      totalPoints: routeHistory.length,
      startTime: routeHistory.length > 0 ? routeHistory[0].timestamp : null,
      endTime: routeHistory.length > 0 ? routeHistory[routeHistory.length - 1].timestamp : null,
      vehicleInfo: routeHistory.length > 0 ? {
        device_id: routeHistory[0].device_id,
        license_plate: routeHistory[0].vehicle?.license_plate || 'Unknown',
        vehicle_type: routeHistory[0].vehicle?.type || 'Unknown'
      } : null
    };

    // Calculate total distance if we have multiple points
    let totalDistance = 0;
    if (routeHistory.length > 1) {
      for (let i = 1; i < routeHistory.length; i++) {
        const prev = routeHistory[i - 1];
        const curr = routeHistory[i];
        totalDistance += calculateDistance(
          parseFloat(prev.latitude),
          parseFloat(prev.longitude),
          parseFloat(curr.latitude),
          parseFloat(curr.longitude)
        );
      }
    }
    routeStats.totalDistance = Math.round(totalDistance * 100) / 100; // Round to 2 decimal places

    console.log(`✅ Found ${routeHistory.length} route points for vehicle`);

    res.json({
      success: true,
      data: {
        route: routeHistory,
        stats: routeStats
      }
    });

  } catch (error) {
    console.error('Error getting vehicle route history:', error);
    next(error);
  }
};

/**
 * Get list of vehicles that have GPS tracking data
 */
exports.getVehiclesWithGPSData = async (req, res, next) => {
  try {
    const { timeWindow = 168 } = req.query; // Default 7 days (168 hours)
    const timeAgo = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

    console.log(`🔍 Fetching vehicles with GPS data for time window: ${timeWindow} hours`);
    console.log(`📅 Time ago: ${timeAgo.toISOString()}`);

    // Get vehicles with GPS data in the specified time window
    const vehiclesWithGPS = await DriverLocation.findAll({
      where: {
        timestamp: {
          [Op.gte]: timeAgo
        }
      },
      attributes: [
        'vehicle_id',
        'device_id',
        [require('sequelize').fn('MAX', require('sequelize').col('DriverLocation.timestamp')), 'last_update'],
        [require('sequelize').fn('COUNT', require('sequelize').col('DriverLocation.id')), 'total_points']
      ],
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type', 'status'],
          required: false
        }
      ],
      group: ['DriverLocation.vehicle_id', 'DriverLocation.device_id', 'vehicle.id'],
      order: [[require('sequelize').fn('MAX', require('sequelize').col('DriverLocation.timestamp')), 'DESC']]
    });

    console.log(`📊 Raw query result: ${vehiclesWithGPS.length} records`);

    // Format the response
    const formattedVehicles = vehiclesWithGPS.map(item => ({
      vehicle_id: item.vehicle_id,
      device_id: item.device_id,
      display_name: item.vehicle 
        ? `${item.vehicle.license_plate} (${item.vehicle.type})`
        : `GPS Device: ${item.device_id}`,
      license_plate: item.vehicle?.license_plate || null,
      vehicle_type: item.vehicle?.type || 'Unknown',
      vehicle_status: item.vehicle?.status || 'unknown',
      last_update: item.dataValues.last_update,
      total_points: parseInt(item.dataValues.total_points),
      has_vehicle_record: !!item.vehicle_id
    }));

    console.log(`📊 Found ${formattedVehicles.length} vehicles with GPS data`);

    res.json({
      success: true,
      data: formattedVehicles,
      meta: {
        timeWindow: `${timeWindow} hours`,
        totalVehicles: formattedVehicles.length
      }
    });

  } catch (error) {
    console.error('Error getting vehicles with GPS data:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicles with GPS data',
      error: error.message
    });
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

    // calculateDistance function is now defined at the top of the file as a shared helper

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

/**
 * Calculate distance compliance for a delivery order
 * POST /api/tracking/delivery/:deliveryOrderId/calculate-distance-compliance
 */
exports.calculateDistanceCompliance = async (req, res, next) => {
  try {
    const { deliveryOrderId } = req.params;
    const { tolerancePercentage = 31.0, plannedDistance } = req.body;

    const result = await DistanceCalculationService.calculateDistanceCompliance(
      deliveryOrderId, 
      tolerancePercentage,
      plannedDistance
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Distance compliance calculated successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to calculate distance compliance',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error calculating distance compliance:', error);
    next(error);
  }
};

/**
 * Get distance compliance status for a delivery order
 * GET /api/tracking/delivery/:deliveryOrderId/distance-compliance
 */
exports.getDistanceComplianceStatus = async (req, res, next) => {
  try {
    const { deliveryOrderId } = req.params;

    const result = await DistanceCalculationService.getDistanceComplianceStatus(deliveryOrderId);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get distance compliance status',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error getting distance compliance status:', error);
    next(error);
  }
};

/**
 * Get real-time distance tracking for a delivery order
 * GET /api/tracking/delivery/:deliveryOrderId/distance-tracking
 */
exports.getDistanceTracking = async (req, res, next) => {
  try {
    const { deliveryOrderId } = req.params;

    // Get delivery order with location data
    const deliveryOrder = await DeliveryOrder.findByPk(deliveryOrderId, {
      attributes: [
        'id',
        'load_latitude',
        'load_longitude',
        'unload_latitude',
        'unload_longitude',
        'additional_unload_locations',
        'planned_route_distance_km',
        'actual_traveled_distance_km',
        'distance_tolerance_percentage',
        'distance_compliance_status'
      ]
    });

    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Get recent GPS tracking points (last 24 hours)
    const gpsPoints = await DriverLocation.findAll({
      where: {
        delivery_order_id: deliveryOrderId,
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null },
        timestamp: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      order: [['timestamp', 'ASC']],
      attributes: ['latitude', 'longitude', 'timestamp', 'speed']
    });

    // Calculate current actual distance
    const currentActualDistance = DistanceCalculationService.calculateTotalTraveledDistance(gpsPoints);

    // Calculate planned distance if not already stored
    let plannedDistance = deliveryOrder.planned_route_distance_km;
    if (!plannedDistance) {
      plannedDistance = DistanceCalculationService.calculatePlannedRouteDistance(deliveryOrder);
    }

    // Get current compliance status
    const tolerancePercentage = deliveryOrder.distance_tolerance_percentage || 31.0;
    const comparison = DistanceCalculationService.compareDistances(
      currentActualDistance, 
      plannedDistance, 
      tolerancePercentage
    );

    res.json({
      success: true,
      data: {
        deliveryOrderId,
        plannedDistance,
        currentActualDistance,
        tolerancePercentage,
        complianceStatus: comparison,
        gpsPointsCount: gpsPoints.length,
        lastUpdate: gpsPoints.length > 0 ? gpsPoints[gpsPoints.length - 1].timestamp : null
      }
    });

  } catch (error) {
    console.error('Error getting distance tracking:', error);
    next(error);
  }
};

/**
 * Get active delivery orders distance compliance summary
 * GET /api/tracking/distance-compliance/summary
 */
exports.getDistanceComplianceSummary = async (req, res, next) => {
  try {
    const result = await DistanceTrackingService.getActiveDeliveryOrdersCompliance();

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get distance compliance summary',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error getting distance compliance summary:', error);
    next(error);
  }
};

/**
 * Get distance compliance alerts for drivers exceeding tolerance
 * GET /api/tracking/distance-compliance/alerts
 */
exports.getDistanceComplianceAlerts = async (req, res, next) => {
  try {
    const result = await DistanceTrackingService.logDistanceComplianceAlerts();

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to get distance compliance alerts',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error getting distance compliance alerts:', error);
    next(error);
  }
};

/**
 * Batch process distance compliance for multiple delivery orders
 * POST /api/tracking/distance-compliance/batch-process
 */
exports.batchProcessDistanceCompliance = async (req, res, next) => {
  try {
    const { deliveryOrderIds, tolerancePercentage = 31.0 } = req.body;

    if (!deliveryOrderIds || !Array.isArray(deliveryOrderIds)) {
      return res.status(400).json({
        success: false,
        message: 'deliveryOrderIds array is required'
      });
    }

    const result = await DistanceTrackingService.batchProcessDistanceCompliance(
      deliveryOrderIds,
      tolerancePercentage
    );

    res.json({
      success: true,
      message: 'Batch distance compliance processing completed',
      data: result.data
    });

  } catch (error) {
    console.error('Error batch processing distance compliance:', error);
    next(error);
  }
};

// ============================================================
// AUTO STATUS UPDATE ENDPOINTS
// ============================================================

/**
 * Get auto status update service statistics
 * GET /api/tracking/auto-status/stats
 */
exports.getAutoStatusStats = async (req, res, next) => {
  try {
    const stats = locationStatusService.getStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting auto status stats:', error);
    next(error);
  }
};

/**
 * Update auto status service configuration
 * PUT /api/tracking/auto-status/config
 */
exports.updateAutoStatusConfig = async (req, res, next) => {
  try {
    const { geofenceRadiusMeters, cooldownMinutes, isEnabled } = req.body;
    
    locationStatusService.updateConfig({
      geofenceRadiusMeters,
      cooldownMinutes,
      isEnabled
    });
    
    res.json({
      success: true,
      message: 'Auto status configuration updated',
      data: locationStatusService.getStats()
    });

  } catch (error) {
    console.error('Error updating auto status config:', error);
    next(error);
  }
};

/**
 * Enable or disable auto status updates
 * PUT /api/tracking/auto-status/toggle
 */
exports.toggleAutoStatus = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enabled must be a boolean'
      });
    }
    
    locationStatusService.setEnabled(enabled);
    
    res.json({
      success: true,
      message: `Auto status updates ${enabled ? 'enabled' : 'disabled'}`,
      data: { isEnabled: enabled }
    });

  } catch (error) {
    console.error('Error toggling auto status:', error);
    next(error);
  }
};

/**
 * Manually trigger status check for a specific vehicle
 * POST /api/tracking/auto-status/check-vehicle/:vehicleId
 */
exports.checkVehicleStatus = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    
    // Get latest GPS data for this vehicle
    const latestLocation = await DriverLocation.findOne({
      where: { vehicle_id: vehicleId },
      order: [['timestamp', 'DESC']]
    });
    
    if (!latestLocation) {
      return res.status(404).json({
        success: false,
        message: 'No GPS data found for this vehicle'
      });
    }
    
    const result = await locationStatusService.checkAndUpdateStatusForLocation({
      vehicle_id: vehicleId,
      latitude: latestLocation.latitude,
      longitude: latestLocation.longitude,
      device_id: latestLocation.device_id
    });
    
    res.json({
      success: true,
      message: 'Vehicle status check completed',
      data: result
    });

  } catch (error) {
    console.error('Error checking vehicle status:', error);
    next(error);
  }
};

/**
 * Clear auto status update cache
 * POST /api/tracking/auto-status/clear-cache
 */
exports.clearAutoStatusCache = async (req, res, next) => {
  try {
    locationStatusService.clearCache();
    
    res.json({
      success: true,
      message: 'Auto status cache cleared'
    });

  } catch (error) {
    console.error('Error clearing auto status cache:', error);
    next(error);
  }
};

/**
 * Test geofence detection for a specific delivery order
 * POST /api/tracking/auto-status/test-geofence
 */
exports.testGeofence = async (req, res, next) => {
  try {
    const { deliveryOrderId, latitude, longitude } = req.body;
    
    if (!deliveryOrderId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'deliveryOrderId, latitude, and longitude are required'
      });
    }
    
    const deliveryOrder = await DeliveryOrder.findByPk(deliveryOrderId);
    
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }
    
    const currentLat = parseFloat(latitude);
    const currentLng = parseFloat(longitude);
    
    // Test against SPBU location
    let spbuResult = null;
    if (deliveryOrder.load_latitude && deliveryOrder.load_longitude) {
      const spbuDistance = locationStatusService.isNearLocation(
        currentLat,
        currentLng,
        parseFloat(deliveryOrder.load_latitude),
        parseFloat(deliveryOrder.load_longitude)
      );
      spbuResult = {
        location: deliveryOrder.load_location || 'SPBU',
        ...spbuDistance
      };
    }
    
    // Test against all customer locations
    const customerLocations = locationStatusService.getAllCustomerLocations(deliveryOrder);
    const customerResults = customerLocations.map(loc => {
      const result = locationStatusService.isNearLocation(
        currentLat,
        currentLng,
        loc.latitude,
        loc.longitude
      );
      return {
        index: loc.index,
        location: loc.name,
        ...result
      };
    });
    
    res.json({
      success: true,
      data: {
        deliveryOrderId,
        currentStatus: deliveryOrder.status,
        testCoordinates: { latitude: currentLat, longitude: currentLng },
        geofenceRadius: locationStatusService.geofenceRadiusMeters,
        spbuLocation: spbuResult,
        customerLocations: customerResults,
        currentLocationIndex: locationStatusService.getCurrentLocationIndex(deliveryOrder)
      }
    });

  } catch (error) {
    console.error('Error testing geofence:', error);
    next(error);
  }
};

/**
 * Check proximity to SPBG for Ghost Mode (200m threshold)
 * Uses vehicle's GPS location from Inovatracks (scraped), not phone location
 * GET /api/tracking/proximity/spbg
 */
exports.checkSPBGProximity = async (req, res, next) => {
  try {
    const driverId = req.user?.id;
    
    // Get vehicle's current location from Inovatracks scraped data (DriverLocation table)
    // This is the vehicle's GPS location, not the phone's location
    let vehicleLocation = null;
    
    // First, try to find vehicle by driver_id
    const vehicle = await Vehicle.findOne({
      where: { driver_id: driverId }
    });
    
    if (vehicle) {
      // Get latest location for this vehicle (scraped from Inovatracks)
      vehicleLocation = await DriverLocation.findOne({
        where: { vehicle_id: vehicle.id },
        order: [['timestamp', 'DESC']]
      });
    }
    
    // Fallback: if no vehicle found, try to get location by driver_id directly
    if (!vehicleLocation && driverId) {
      vehicleLocation = await DriverLocation.findOne({
        where: { driver_id: driverId },
        order: [['timestamp', 'DESC']]
      });
    }
    
    if (!vehicleLocation || !vehicleLocation.latitude || !vehicleLocation.longitude) {
      console.log('⚠️ No vehicle location found for driver:', driverId, 'Vehicle:', vehicle?.id);
      return res.status(404).json({
        success: false,
        message: 'No vehicle GPS location found. Vehicle location is scraped from Inovatracks every 5 minutes.',
        data: {
          isNear: false,
          distance: null,
          nearestSpbg: null,
          threshold: 200,
          vehicleLocation: null,
          debug: {
            driverId,
            vehicleId: vehicle?.id,
            vehicleFound: !!vehicle,
            locationFound: !!vehicleLocation
          }
        }
      });
    }
    
    const lat = parseFloat(vehicleLocation.latitude);
    const lng = parseFloat(vehicleLocation.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle GPS coordinates'
      });
    }

    // Use idleVehicleDetectionService with 200m threshold
    const idleVehicleDetectionService = require('../services/idleVehicleDetectionService');
    
    // Temporarily override radius for this check
    const originalRadius = idleVehicleDetectionService.spbgRadiusMeters;
    idleVehicleDetectionService.spbgRadiusMeters = 200; // 200m for Ghost Mode
    
    const result = await idleVehicleDetectionService.checkNearSPBG(lat, lng);
    
    // Restore original radius
    idleVehicleDetectionService.spbgRadiusMeters = originalRadius;

    console.log(`📍 Proximity check - Vehicle: ${lat}, ${lng}, Distance: ${result.distance}m, Near: ${result.isNear}, SPBG: ${result.nearestSpbg?.spbg_location || 'N/A'}`);

    res.json({
      success: true,
      data: {
        isNear: result.isNear,
        distance: result.distance,
        nearestSpbg: result.nearestSpbg,
        threshold: 200, // meters
        vehicleLocation: {
          latitude: lat,
          longitude: lng,
          timestamp: vehicleLocation.timestamp
        }
      }
    });

  } catch (error) {
    console.error('Error checking SPBG proximity:', error);
    next(error);
  }
}; 