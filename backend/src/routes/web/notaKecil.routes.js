const express = require("express");
const router = express.Router();
const { NotaKecil, DeliveryOrder } = require("../../models");
const { Op } = require("sequelize");
const { verifyToken, checkRole } = require("../../middlewares/auth.middleware");

/**
 * @route   GET /api/web/nota-kecils
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

    // Optimize response structure for consistency with mobile endpoint
    const optimizedNotaKecils = notaKecils.map(nota => {
      const optimized = {
        id: nota.id,
        delivery_order_id: nota.delivery_order_id,
        customer_location_index: nota.customer_location_index,
        customer_name: nota.customer_name,
        customer_address: nota.customer_address,
        stan_awal: nota.stan_awal,
        stan_akhir: nota.stan_akhir,
        tekanan_operasi: nota.tekanan_operasi,
        temperatur_operasi: nota.temperatur_operasi,
        Vt: nota.Vt,
        k: nota.k,
        V: nota.V,
        created_at: nota.created_at,
        driver_notes: nota.driver_notes,
        deliveryOrder: nota.deliveryOrder
      };

      // Convert old photo format to optimized format
      const photos = {};
      
      // Helper function to extract URLs from old format
      const extractUrls = (photoArray) => {
        if (!photoArray || !Array.isArray(photoArray)) return [];
        
        const urls = photoArray.map(photoGroup => {
          if (Array.isArray(photoGroup)) {
            // Handle nested arrays (old format)
            return photoGroup.map(photo => {
              if (typeof photo === 'string') return photo;
              if (photo && photo.url) return photo.url;
              return null;
            }).filter(url => url !== null);
          } else if (typeof photoGroup === 'object' && photoGroup.url) {
            // Handle direct objects (new format)
            return photoGroup.url;
          } else if (typeof photoGroup === 'string') {
            // Handle direct strings
            return photoGroup;
          }
          return null;
        }).filter(url => url !== null);
        
        // Flatten the result to remove nested arrays
        return urls.flat();
      };

      // Convert each photo type - check both old and new format fields
      photos.pressure_bar = extractUrls(nota.pressure_bar_photos) || extractUrls(nota.pressure_bar_photos_urls);
      photos.temperature = extractUrls(nota.temperature_photos) || extractUrls(nota.temperature_photos_urls);
      photos.stan_awal = extractUrls(nota.stan_awal_photos) || extractUrls(nota.stan_awal_photos_urls);
      photos.stan_akhir = extractUrls(nota.stan_akhir_photos) || extractUrls(nota.stan_akhir_photos_urls);


      // Only add photos if there are any
      if (photos.pressure_bar.length > 0 || photos.temperature.length > 0 || 
          photos.stan_awal.length > 0 || photos.stan_akhir.length > 0) {
        optimized.photos = photos;
      }

      // Add OCR results if available
      if (nota.ocr_confidence_scores) {
        optimized.ocr_results = nota.ocr_confidence_scores;
      }

      return optimized;
    });

    res.json({
      success: true,
      data: optimizedNotaKecils,
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

    // Apply the same optimization logic as the list endpoint
    const optimized = {
      id: notaKecil.id,
      delivery_order_id: notaKecil.delivery_order_id,
      customer_location_index: notaKecil.customer_location_index,
      customer_name: notaKecil.customer_name,
      customer_address: notaKecil.customer_address,
      stan_awal: notaKecil.stan_awal,
      stan_akhir: notaKecil.stan_akhir,
      tekanan_operasi: notaKecil.tekanan_operasi,
      temperatur_operasi: notaKecil.temperatur_operasi,
      Vt: notaKecil.Vt,
      k: notaKecil.k,
      V: notaKecil.V,
      created_at: notaKecil.created_at,
      driver_notes: notaKecil.driver_notes,
      deliveryOrder: notaKecil.deliveryOrder
    };

    // Convert old photo format to optimized format
    const photos = {};
    
    // Helper function to extract URLs from old format
    const extractUrls = (photoArray) => {
      if (!photoArray || !Array.isArray(photoArray)) return [];
      
      const urls = photoArray.map(photoGroup => {
        if (Array.isArray(photoGroup)) {
          // Handle nested arrays (old format)
          return photoGroup.map(photo => {
            if (typeof photo === 'string') return photo;
            if (photo && photo.url) return photo.url;
            return null;
          }).filter(url => url !== null);
        } else if (typeof photoGroup === 'object' && photoGroup.url) {
          // Handle direct objects (new format)
          return photoGroup.url;
        } else if (typeof photoGroup === 'string') {
          // Handle direct strings
          return photoGroup;
        }
        return null;
      }).filter(url => url !== null);
      
      // Flatten the result to remove nested arrays
      return urls.flat();
    };

    // Convert each photo type - check both old and new format fields
    photos.pressure_bar = extractUrls(notaKecil.pressure_bar_photos) || extractUrls(notaKecil.pressure_bar_photos_urls);
    photos.temperature = extractUrls(notaKecil.temperature_photos) || extractUrls(notaKecil.temperature_photos_urls);
    photos.stan_awal = extractUrls(notaKecil.stan_awal_photos) || extractUrls(notaKecil.stan_awal_photos_urls);
    photos.stan_akhir = extractUrls(notaKecil.stan_akhir_photos) || extractUrls(notaKecil.stan_akhir_photos_urls);

    // Only add photos if there are any
    if (photos.pressure_bar.length > 0 || photos.temperature.length > 0 || 
        photos.stan_awal.length > 0 || photos.stan_akhir.length > 0) {
      optimized.photos = photos;
    }

    // Add OCR results if available
    if (notaKecil.ocr_confidence_scores) {
      optimized.ocr_results = notaKecil.ocr_confidence_scores;
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

