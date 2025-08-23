// src/routes/iot.routes.js
const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');

/**
 * IoT Data Routes
 * Base path: /api/v1/iot
 */

// POST /api/v1/iot/data - Receive IoT data from Arduino/sensors
router.post('/data', iotController.receiveData);

// GET /api/v1/iot/data/:delivery_order_id/latest - Get latest IoT data for a delivery order
router.get('/data/:delivery_order_id/latest', iotController.getLatestData);

// GET /api/v1/iot/data/:delivery_order_id/history - Get IoT data history for a delivery order
router.get('/data/:delivery_order_id/history', iotController.getDataHistory);

module.exports = router;
