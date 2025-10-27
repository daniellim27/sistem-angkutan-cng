const express = require('express');
const multer = require('multer');
const receiptOcrController = require('../controllers/receiptOcrController');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Middleware for error handling
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed'
    });
  }
  
  next(error);
};

/**
 * @route POST /api/receipt-ocr/upload
 * @desc Upload receipt photo and process with OCR
 * @access Private (Driver)
 */
router.post('/upload', verifyToken, upload.single('receipt_photo'), handleUploadError, receiptOcrController.uploadReceipt);

/**
 * @route POST /api/receipt-ocr/confirm
 * @desc Confirm receipt data after review
 * @access Private (Driver)
 */
router.post('/confirm', verifyToken, receiptOcrController.confirmReceipt);

/**
 * @route GET /api/receipt-ocr/receipt/:id
 * @desc Get specific receipt details
 * @access Private (Driver/Admin)
 */
router.get('/receipt/:id', verifyToken, receiptOcrController.getReceiptById);

/**
 * @route PUT /api/receipt-ocr/:id/edit
 * @desc Edit receipt data
 * @access Private (Driver)
 */
router.put('/:id/edit', verifyToken, receiptOcrController.editReceipt);

/**
 * @route PUT /api/receipt-ocr/:id/verify
 * @desc Verify receipt (admin action)
 * @access Private (Admin)
 */
router.put('/:id/verify', verifyToken, checkRole(['admin']), receiptOcrController.verifyReceipt);

/**
 * @route POST /api/receipt-ocr/:id/confirm-admin
 * @desc Admin confirms receipt with pricing and applies to SPBG balance
 * @access Private (Admin)
 */
router.post('/:id/confirm-admin', verifyToken, checkRole(['admin']), receiptOcrController.confirmReceiptAdmin);

/**
 * @route DELETE /api/receipt-ocr/:id
 * @desc Delete receipt
 * @access Private (Driver/Admin)
 */
router.delete('/:id', verifyToken, receiptOcrController.deleteReceipt);

/**
 * @route GET /api/receipt-ocr/do/:doId
 * @desc Get all receipts for a delivery order
 * @access Private (Driver/Admin)
 */
router.get('/do/:doId', verifyToken, receiptOcrController.getReceiptsByDo);

module.exports = router;
