const express = require('express');
const router = express.Router();
const gasStationController = require('../controllers/gasStationController');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// All gas station routes require authentication
router.use(verifyToken);

/**
 * GET /api/gas-stations
 * Get all active gas stations
 */
router.get('/', gasStationController.getAllGasStations);

/**
 * GET /api/gas-stations/search
 * Search gas stations by name, type, or location
 * Query params: ?q=search_term&type=CNG&lat=-6.2088&lng=106.8456&radius=50
 */
router.get('/search', gasStationController.searchGasStations);

/**
 * GET /api/gas-stations/stats
 * Get gas station statistics
 */
router.get('/stats', gasStationController.getGasStationStats);

/**
 * GET /api/gas-stations/type/:type
 * Get gas stations by type (CNG, Petrol, Diesel, LPG, Mixed)
 */
router.get('/type/:type', gasStationController.getGasStationsByType);

/**
 * GET /api/gas-stations/:id
 * Get a specific gas station by ID
 */
router.get('/:id', gasStationController.getGasStationById);

/**
 * POST /api/gas-stations
 * Create a new gas station
 * Requires admin, owner, or driver role
 */
router.post('/', checkRole(['admin', 'owner', 'driver']), gasStationController.createGasStation);

/**
 * PUT /api/gas-stations/:id
 * Update a gas station
 * Requires admin or owner role
 */
router.put('/:id', checkRole(['admin', 'owner']), gasStationController.updateGasStation);

/**
 * DELETE /api/gas-stations/:id
 * Delete (deactivate) a gas station
 * Requires admin or owner role
 */
router.delete('/:id', checkRole(['admin', 'owner']), gasStationController.deleteGasStation);

module.exports = router;
