const { NotaBesar, NotaBesarItem, NotaKecil, DeliveryOrder, User } = require('../models');
const billingCalculationService = require('../services/billingCalculationService');
const { Op } = require('sequelize');

/**
 * Calculate and create a new nota besar from selected nota kecils
 */
exports.calculateNotaBesar = async (req, res, next) => {
  try {
    const { id: deliveryOrderId } = req.params;
    const { notaKecilIds, gasPricePerM3, notes } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!notaKecilIds || !Array.isArray(notaKecilIds) || notaKecilIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one nota kecil must be selected'
      });
    }

    // Verify delivery order exists
    const deliveryOrder = await DeliveryOrder.findByPk(deliveryOrderId);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Check if user has access to this delivery order
    if (req.user.role === 'driver' && deliveryOrder.driver_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this delivery order'
      });
    }

    // Get selected nota kecils
    const notaKecils = await NotaKecil.findAll({
      where: {
        id: { [Op.in]: notaKecilIds },
        delivery_order_id: deliveryOrderId
      },
      order: [['created_at', 'ASC']]
    });

    if (notaKecils.length !== notaKecilIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some selected nota kecils not found or do not belong to this delivery order'
      });
    }

    // Validate all nota kecils have required data
    const validationErrors = [];
    for (const notaKecil of notaKecils) {
      const validation = billingCalculationService.validateNotaKecil(notaKecil);
      if (!validation.isValid) {
        validationErrors.push({
          notaKecilId: notaKecil.id,
          customerName: notaKecil.customer_name,
          errors: validation.errors
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some nota kecils have invalid data for billing calculation',
        errors: validationErrors
      });
    }

    // Calculate billing using the service
    const gasPrice = gasPricePerM3 || billingCalculationService.getDefaultGasPrice();
    const calculationResult = billingCalculationService.processMultipleNotaKecils(notaKecils, gasPrice);

    if (!calculationResult.success || calculationResult.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Billing calculation failed',
        errors: calculationResult.errors
      });
    }

    // Create nota besar in database
    const notaBesar = await NotaBesar.create({
      delivery_order_id: deliveryOrderId,
      created_by: userId,
      total_volume: calculationResult.totalVolume,
      total_price: calculationResult.totalPrice,
      gas_price_per_m3: gasPrice,
      status: 'draft',
      notes: notes || null
    });

    // Create nota besar items
    const notaBesarItems = [];
    for (const item of calculationResult.items) {
      const notaBesarItem = await NotaBesarItem.create({
        nota_besar_id: notaBesar.id,
        nota_kecil_id: item.notaKecilId,
        volume_m3: item.volume,
        price: item.price
      });
      notaBesarItems.push(notaBesarItem);
    }

    // Fetch the complete nota besar with associations
    const completeNotaBesar = await NotaBesar.findByPk(notaBesar.id, {
      include: [
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number', 'status']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'role']
        },
        {
          model: NotaBesarItem,
          as: 'items',
          include: [
            {
              model: NotaKecil,
              as: 'notaKecil',
              attributes: ['id', 'customer_name', 'customer_location_index', 'stan_awal', 'stan_akhir', 'tekanan_operasi', 'temperatur_operasi', 'Vt', 'k', 'V']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Nota besar created successfully',
      data: completeNotaBesar
    });

  } catch (error) {
    console.error('Error calculating nota besar:', error);
    next(error);
  }
};

/**
 * Get all nota besars for a delivery order
 */
exports.getNotaBesars = async (req, res, next) => {
  try {
    const { id: deliveryOrderId } = req.params;

    // Verify delivery order exists
    const deliveryOrder = await DeliveryOrder.findByPk(deliveryOrderId);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Check if user has access to this delivery order
    if (req.user.role === 'driver' && deliveryOrder.driver_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this delivery order'
      });
    }

    // Get nota besars with basic info
    const notaBesars = await NotaBesar.findAll({
      where: { delivery_order_id: deliveryOrderId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: notaBesars
    });

  } catch (error) {
    console.error('Error getting nota besars:', error);
    next(error);
  }
};

/**
 * Get specific nota besar with detailed information
 */
exports.getNotaBesarDetail = async (req, res, next) => {
  try {
    const { id: notaBesarId } = req.params;

    const notaBesar = await NotaBesar.findByPk(notaBesarId, {
      include: [
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number', 'status', 'driver_id']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'role']
        },
        {
          model: NotaBesarItem,
          as: 'items',
          include: [
            {
              model: NotaKecil,
              as: 'notaKecil',
              attributes: ['id', 'customer_name', 'customer_address', 'customer_location_index', 'stan_awal', 'stan_akhir', 'tekanan_operasi', 'temperatur_operasi', 'Vt', 'k', 'V', 'created_at']
            }
          ],
          order: [['created_at', 'ASC']]
        }
      ]
    });

    if (!notaBesar) {
      return res.status(404).json({
        success: false,
        message: 'Nota besar not found'
      });
    }

    // Check if user has access to this nota besar
    if (req.user.role === 'driver' && notaBesar.deliveryOrder.driver_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this nota besar'
      });
    }

    res.status(200).json({
      success: true,
      data: notaBesar
    });

  } catch (error) {
    console.error('Error getting nota besar detail:', error);
    next(error);
  }
};

/**
 * Update nota besar status
 */
exports.updateNotaBesarStatus = async (req, res, next) => {
  try {
    const { id: notaBesarId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['draft', 'confirmed', 'billed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const notaBesar = await NotaBesar.findByPk(notaBesarId, {
      include: [
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'driver_id']
        }
      ]
    });

    if (!notaBesar) {
      return res.status(404).json({
        success: false,
        message: 'Nota besar not found'
      });
    }

    // Check if user has access to this nota besar
    if (req.user.role === 'driver' && notaBesar.deliveryOrder.driver_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this nota besar'
      });
    }

    // Check if status transition is valid
    const currentStatus = notaBesar.status;
    const validTransitions = {
      'draft': ['confirmed', 'cancelled'],
      'confirmed': ['billed', 'cancelled'],
      'billed': [], // Cannot change from billed
      'cancelled': [] // Cannot change from cancelled
    };

    if (!validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${currentStatus} to ${status}`
      });
    }

    // Update nota besar
    await notaBesar.update({
      status: status,
      notes: notes || notaBesar.notes
    });

    res.status(200).json({
      success: true,
      message: 'Nota besar status updated successfully',
      data: notaBesar
    });

  } catch (error) {
    console.error('Error updating nota besar status:', error);
    next(error);
  }
};

/**
 * Delete nota besar (only if draft status)
 */
exports.deleteNotaBesar = async (req, res, next) => {
  try {
    const { id: notaBesarId } = req.params;

    const notaBesar = await NotaBesar.findByPk(notaBesarId, {
      include: [
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'driver_id']
        }
      ]
    });

    if (!notaBesar) {
      return res.status(404).json({
        success: false,
        message: 'Nota besar not found'
      });
    }

    // Check if user has access to this nota besar
    if (req.user.role === 'driver' && notaBesar.deliveryOrder.driver_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this nota besar'
      });
    }

    // Only allow deletion if status is draft
    if (notaBesar.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete nota besar with draft status'
      });
    }

    // Delete nota besar (items will be deleted by cascade)
    await notaBesar.destroy();

    res.status(200).json({
      success: true,
      message: 'Nota besar deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting nota besar:', error);
    next(error);
  }
};
