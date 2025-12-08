const express = require("express");
const router = express.Router();
const { NotaKecil, DeliveryOrder } = require("../../models");
const { Op } = require("sequelize");
const { verifyToken, checkRole } = require("../../middlewares/auth.middleware");
const { sequelize } = require("../../models");

/**
 * @route   GET /web/nota-kecils
 * @desc    Get all nota kecils across all delivery orders
 * @access  Private (Admin/Owner)
 */
// In your route file, update the query to use new field names
router.get("/", verifyToken, checkRole(['admin', 'owner']), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, delivery_order_id } = req.query;
    
    const { count, rows: notaKecils } = await NotaKecil.findAndCountAll({
      where: {
        ...(delivery_order_id && { delivery_order_id }),
        ...(search && {
          [Op.or]: [
            { customer_name: { [Op.iLike]: `%${search}%` } },
            { customer_address: { [Op.iLike]: `%${search}%` } }
          ]
        })
      },
      include: [
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number', 'status']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: notaKecils,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
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
 * @route   GET /api/web/nota-kecils/:id
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

    // ✅ NEW SCHEMA: Clean optimized response
    const optimized = {
      id: notaKecil.id,
      delivery_order_id: notaKecil.delivery_order_id,
      customer_location_index: notaKecil.customer_location_index,
      customer_name: notaKecil.customer_name,
      customer_address: notaKecil.customer_address,
      
      // ✅ NEW SCHEMA FIELDS ONLY
      stan_awal: notaKecil.stan_awal,
      current_stan: notaKecil.current_stan,
      stan_akhir: notaKecil.stan_akhir,
      pressure_inlet: notaKecil.pressure_inlet,
      pressure_outlet: notaKecil.pressure_outlet,
      temperature: notaKecil.temperature,
      
      // ✅ CALCULATED VALUES
      volume_delta: notaKecil.volume_delta,
      Vt: notaKecil.Vt,
      k: notaKecil.k,
      V: notaKecil.V,
      
      created_at: notaKecil.created_at,
      driver_notes: notaKecil.driver_notes,
      driver_confirmed: notaKecil.driver_confirmed,
      deliveryOrder: notaKecil.deliveryOrder
    };

    // ✅ NEW SCHEMA: Clean photo extraction
    const photos = {};
    
    // Helper function to extract URLs from NEW format
    const extractUrls = (photoArray) => {
      if (!photoArray || !Array.isArray(photoArray)) return [];
      
      return photoArray
        .map(photo => {
          if (typeof photo === 'string') return photo;
          if (photo && photo.url) return photo.url;
          return null;
        })
        .filter(url => url !== null);
    };

    // ✅ NEW SCHEMA: Direct field mapping
    photos.pressure_inlet = extractUrls(notaKecil.pressure_inlet_photos);
    photos.pressure_outlet = extractUrls(notaKecil.pressure_outlet_photos);
    photos.temperature = extractUrls(notaKecil.temperature_photos);
    photos.stan_awal = extractUrls(notaKecil.stan_awal_photos);
    photos.stan_akhir = extractUrls(notaKecil.stan_akhir_photos);

    // Only add photos if there are any
    const hasPhotos = Object.values(photos).some(arr => arr.length > 0);
    if (hasPhotos) {
      optimized.photos = photos;
    }

    // ✅ NEW SCHEMA: OCR results
    if (notaKecil.ocr_confidence_scores && Object.keys(notaKecil.ocr_confidence_scores).length > 0) {
      optimized.ocr_results = notaKecil.ocr_confidence_scores;
      optimized.ocr_confidence_avg = notaKecil.ocr_confidence_avg;
      optimized.screenshots_count = notaKecil.screenshots_count;
      optimized.ocr_success_count = notaKecil.ocr_success_count;
      optimized.ocr_processing_status = notaKecil.ocr_processing_status;
    }

    res.json({
      success: true,
      data: optimized
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