const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// All tracking routes require authentication - Apply verifyToken first, then checkRole
router.use(verifyToken);
router.use(checkRole(['admin', 'owner', 'driver']));

/**
 * GET /api/tracking/vehicles/active
 * Get all active vehicles with their latest locations
 */
router.get('/vehicles/active', trackingController.getAllActiveVehicles);

/**
 * GET /api/tracking/locations/all
 * Get all GPS locations including unmatched devices
 */
router.get('/locations/all', trackingController.getAllGPSLocations);

/**
 * GET /api/tracking/vehicle/:vehicleId/current
 * Get current location for a specific vehicle
 */
router.get('/vehicle/:vehicleId/current', trackingController.getVehicleCurrentLocation);

/**
 * GET /api/tracking/vehicle/:vehicleId/history
 * Get location history for a specific vehicle
 */
router.get('/vehicle/:vehicleId/history', trackingController.getVehicleHistory);

/**
 * GET /api/tracking/driver/:driverId/current
 * Get current location for a specific driver
 */
router.get('/driver/:driverId/current', trackingController.getDriverCurrentLocation);

/**
 * GET /api/tracking/delivery/:deliveryOrderId
 * Get live tracking for a delivery order
 */
router.get('/delivery/:deliveryOrderId', trackingController.getDeliveryTracking);

/**
 * GET /api/tracking/trails
 * Get vehicle trails (historical paths) for map visualization
 * Query params: ?hours=24&vehicleId=123&deliveryOrderId=456
 */
router.get('/trails', trackingController.getVehicleTrails);

/**
 * GET /api/tracking/stats
 * Get tracking statistics and system status
 */
router.get('/stats', trackingController.getTrackingStats);

/**
 * POST /api/tracking/scrape
 * Manually trigger GPS data scraping from Inovatracks
 * Admin/Owner only
 */
router.post('/scrape', checkRole(['admin', 'owner']), trackingController.triggerScraping);

/**
 * POST /api/tracking/test-concurrent
 * Test concurrent scraping with custom parameters
 * Query params: ?tabs=3&delay=1000&mode=concurrent
 * Admin/Owner only
 */
router.post('/test-concurrent', checkRole(['admin', 'owner']), trackingController.testConcurrentScraping);

/**
 * PUT /api/tracking/vehicle/:vehicleId/device
 * Update vehicle device mapping
 * Admin/Owner only
 */
router.put('/vehicle/:vehicleId/device', checkRole(['admin', 'owner']), trackingController.updateVehicleDevice);

module.exports = router; 