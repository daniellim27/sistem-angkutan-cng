const BillingCalculationService = require('../services/billingCalculationService');
const { DeliveryOrder, OCRResult } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/ocr');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `nota-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Lazy load OCR service to ensure environment variables are loaded
let OCRService = null;
const getOCRService = () => {
  if (!OCRService) {
    OCRService = require('../services/ocrService');
  }
  return OCRService;
};

/**
 * Process nota image with OCR
 * POST /api/ocr/process-image
 */
exports.processImage = async (req, res) => {
  try {
    const { delivery_order_id } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    if (!delivery_order_id) {
      return res.status(400).json({
        success: false,
        message: 'delivery_order_id is required'
      });
    }

    // Verify delivery order exists
    const deliveryOrder = await DeliveryOrder.findByPk(delivery_order_id);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Read image file
    const imageBuffer = fs.readFileSync(req.file.path);
    
    // Process with OCR
    const ocrResult = await getOCRService().processNotaImage(imageBuffer);
    
    // Save OCR result to database
    const savedOCRResult = await OCRResult.create({
      delivery_order_id: delivery_order_id,
      image_url: req.file.filename,
      image_path: req.file.path,
      raw_ocr_text: JSON.stringify(ocrResult.raw_data),
      extracted_data: ocrResult,
      confidence_scores: {
        overall: ocrResult.overall_confidence,
        tanggal_mulai: ocrResult.confidence,
        stan_awal: ocrResult.confidence,
        stan_akhir: ocrResult.confidence,
        tekanan_operasi: ocrResult.confidence,
        temperatur_operasi: ocrResult.confidence
      },
      processing_status: 'completed',
      processed_by: req.user?.id || null
    });

    // Calculate billing if OCR data is valid
    let billingCalculation = null;
    if (ocrResult.stan_awal && ocrResult.stan_akhir && 
        ocrResult.tekanan_operasi && ocrResult.temperatur_operasi) {
      billingCalculation = BillingCalculationService.processCompleteBilling(ocrResult);
    }

    res.json({
      success: true,
      message: 'OCR processing completed successfully',
      data: {
        ocr_result: savedOCRResult,
        extracted_data: ocrResult,
        billing_calculation: billingCalculation,
        image_url: `/uploads/ocr/${req.file.filename}`
      }
    });

  } catch (error) {
    console.error('OCR Processing Error:', error);
    res.status(500).json({
      success: false,
      message: 'OCR processing failed',
      error: error.message
    });
  }
};

/**
 * Get OCR processing status
 * GET /api/ocr/process-status/:id
 */
exports.getProcessStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ocrResult = await OCRResult.findByPk(id);
    if (!ocrResult) {
      return res.status(404).json({
        success: false,
        message: 'OCR result not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: ocrResult.id,
        delivery_order_id: ocrResult.delivery_order_id,
        processing_status: ocrResult.processing_status,
        confidence_scores: ocrResult.confidence_scores,
        extracted_data: ocrResult.extracted_data,
        created_at: ocrResult.created_at,
        updated_at: ocrResult.updated_at
      }
    });

  } catch (error) {
    console.error('Get OCR Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OCR status',
      error: error.message
    });
  }
};

/**
 * Update extracted data manually
 * PUT /api/ocr/update-extracted-data/:id
 */
exports.updateExtractedData = async (req, res) => {
  try {
    const { id } = req.params;
    const { extracted_data } = req.body;
    
    if (!extracted_data) {
      return res.status(400).json({
        success: false,
        message: 'extracted_data is required'
      });
    }

    const ocrResult = await OCRResult.findByPk(id);
    if (!ocrResult) {
      return res.status(404).json({
        success: false,
        message: 'OCR result not found'
      });
    }

    // Update extracted data
    ocrResult.extracted_data = extracted_data;
    ocrResult.updated_at = new Date();
    await ocrResult.save();

    // Recalculate billing if data is valid
    let billingCalculation = null;
    if (extracted_data.stan_awal && extracted_data.stan_akhir && 
        extracted_data.tekanan_operasi && extracted_data.temperatur_operasi) {
      billingCalculation = BillingCalculationService.processCompleteBilling(extracted_data);
    }

    res.json({
      success: true,
      message: 'Extracted data updated successfully',
      data: {
        ocr_result: ocrResult,
        billing_calculation: billingCalculation
      }
    });

  } catch (error) {
    console.error('Update OCR Data Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update extracted data',
      error: error.message
    });
  }
};

/**
 * Reprocess OCR for a delivery order
 * POST /api/ocr/reprocess/:id
 */
exports.reprocessOCR = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ocrResult = await OCRResult.findByPk(id);
    if (!ocrResult) {
      return res.status(404).json({
        success: false,
        message: 'OCR result not found'
      });
    }

    // Check if image file exists
    if (!fs.existsSync(ocrResult.image_path)) {
      return res.status(404).json({
        success: false,
        message: 'Original image file not found'
      });
    }

    // Read image and reprocess
    const imageBuffer = fs.readFileSync(ocrResult.image_path);
    const newOCRResult = await getOCRService().processNotaImage(imageBuffer);
    
    // Update OCR result
    ocrResult.extracted_data = newOCRResult;
    ocrResult.confidence_scores = {
      overall: newOCRResult.overall_confidence,
      tanggal_mulai: newOCRResult.confidence,
      stan_awal: newOCRResult.confidence,
      stan_akhir: newOCRResult.confidence,
      tekanan_operasi: newOCRResult.confidence,
      temperatur_operasi: newOCRResult.confidence
    };
    ocrResult.updated_at = new Date();
    await ocrResult.save();

    // Recalculate billing
    let billingCalculation = null;
    if (newOCRResult.stan_awal && newOCRResult.stan_akhir && 
        newOCRResult.tekanan_operasi && newOCRResult.temperatur_operasi) {
      billingCalculation = BillingCalculationService.processCompleteBilling(newOCRResult);
    }

    res.json({
      success: true,
      message: 'OCR reprocessed successfully',
      data: {
        ocr_result: ocrResult,
        extracted_data: newOCRResult,
        billing_calculation: billingCalculation
      }
    });

  } catch (error) {
    console.error('Reprocess OCR Error:', error);
    res.status(500).json({
      success: false,
      message: 'OCR reprocessing failed',
      error: error.message
    });
  }
};

/**
 * Get OCR results for a delivery order
 * GET /api/ocr/delivery-order/:id
 */
exports.getOCRResultsForDeliveryOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ocrResults = await OCRResult.findAll({
      where: { delivery_order_id: id },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: ocrResults
    });

  } catch (error) {
    console.error('Get OCR Results Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get OCR results',
      error: error.message
    });
  }
};

/**
 * Delete OCR result
 * DELETE /api/ocr/:id
 */
exports.deleteOCRResult = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ocrResult = await OCRResult.findByPk(id);
    if (!ocrResult) {
      return res.status(404).json({
        success: false,
        message: 'OCR result not found'
      });
    }

    // Delete image file if it exists
    if (ocrResult.image_path && fs.existsSync(ocrResult.image_path)) {
      fs.unlinkSync(ocrResult.image_path);
    }

    // Delete database record
    await ocrResult.destroy();

    res.json({
      success: true,
      message: 'OCR result deleted successfully'
    });

  } catch (error) {
    console.error('Delete OCR Result Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete OCR result',
      error: error.message
    });
  }
};

/**
 * Check OCR service configuration
 * GET /api/ocr/config
 */
exports.checkConfig = async (req, res) => {
  try {
    const config = getOCRService().checkConfiguration();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check OCR configuration',
      error: error.message
    });
  }
};

/**
 * Test OCR processing without delivery order requirement
 * POST /api/ocr/test-process
 */
exports.testProcessImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Read image file
    const imageBuffer = fs.readFileSync(req.file.path);
    
    // Process with OCR
    const ocrResult = await getOCRService().processNotaImage(imageBuffer);
    
    // Calculate billing if OCR data is valid
    let billingCalculation = null;
    if (ocrResult.stan_awal && ocrResult.stan_akhir && 
        ocrResult.tekanan_operasi && ocrResult.temperatur_operasi) {
      billingCalculation = BillingCalculationService.processCompleteBilling(ocrResult);
    }

    res.json({
      success: true,
      message: 'OCR test processing completed successfully',
      data: {
        extracted_data: ocrResult,
        billing_calculation: billingCalculation,
        image_url: `/uploads/ocr/${req.file.filename}`,
        test_mode: true
      }
    });

  } catch (error) {
    console.error('OCR Test Processing Error:', error);
    res.status(500).json({
      success: false,
      message: 'OCR test processing failed',
      error: error.message
    });
  }
};

// Export multer middleware for use in routes
exports.upload = upload;

