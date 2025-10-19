const express = require("express");
const router = express.Router();
const ocrService = require("../../services/ocrService");
const { DeliveryOrder } = require("../../models");
const multer = require("multer");
const fs = require("fs");

// Skip authentication for test routes
router.use((req, res, next) => {
  console.log('Test OCR route accessed:', req.path);
  next();
});

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/test/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Test OCR functionality for surat jalan
 * POST /api/test/ocr/surat-jalan
 */
router.post('/surat-jalan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('Testing OCR with file:', req.file);

    // Read image file
    const imageBuffer = fs.readFileSync(req.file.path);
    
    // Process with OCR
    const ocrResult = await ocrService.processSuratJalanImage(imageBuffer);
    
    console.log('OCR Test Result:', ocrResult);

    // Clean up test file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'OCR processing completed successfully',
      data: {
        ocr_result: ocrResult,
        file_info: {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      }
    });

  } catch (error) {
    console.error('OCR Test Error:', error);
    
    // Clean up test file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'OCR processing failed',
      error: error.message
    });
  }
});

/**
 * Test OCR configuration (no auth required for debugging)
 * GET /api/test/ocr/config
 */
router.get('/config', async (req, res) => {
  try {
    const config = ocrService.checkConfiguration();
    
    res.json({
      success: true,
      data: {
        is_configured: config.isConfigured,
        has_openai_key: !!process.env.OPENAI_API_KEY,
        openai_key_length: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
        openai_key_prefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'Not set',
        node_env: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('OCR Config Test Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check OCR configuration',
      error: error.message
    });
  }
});

/**
 * Get delivery orders with OCR data for testing
 * GET /api/test/ocr/delivery-orders-with-ocr
 */
router.get('/delivery-orders-with-ocr', async (req, res) => {
  try {
    const deliveryOrders = await DeliveryOrder.findAll({
      where: {
        surat_jalan_ocr_data: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: [
        'id',
        'do_number',
        'customer_name',
        'gas_volume_m3',
        'surat_jalan_photo_url',
        'surat_jalan_ocr_data',
        'surat_jalan_ocr_confidence',
        'surat_jalan_volume_extracted',
        'surat_jalan_ocr_confirmed',
        'surat_jalan_confirmed_volume',
        'surat_jalan_ocr_processed_at'
      ],
      order: [['surat_jalan_ocr_processed_at', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        count: deliveryOrders.length,
        delivery_orders: deliveryOrders
      }
    });
  } catch (error) {
    console.error('Error fetching delivery orders with OCR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery orders with OCR data',
      error: error.message
    });
  }
});

module.exports = router;
