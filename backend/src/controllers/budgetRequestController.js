const db = require("../models");
const path = require("path");
const fs = require("fs");

/**
 * @desc    Create a new budget request
 * @route   POST /api/budget-requests
 * @access  Private (Driver only)
 */
exports.createBudgetRequest = async (req, res) => {
  const { requested_amount, reason, delivery_order_id } = req.body;
  const driver_id = req.user.id;

  try {
    // Basic validation
    if (!delivery_order_id || !requested_amount || !reason) {
      return res.status(400).json({
        message: "Delivery Order ID, requested amount, and reason are required.",
      });
    }

    // Verify the delivery order belongs to this driver
    const deliveryOrder = await db.DeliveryOrder.findOne({
      where: { 
        id: delivery_order_id, 
        driver_id: driver_id 
      }
    });

    if (!deliveryOrder) {
      return res.status(404).json({
        message: "Delivery order not found or not assigned to you.",
      });
    }

    // Check if trip is completed (can't request more budget for completed trips)
    if (deliveryOrder.status === 'completed') {
      return res.status(400).json({
        message: "Cannot request additional budget for completed trips.",
      });
    }

    // Check if there's already a pending request for this delivery order
    const existingPendingRequest = await db.BudgetRequest.findOne({
      where: {
        delivery_order_id: delivery_order_id,
        driver_id: driver_id,
        status: 'pending'
      }
    });

    if (existingPendingRequest) {
      return res.status(400).json({
        message: "You already have a pending budget request for this delivery order.",
      });
    }

    // Create the budget request
    const newBudgetRequest = await db.BudgetRequest.create({
      driver_id,
      delivery_order_id,
      requested_amount: parseFloat(requested_amount),
      reason,
      status: 'pending',
      evidence_url: req.file ? req.file.path.replace(/\\/g, "/") : null,
    });

    res.status(201).json({
      message: "Budget request submitted successfully",
      budgetRequest: newBudgetRequest
    });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((e) => e.message);
      return res
        .status(400)
        .json({ message: "Validation failed", errors: messages });
    }
    console.error("Error creating budget request:", error);
    res
      .status(500)
      .json({ message: "Failed to create budget request", error: error.message });
  }
};

/**
 * @desc    Get budget requests for the logged-in driver
 * @route   GET /api/budget-requests
 * @access  Private (Driver only)
 */
exports.getBudgetRequests = async (req, res) => {
  const { delivery_order_id, status } = req.query;
  const userRole = req.user.role;

  try {
    let budgetRequests;

    if (userRole === 'admin' || userRole === 'owner') {
      // Admin/Owner can see all budget requests
      const whereClause = {};
      if (delivery_order_id) whereClause.delivery_order_id = delivery_order_id;
      if (status) whereClause.status = status;

      budgetRequests = await db.BudgetRequest.findAll({
        where: whereClause,
        include: [
          {
            model: db.DeliveryOrder,
            as: 'deliveryOrder',
            attributes: ['id', 'customer_name', 'load_location', 'unload_location']
          },
          {
            model: db.User,
            as: 'driver',
            attributes: ['id', 'username']
          }
        ],
        order: [['created_at', 'DESC']]
      });
    } else {
      // Driver can only see their own budget requests
      const driver_id = req.user.id;
      const options = { delivery_order_id, status };
      budgetRequests = await db.BudgetRequest.findByDriver(driver_id, options);
    }

    res.status(200).json({
      message: "Budget requests retrieved successfully",
      budgetRequests
    });
  } catch (error) {
    console.error("Error fetching budget requests:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch budget requests", error: error.message });
  }
};

/**
 * @desc    Get a single budget request by ID
 * @route   GET /api/budget-requests/:id
 * @access  Private (Driver/Admin)
 */
exports.getBudgetRequestById = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const budgetRequest = await db.BudgetRequest.findByPk(id, {
      include: [
        {
          model: db.DeliveryOrder,
          as: "deliveryOrder",
          attributes: ["id", "do_number", "customer_name", "trip_allowance"],
        },
        { 
          model: db.User, 
          as: "driver", 
          attributes: ["id", "username"],
          include: [{
            model: db.DriverProfile,
            as: "driverProfile",
            attributes: ["full_name"]
          }]
        },
        { 
          model: db.User, 
          as: "approver", 
          attributes: ["id", "username"] 
        },
      ],
    });

    if (!budgetRequest) {
      return res.status(404).json({ message: "Budget request not found." });
    }

    // Security check: Only the driver who created it or an admin can view it
    if (budgetRequest.driver_id !== user.id && user.role !== "admin" && user.role !== "owner") {
      return res.status(403).json({ message: "Access forbidden." });
    }

    res.status(200).json({
      message: "Budget request retrieved successfully",
      budgetRequest
    });
  } catch (error) {
    console.error(`Error fetching budget request ${id}:`, error);
    res
      .status(500)
      .json({ message: "Failed to fetch budget request.", error: error.message });
  }
};

/**
 * @desc    Delete a budget request (only if pending and by owner)
 * @route   DELETE /api/budget-requests/:id
 * @access  Private (Driver/Admin)
 */
exports.deleteBudgetRequest = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const budgetRequest = await db.BudgetRequest.findByPk(id);

    if (!budgetRequest) {
      return res.status(404).json({ message: "Budget request not found." });
    }

    // Security check
    if (budgetRequest.driver_id !== user.id && user.role !== "admin" && user.role !== "owner") {
      return res.status(403).json({ message: "Access forbidden." });
    }

    // Only allow deletion of pending requests
    if (budgetRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: "Only pending budget requests can be deleted." 
      });
    }

    // Delete evidence file if exists
    if (budgetRequest.evidence_url) {
      const filePath = path.resolve(budgetRequest.evidence_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await budgetRequest.destroy();

    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting budget request ${id}:`, error);
    res
      .status(500)
      .json({ message: "Failed to delete budget request.", error: error.message });
  }
};

/**
 * @desc    Approve a budget request (Admin only)
 * @route   PUT /api/web/budget-requests/:id/approve
 * @access  Private (Admin only)
 */
exports.approveBudgetRequest = async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user.id;

  try {
    const budgetRequest = await db.BudgetRequest.findByPk(id, {
      include: [
        { 
          model: db.User, 
          as: "driver", 
          attributes: ["id", "username"] 
        },
        { 
          model: db.DeliveryOrder, 
          as: "deliveryOrder", 
          attributes: ["id", "do_number", "customer_name", "trip_allowance"] 
        }
      ]
    });

    if (!budgetRequest) {
      return res.status(404).json({ message: "Budget request not found." });
    }

    if (budgetRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Budget request is already ${budgetRequest.status}. Cannot approve.` 
      });
    }

    // Start transaction
    const transaction = await db.sequelize.transaction();

    try {
      // Update budget request to approved
      await budgetRequest.update({
        status: 'approved',
        approved_by: admin_id,
        approved_at: new Date()
      }, { transaction });

      // Update delivery order trip allowance
      const deliveryOrder = budgetRequest.deliveryOrder;
      const newTripAllowance = parseFloat(deliveryOrder.trip_allowance) + parseFloat(budgetRequest.requested_amount);
      
      await deliveryOrder.update({
        trip_allowance: newTripAllowance
      }, { transaction });

      await transaction.commit();

      // Get updated budget request with approver info
      const updatedBudgetRequest = await db.BudgetRequest.findByPk(id, {
        include: [
          { model: db.User, as: "driver", attributes: ["id", "username"] },
          { model: db.User, as: "approver", attributes: ["id", "username"] },
          { model: db.DeliveryOrder, as: "deliveryOrder", attributes: ["id", "do_number", "customer_name", "trip_allowance"] }
        ]
      });

      res.status(200).json({
        message: "Budget request approved successfully and trip allowance updated",
        budgetRequest: updatedBudgetRequest
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error(`Error approving budget request ${id}:`, error);
    res.status(500).json({ 
      message: "Failed to approve budget request.", 
      error: error.message 
    });
  }
};

/**
 * @desc    Reject a budget request (Admin only)
 * @route   PUT /api/web/budget-requests/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectBudgetRequest = async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  const admin_id = req.user.id;

  try {
    const budgetRequest = await db.BudgetRequest.findByPk(id, {
      include: [
        { model: db.User, as: "driver", attributes: ["id", "username"] },
        { model: db.DeliveryOrder, as: "deliveryOrder", attributes: ["id", "do_number", "customer_name"] }
      ]
    });

    if (!budgetRequest) {
      return res.status(404).json({ message: "Budget request not found." });
    }

    if (budgetRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Budget request is already ${budgetRequest.status}. Cannot reject.` 
      });
    }

    // Update budget request to rejected
    await budgetRequest.update({
      status: 'rejected',
      approved_by: admin_id,
      approved_at: new Date(),
      rejection_reason: rejection_reason || 'No reason provided'
    });

    // Get updated budget request with approver info
    const updatedBudgetRequest = await db.BudgetRequest.findByPk(id, {
      include: [
        { model: db.User, as: "driver", attributes: ["id", "username"] },
        { model: db.User, as: "approver", attributes: ["id", "username"] },
        { model: db.DeliveryOrder, as: "deliveryOrder", attributes: ["id", "do_number", "customer_name"] }
      ]
    });

    res.status(200).json({
      message: "Budget request rejected successfully",
      budgetRequest: updatedBudgetRequest
    });
  } catch (error) {
    console.error(`Error rejecting budget request ${id}:`, error);
    res.status(500).json({ 
      message: "Failed to reject budget request.", 
      error: error.message 
    });
  }
};

/**
 * @desc    Get all pending budget requests for admin review
 * @route   GET /api/web/budget-requests/pending
 * @access  Private (Admin only)
 */
exports.getPendingBudgetRequests = async (req, res) => {
  try {
    const pendingRequests = await db.BudgetRequest.getPendingRequests();

    res.status(200).json({
      message: "Pending budget requests retrieved successfully",
      budgetRequests: pendingRequests
    });
  } catch (error) {
    console.error("Error fetching pending budget requests:", error);
    res.status(500).json({ 
      message: "Failed to fetch pending budget requests.", 
      error: error.message 
    });
  }
};
