// backend/src/controllers/web/exchangeRate.controller.js
const db = require('../../models');
const { ExchangeRate } = db;
const ExchangeRateService = require('../../services/exchangeRateService');

// Initialize service with models
const exchangeRateService = new ExchangeRateService(db);

/**
 * Get current exchange rate
 * GET /api/web/exchange-rates/current
 */
exports.getCurrentRate = async (req, res) => {
  try {
    const { currency = 'USD' } = req.query;
    
    const rate = await exchangeRateService.getCurrentRate(currency);
    
    if (!rate) {
      return res.status(404).json({
        success: false,
        message: `No exchange rate found for ${currency}`
      });
    }

    res.json({
      success: true,
      data: {
        currency: rate.currency_code,
        rate: parseFloat(rate.rate),
        source: rate.source,
        last_scraped_at: rate.scraped_at,
        created_at: rate.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error getting current rate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current exchange rate',
      error: error.message
    });
  }
};

/**
 * Get historical exchange rates
 * GET /api/web/exchange-rates/history
 */
exports.getHistory = async (req, res) => {
  try {
    const { currency = 'USD', days = 30 } = req.query;
    
    const rates = await exchangeRateService.getHistoricalRates(currency, parseInt(days));
    
    const formattedRates = rates.map(rate => ({
      id: rate.id,
      currency: rate.currency_code,
      rate: parseFloat(rate.rate),
      source: rate.source,
      scraped_at: rate.scraped_at,
      created_at: rate.created_at
    }));

    res.json({
      success: true,
      data: {
        currency,
        days: parseInt(days),
        count: rates.length,
        rates: formattedRates
      }
    });
  } catch (error) {
    console.error('❌ Error getting rate history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exchange rate history',
      error: error.message
    });
  }
};

/**
 * Manually trigger rate update (admin only)
 * GET /api/web/exchange-rates/manual-update
 */
exports.manualUpdate = async (req, res) => {
  try {
    console.log('🔄 Manual rate update triggered by admin');
    
    const rate = await exchangeRateService.scrapeBIRate();
    
    res.json({
      success: true,
      message: 'Exchange rate updated successfully',
      data: {
        currency: 'USD',
        rate: rate,
        scraped_at: new Date(),
        source: 'Bank Indonesia'
      }
    });
  } catch (error) {
    console.error('❌ Error in manual rate update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exchange rate',
      error: error.message
    });
  }
};

/**
 * Get latest rate value (just the number)
 * GET /api/web/exchange-rates/latest-value
 */
exports.getLatestValue = async (req, res) => {
  try {
    const { currency = 'USD' } = req.query;
    
    const rateValue = await exchangeRateService.getLatestRateValue(currency);
    
    if (rateValue === null) {
      return res.status(404).json({
        success: false,
        message: `No exchange rate found for ${currency}`
      });
    }

    res.json({
      success: true,
      data: {
        currency,
        rate: rateValue
      }
    });
  } catch (error) {
    console.error('❌ Error getting latest rate value:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get latest rate value',
      error: error.message
    });
  }
};
