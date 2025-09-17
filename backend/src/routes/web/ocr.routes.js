const express = require('express');
const router = express.Router();
const ocrController = require('../../controllers/ocrController');
const { verifyToken } = require('../../middlewares/auth.middleware');

// Apply authentication middleware to all OCR routes
router.use(verifyToken);

/**
 * @route POST /api/web/ocr/process-image
 * @desc Process nota image with OCR
 * @access Private
 */
router.post('/process-image', ocrController.upload.single('image'), ocrController.processImage);

/**
 * @route GET /api/web/ocr/process-status/:id
 * @desc Get OCR processing status
 * @access Private
 */
router.get('/process-status/:id', ocrController.getProcessStatus);

/**
 * @route PUT /api/web/ocr/update-extracted-data/:id
 * @desc Update extracted data manually
 * @access Private
 */
router.put('/update-extracted-data/:id', ocrController.updateExtractedData);

/**
 * @route POST /api/web/ocr/reprocess/:id
 * @desc Reprocess OCR for a delivery order
 * @access Private
 */
router.post('/reprocess/:id', ocrController.reprocessOCR);

/**
 * @route GET /api/web/ocr/delivery-order/:id
 * @desc Get OCR results for a delivery order
 * @access Private
 */
router.get('/delivery-order/:id', ocrController.getOCRResultsForDeliveryOrder);

/**
 * @route DELETE /api/web/ocr/:id
 * @desc Delete OCR result
 * @access Private
 */
router.delete('/:id', ocrController.deleteOCRResult);

/**
 * @route GET /api/web/ocr/config
 * @desc Check OCR service configuration
 * @access Private
 */
router.get('/config', ocrController.checkConfig);

/**
 * @route POST /api/web/ocr/test-process
 * @desc Test OCR processing without delivery order requirement
 * @access Private
 */
router.post('/test-process', ocrController.upload.single('image'), ocrController.testProcessImage);

module.exports = router;
