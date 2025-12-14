const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// All tracking routes require authentication - Apply verifyToken first, then checkRole
// Comment out temporarily for debugging CORS issues
// router.use(verifyToken);
// router.use(checkRole(['admin', 'owner', 'driver']));

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
 * GET /api/tracking/vehicle/:vehicleId/route-history
 * Get route history for a specific vehicle within a date range
 */
router.get('/vehicle/:vehicleId/route-history', trackingController.getVehicleRouteHistory);

/**
 * GET /api/tracking/vehicles-with-gps
 * Get list of vehicles that have GPS tracking data
 */
router.get('/vehicles-with-gps', trackingController.getVehiclesWithGPSData);

/**
 * GET /api/tracking/driver/:driverId/current
 * Get current location for a specific driver
 */
router.get('/driver/:driverId/current', trackingController.getDriverCurrentLocation);

/**
 * GET /api/tracking/delivery/:deliveryOrderId/check-proximity
 * Check if driver is near delivery order's target location
 */
router.get(
  '/delivery/:deliveryOrderId/check-proximity',
  checkRole(['driver']),
  trackingController.checkProximityForDeliveryOrder
);

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

/**
 * POST /api/tracking/delivery/:deliveryOrderId/calculate-distance-compliance
 * Calculate distance compliance for a delivery order
 * Admin/Owner only
 */
router.post('/delivery/:deliveryOrderId/calculate-distance-compliance', checkRole(['admin', 'owner']), trackingController.calculateDistanceCompliance);

/**
 * GET /api/tracking/delivery/:deliveryOrderId/distance-compliance
 * Get distance compliance status for a delivery order
 */
router.get('/delivery/:deliveryOrderId/distance-compliance', trackingController.getDistanceComplianceStatus);

/**
 * GET /api/tracking/delivery/:deliveryOrderId/distance-tracking
 * Get real-time distance tracking for a delivery order
 */
router.get('/delivery/:deliveryOrderId/distance-tracking', trackingController.getDistanceTracking);

/**
 * GET /api/tracking/distance-compliance/summary
 * Get active delivery orders distance compliance summary
 */
router.get('/distance-compliance/summary', trackingController.getDistanceComplianceSummary);

/**
 * GET /api/tracking/distance-compliance/alerts
 * Get distance compliance alerts for drivers exceeding tolerance
 */
router.get('/distance-compliance/alerts', trackingController.getDistanceComplianceAlerts);

/**
 * POST /api/tracking/distance-compliance/batch-process
 * Batch process distance compliance for multiple delivery orders
 * Admin/Owner only
 */
router.post('/distance-compliance/batch-process', checkRole(['admin', 'owner']), trackingController.batchProcessDistanceCompliance);

// ============================================================
// AUTO STATUS UPDATE ROUTES
// ============================================================

/**
 * GET /api/tracking/auto-status/stats
 * Get auto status update service statistics
 */
router.get('/auto-status/stats', trackingController.getAutoStatusStats);

/**
 * PUT /api/tracking/auto-status/config
 * Update auto status service configuration
 * Admin/Owner only
 */
router.put('/auto-status/config', checkRole(['admin', 'owner']), trackingController.updateAutoStatusConfig);

/**
 * PUT /api/tracking/auto-status/toggle
 * Enable or disable auto status updates
 * Admin/Owner only
 */
router.put('/auto-status/toggle', checkRole(['admin', 'owner']), trackingController.toggleAutoStatus);

/**
 * POST /api/tracking/auto-status/check-vehicle/:vehicleId
 * Manually trigger status check for a specific vehicle
 * Admin/Owner only
 */
router.post('/auto-status/check-vehicle/:vehicleId', checkRole(['admin', 'owner']), trackingController.checkVehicleStatus);

/**
 * POST /api/tracking/auto-status/clear-cache
 * Clear auto status update cache
 * Admin/Owner only
 */
router.post('/auto-status/clear-cache', checkRole(['admin', 'owner']), trackingController.clearAutoStatusCache);

/**
 * POST /api/tracking/auto-status/test-geofence
 * Test geofence detection for a specific delivery order
 * Admin/Owner only
 */
router.post('/auto-status/test-geofence', checkRole(['admin', 'owner']), trackingController.testGeofence);

/**
 * GET /api/tracking/proximity/spbg
 * Check proximity to SPBG for Ghost Mode (200m threshold)
 * Driver only
 */
router.get('/proximity/spbg', verifyToken, checkRole(['driver']), trackingController.checkSPBGProximity);

module.exports = router; 