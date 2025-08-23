// src/controllers/iotController.js
const { IotRawData, DeliveryOrder } = require('../models');
const { Op } = require('sequelize');

/**
 * Receive IoT data from Arduino/sensor devices
 * POST /api/v1/iot/data
 */
exports.receiveData = async (req, res, next) => {
  try {
    const { delivery_order_id, pressure_in, pressure_out, temperature, meter_pulse } = req.body;

    // Validate required fields
    if (!delivery_order_id) {
      return res.status(400).json({
        success: false,
        message: 'delivery_order_id is required'
      });
    }

    // Validate delivery order exists
    const deliveryOrder = await DeliveryOrder.findByPk(delivery_order_id);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Validate data types and ranges
    const validationErrors = [];
    
    if (pressure_in !== undefined && (isNaN(pressure_in) || pressure_in < 0)) {
      validationErrors.push('pressure_in must be a positive number');
    }
    
    if (pressure_out !== undefined && (isNaN(pressure_out) || pressure_out < 0)) {
      validationErrors.push('pressure_out must be a positive number');
    }
    
    if (temperature !== undefined && (isNaN(temperature) || temperature < -273.15)) {
      validationErrors.push('temperature must be a valid temperature value');
    }
    
    if (meter_pulse !== undefined && (!Number.isInteger(meter_pulse) || meter_pulse < 0)) {
      validationErrors.push('meter_pulse must be a positive integer');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: validationErrors
      });
    }

    // Create IoT data record
    const iotData = await IotRawData.create({
      delivery_order_id,
      pressure_in: pressure_in || null,
      pressure_out: pressure_out || null,
      temperature: temperature || null,
      meter_pulse: meter_pulse || null
    });

    console.log(`✅ IoT data received and stored for DO ${delivery_order_id}:`, {
      pressure_in: iotData.pressure_in,
      pressure_out: iotData.pressure_out,
      temperature: iotData.temperature,
      meter_pulse: iotData.meter_pulse,
      timestamp: iotData.created_at
    });

    res.status(201).json({
      success: true,
      message: 'IoT data received successfully',
      data: {
        id: iotData.id,
        delivery_order_id: iotData.delivery_order_id,
        pressure_in: iotData.pressure_in,
        pressure_out: iotData.pressure_out,
        temperature: iotData.temperature,
        meter_pulse: iotData.meter_pulse,
        created_at: iotData.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error receiving IoT data:', error);
    next(error);
  }
};

/**
 * Get latest IoT data for a specific delivery order
 * GET /api/v1/iot/data/:delivery_order_id/latest
 */
exports.getLatestData = async (req, res, next) => {
  try {
    const { delivery_order_id } = req.params;

    // Validate delivery order exists
    const deliveryOrder = await DeliveryOrder.findByPk(delivery_order_id);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Get latest IoT data
    const latestData = await IotRawData.findOne({
      where: { delivery_order_id },
      order: [['created_at', 'DESC']]
    });

    if (!latestData) {
      return res.status(404).json({
        success: false,
        message: 'No IoT data found for this delivery order'
      });
    }

    res.json({
      success: true,
      data: {
        id: latestData.id,
        delivery_order_id: latestData.delivery_order_id,
        pressure_in: latestData.pressure_in,
        pressure_out: latestData.pressure_out,
        temperature: latestData.temperature,
        meter_pulse: latestData.meter_pulse,
        created_at: latestData.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error getting latest IoT data:', error);
    next(error);
  }
};

/**
 * Get IoT data history for a specific delivery order
 * GET /api/v1/iot/data/:delivery_order_id/history
 */
exports.getDataHistory = async (req, res, next) => {
  try {
    const { delivery_order_id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Validate delivery order exists
    const deliveryOrder = await DeliveryOrder.findByPk(delivery_order_id);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Get IoT data history with pagination
    const { count, rows } = await IotRawData.findAndCountAll({
      where: { delivery_order_id },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows.map(row => ({
        id: row.id,
        delivery_order_id: row.delivery_order_id,
        pressure_in: row.pressure_in,
        pressure_out: row.pressure_out,
        temperature: row.temperature,
        meter_pulse: row.meter_pulse,
        created_at: row.created_at
      })),
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: count > parseInt(limit) + parseInt(offset)
      }
    });

  } catch (error) {
    console.error('❌ Error getting IoT data history:', error);
    next(error);
  }
};
