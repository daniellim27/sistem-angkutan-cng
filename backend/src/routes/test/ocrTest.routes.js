const express = require("express");
const router = express.Router();
const ocrService = require("../../services/ocrService");
const meterOcrService = require("../../services/meterOcrService");
const BillingCalculationService = require("../../services/billingCalculationService");
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * Test OCR functionality for NOTA (receipt) - uses production OCR service
 * POST /api/test/ocr/nota
 * Body: multipart/form-data with 'image' field
 */
router.post('/nota', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please upload an image file with field name "image".'
      });
    }

    console.log('🧪 Testing NOTA OCR with file:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    });

    // Read image file
    const imageBuffer = fs.readFileSync(req.file.path);
    
    // ✅ Use production OCR service
    const ocrResult = await ocrService.processNotaImage(imageBuffer);
    
    console.log('✅ NOTA OCR Test Result:', ocrResult);

    // ✅ Calculate billing (same as production)
    let billingCalculation = null;
    if (ocrResult.stan_awal && ocrResult.current_stan && 
        ocrResult.pressure_inlet && ocrResult.temperature) {
      billingCalculation = BillingCalculationService.processCompleteBilling(ocrResult);
    }

    // Clean up test file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'NOTA OCR processing completed successfully',
      data: {
        ocr_result: ocrResult,
        billing_calculation: billingCalculation,
        file_info: {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        test_mode: true
      }
    });

  } catch (error) {
    console.error('❌ NOTA OCR Test Error:', error);
    
    // Clean up test file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'NOTA OCR processing failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Test OCR functionality for SURAT JALAN (delivery note) - uses production OCR service
 * POST /api/test/ocr/surat-jalan
 * Body: multipart/form-data with 'image' field
 */
router.post('/surat-jalan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please upload an image file with field name "image".'
      });
    }

    console.log('🧪 Testing SURAT JALAN OCR with file:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    });

    // Read image file
    const imageBuffer = fs.readFileSync(req.file.path);
    
    // ✅ Use production OCR service
    const ocrResult = await ocrService.processSuratJalanImage(imageBuffer);
    
    console.log('✅ SURAT JALAN OCR Test Result:', ocrResult);

    // Clean up test file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Surat Jalan OCR processing completed successfully',
      data: {
        ocr_result: ocrResult,
        file_info: {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        test_mode: true
      }
    });

  } catch (error) {
    console.error('❌ SURAT JALAN OCR Test Error:', error);
    
    // Clean up test file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Surat Jalan OCR processing failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Test OCR functionality for METER readings (CCTV screenshots) - uses production OCR service
 * POST /api/test/ocr/meter
 * Body: multipart/form-data with 'image' field and 'meter_type' field
 * meter_type options: 'temperature', 'pressure_inlet', 'pressure_outlet', 'stan', 'other'
 */
router.post('/meter', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please upload an image file with field name "image".'
      });
    }

    const { meter_type } = req.body;
    
    if (!meter_type) {
      return res.status(400).json({
        success: false,
        message: 'meter_type is required. Options: temperature, pressure_inlet, pressure_outlet, stan, other'
      });
    }

    const validMeterTypes = ['temperature', 'pressure_inlet', 'pressure_outlet', 'stan', 'other'];
    if (!validMeterTypes.includes(meter_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid meter_type. Must be one of: ${validMeterTypes.join(', ')}`
      });
    }

    console.log('🧪 Testing METER OCR with file:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      meter_type: meter_type,
      path: req.file.path
    });

    // For meter OCR, we need a URL. Convert file to base64 data URL
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;
    
    // ✅ Use production meter OCR service
    const ocrResult = await meterOcrService.processMeterReading(imageUrl, meter_type);
    
    console.log('✅ METER OCR Test Result:', ocrResult);

    // Clean up test file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Meter OCR processing completed successfully',
      data: {
        meter_type: meter_type,
        ocr_result: ocrResult,
        file_info: {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        test_mode: true
      }
    });

  } catch (error) {
    console.error('❌ METER OCR Test Error:', error);
    
    // Clean up test file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Meter OCR processing failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get list of all available test OCR endpoints
 * GET /api/test/ocr
 */
router.get('/', async (req, res) => {
  res.json({
    success: true,
    message: 'OCR Test Endpoints',
    endpoints: {
      nota: {
        method: 'POST',
        path: '/api/test/ocr/nota',
        description: 'Test NOTA (receipt) OCR processing',
        body: 'multipart/form-data with "image" field',
        uses_production_service: true,
        returns: 'OCR result + billing calculation'
      },
      surat_jalan: {
        method: 'POST',
        path: '/api/test/ocr/surat-jalan',
        description: 'Test SURAT JALAN (delivery note) OCR processing',
        body: 'multipart/form-data with "image" field',
        uses_production_service: true,
        returns: 'OCR result with volume extraction'
      },
      meter: {
        method: 'POST',
        path: '/api/test/ocr/meter',
        description: 'Test METER OCR processing (CCTV screenshots)',
        body: 'multipart/form-data with "image" field and "meter_type" field',
        meter_type_options: ['temperature', 'pressure_inlet', 'pressure_outlet', 'stan', 'other'],
        uses_production_service: true,
        returns: 'OCR result with meter reading'
      },
      config: {
        method: 'GET',
        path: '/api/test/ocr/config',
        description: 'Check OCR service configuration',
        returns: 'Configuration status'
      },
      delivery_orders: {
        method: 'GET',
        path: '/api/test/ocr/delivery-orders-with-ocr',
        description: 'Get delivery orders with OCR data for testing',
        returns: 'List of delivery orders with OCR results'
      }
    }
  });
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
