const express = require("express");
const router = express.Router();
const { NotaKecil, DeliveryOrder } = require("../models");
const { Op } = require("sequelize");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");

/**
 * @route   GET /api/nota-kecils
 * @desc    Get all nota kecils across all delivery orders
 * @access  Private (Admin/Owner)
 */
router.get("/", verifyToken, checkRole(['admin', 'owner']), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, delivery_order_id } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    if (delivery_order_id) {
      whereClause.delivery_order_id = delivery_order_id;
    }

    if (search) {
      whereClause[Op.or] = [
        { customer_name: { [Op.iLike]: `%${search}%` } },
        { customer_address: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: notaKecils } = await NotaKecil.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: notaKecils,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching nota kecils:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch nota kecils",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/nota-kecils/:id
 * @desc    Get specific nota kecil by ID
 * @access  Private (Admin/Owner)
 */
router.get("/:id", verifyToken, checkRole(['admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;

    const notaKecil = await NotaKecil.findByPk(id, {
      include: [
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number']
        }
      ]
    });

    if (!notaKecil) {
      return res.status(404).json({
        success: false,
        message: "Nota kecil not found"
      });
    }

    res.json({
      success: true,
      data: notaKecil
    });
  } catch (error) {
    console.error("Error fetching nota kecil:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch nota kecil",
      error: error.message
    });
  }
});

module.exports = router;
