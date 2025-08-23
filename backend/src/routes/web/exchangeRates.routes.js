// backend/src/routes/web/exchangeRates.routes.js
const express = require('express');
const router = express.Router();
const exchangeRateController = require('../../controllers/web/exchangeRate.controller');
const { checkRole } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/web/exchange-rates/current
 * @desc    Get current exchange rate
 * @access  Public
 */
router.get('/current', exchangeRateController.getCurrentRate);

/**
 * @route   GET /api/web/exchange-rates/latest-value
 * @desc    Get latest rate value (just the number)
 * @access  Public
 */
router.get('/latest-value', exchangeRateController.getLatestValue);

/**
 * @route   GET /api/web/exchange-rates/history
 * @desc    Get historical exchange rates
 * @access  Public
 */
router.get('/history', exchangeRateController.getHistory);

/**
 * @route   GET /api/web/exchange-rates/manual-update
 * @desc    Manually trigger rate update (admin only)
 * @access  Admin/Owner only
 */
router.get('/manual-update', checkRole(['admin', 'owner']), exchangeRateController.manualUpdate);

module.exports = router;
