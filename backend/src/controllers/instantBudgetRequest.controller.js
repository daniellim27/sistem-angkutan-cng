// src/controllers/instantBudgetRequest.controller.js
const { BudgetRequest, DeliveryOrder, User, sequelize } = require("../models");

/**
 * @desc    Create and instantly approve a budget request
 * @route   POST /api/budget-requests
 * @access  Private (Driver only)
 */
exports.createInstantBudgetRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { delivery_order_id, requested_amount, reason } = req.body;
    const driver_id = req.user.id;

    // Validate required fields
    if (!delivery_order_id || !requested_amount || !reason) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Validation failed",
        errors: [
          !delivery_order_id && "Delivery Order ID is required",
          !requested_amount && "Requested amount is required", 
          !reason && "Reason is required"
        ].filter(Boolean)
      });
    }

    // Additional validation for reason length (mobile friendly)
    if (reason.trim().length < 3) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Validation failed",
        errors: ["Reason must be at least 3 characters long"]
      });
    }

    // Validate delivery order exists and belongs to the driver
    const deliveryOrder = await DeliveryOrder.findOne({
      where: { 
        id: delivery_order_id,
        driver_id: driver_id 
      },
      transaction
    });

    if (!deliveryOrder) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Delivery Order not found or not assigned to you.",
      });
    }

    // Check if delivery order is still active (not completed)
    if (deliveryOrder.status === 'completed') {
      await transaction.rollback();
      return res.status(400).json({
        message: "Cannot request additional budget for completed delivery orders.",
      });
    }

    // Create budget request with instant approval
    const budgetRequest = await BudgetRequest.create({
      delivery_order_id,
      driver_id,
      requested_amount: parseFloat(requested_amount),
      reason,
      status: 'approved', // ✅ INSTANT APPROVAL
      approved_by: 1, // System auto-approval (assuming admin user ID 1)
      approved_at: new Date(),
      evidence_url: req.file ? req.file.path.replace(/\\/g, "/") : null,
    }, { transaction });

    // ✅ INSTANTLY UPDATE DELIVERY ORDER TRIP ALLOWANCE
    const currentTripAllowance = parseFloat(deliveryOrder.trip_allowance) || 0;
    const newTripAllowance = currentTripAllowance + parseFloat(requested_amount);
    
    await deliveryOrder.update({
      trip_allowance: newTripAllowance
    }, { transaction });

    await transaction.commit();

    // Return the approved budget request with updated delivery order info
    res.status(201).json({
      message: "Budget request approved instantly and trip allowance updated!",
      budgetRequest: {
        ...budgetRequest.toJSON(),
        deliveryOrder: {
          id: deliveryOrder.id,
          do_number: deliveryOrder.do_number,
          previous_trip_allowance: currentTripAllowance,
          new_trip_allowance: newTripAllowance,
          added_amount: parseFloat(requested_amount)
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error creating instant budget request:", error);
    
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((e) => e.message);
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: messages 
      });
    }
    
    res.status(500).json({ 
      message: "Failed to create budget request", 
      error: error.message 
    });
  }
};

/**
 * @desc    Get budget requests for a delivery order
 * @route   GET /api/budget-requests?delivery_order_id=123
 * @access  Private
 */
exports.getBudgetRequests = async (req, res) => {
  try {
    const { delivery_order_id } = req.query;
    const user = req.user;

    let whereClause = {};

    // If delivery_order_id is specified, filter by it
    if (delivery_order_id) {
      whereClause.delivery_order_id = delivery_order_id;
    }

    // If user is a driver, only show their own budget requests
    if (user.role === 'driver') {
      whereClause.driver_id = user.id;
    }

    const budgetRequests = await BudgetRequest.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "driver",
          attributes: ["id", "username"],
        },
        {
          model: User,
          as: "approver",
          attributes: ["id", "username"],
          required: false
        },
        {
          model: DeliveryOrder,
          as: "deliveryOrder",
          attributes: ["id", "do_number", "customer_name", "trip_allowance"],
        }
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      budgetRequests: budgetRequests
    });

  } catch (error) {
    console.error("Error fetching budget requests:", error);
    res.status(500).json({ 
      message: "Failed to fetch budget requests", 
      error: error.message 
    });
  }
};

/**
 * @desc    Get pending budget requests (for admin - but since all are auto-approved, this returns empty)
 * @route   GET /api/web/budget-requests/pending
 * @access  Private (Admin only)
 */
exports.getPendingBudgetRequests = async (req, res) => {
  try {
    // Since all budget requests are instantly approved, return empty array
    res.json({
      success: true,
      message: "All budget requests are auto-approved instantly.",
      budgetRequests: []
    });
  } catch (error) {
    console.error("Error fetching pending budget requests:", error);
    res.status(500).json({ 
      message: "Failed to fetch pending budget requests", 
      error: error.message 
    });
  }
};
