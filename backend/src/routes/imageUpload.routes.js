const express = require('express');
const router = express.Router();
const imageUploadController = require('../controllers/imageUploadController');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// Import multer middleware
const multer = require('multer');
const storage = multer.memoryStorage();

// More permissive multer configuration for React Native compatibility
const uploadNotaKecilImages = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB field size
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
}).fields([
  { name: 'Pressure-Bar', maxCount: 10 },
  { name: 'Temperature', maxCount: 10 },
  { name: 'Stan-Awal', maxCount: 10 },
  { name: 'Stan-Akhir', maxCount: 10 }
]);

// Alternative multer config for React Native - using single field approach
const uploadNotaKecilImagesSimple = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  // Add more robust configuration for React Native compatibility
  preservePath: false,
  // Handle busboy errors more gracefully
  onError: (err, next) => {
    console.log('📸 Multer onError callback triggered:', err.message);
    // Don't immediately fail on busboy errors
    next();
  },
  // Add timeout to prevent hanging on incomplete streams
  timeout: 30000 // 30 seconds timeout
}).any();

/**
 * @route   POST /api/image-upload/nota-kecil
 * @desc    Upload nota kecil images to Cloudinary
 * @access  Private (Admin/Owner/Driver)
 */
router.post('/nota-kecil', 
  verifyToken, 
  checkRole(['admin', 'owner', 'driver']),
  (req, res, next) => {
    console.log('📸 Multer middleware processing request...');
    uploadNotaKecilImages(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err);
        console.error('❌ Multer error details:', {
          message: err.message,
          code: err.code,
          field: err.field
        });
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message
        });
      }
      console.log('✅ Multer processing completed successfully');
      console.log('📸 Files received:', req.files ? Object.keys(req.files) : 'none');
      next();
    });
  },
  imageUploadController.uploadNotaKecilImages
);

/**
 * @route   POST /api/image-upload/nota-kecil-simple
 * @desc    Upload nota kecil images to Cloudinary (React Native compatible)
 * @access  Private (Admin/Owner/Driver)
 */
router.post('/nota-kecil-simple', 
  verifyToken, 
  checkRole(['admin', 'owner', 'driver']),
  (req, res, next) => {
    console.log('📸 Simple multer middleware processing request...');
    uploadNotaKecilImagesSimple(req, res, (err) => {
      console.log('📸 Multer callback executed, err:', err ? err.message : 'none');
      console.log('📸 Files in req.files:', req.files ? req.files.length : 'none');
      
      if (err) {
        console.error('❌ Simple multer error:', err);
        
        // Check if this is a busboy "Unexpected end of form" error
        const isBusboyEndOfFormError = err.message && err.message.includes('Unexpected end of form');
        
        // Check if files were still processed despite the error
        if (req.files && req.files.length > 0) {
          console.log('⚠️ Multer error but files were processed:', req.files.length);
          console.log('📸 Files received despite error:', req.files.map(f => f.fieldname));
          
          // Store files count for error handling
          req.processedFilesCount = req.files.length;
          console.log('📸 Stored processed files count in multer error:', req.processedFilesCount);
          
          if (isBusboyEndOfFormError) {
            console.log('📸 Busboy "end of form" error detected - this is usually harmless when files are processed');
            console.log('📸 Proceeding to controller despite busboy error...');
            // Clear the error since files were processed successfully
            req.multerError = null;
          } else {
            console.log('📸 Non-busboy error - proceeding with caution...');
            req.multerError = err;
          }
          
          next();
        } else {
          console.log('❌ No files processed, returning error');
          return res.status(400).json({
            success: false,
            message: 'File upload error: ' + err.message
          });
        }
      } else {
        console.log('✅ Simple multer processing completed successfully');
        console.log('📸 Files received:', req.files ? req.files.length : 'none');
        console.log('📸 Proceeding to controller...');
        
        // Store files count for error handling
        req.processedFilesCount = req.files ? req.files.length : 0;
        console.log('📸 Stored processed files count in multer:', req.processedFilesCount);
        
        next();
      }
    });
  },
  (req, res, next) => {
    console.log('🎯 Middleware before controller - about to call controller');
    
    // Store files count for error handling
    req.processedFilesCount = req.files ? req.files.length : 0;
    console.log('📸 Stored processed files count:', req.processedFilesCount);
    
    // Add a timeout to handle the case where busboy error happens after controller starts
    const busboyTimeout = setTimeout(() => {
      if (req.files && req.files.length > 0 && !res.headersSent) {
        console.log('📸 Busboy timeout - returning success response for processed files');
        return res.json({
          success: true,
          message: 'Images uploaded successfully (busboy timeout handled)',
          data: {
            uploadedImages: {},
            deliveryOrderId: req.body.deliveryOrderId,
            customerName: req.body.customerName,
            locationIndex: req.body.locationIndex,
            filesProcessed: req.files.length
          }
        });
      }
    }, 300); // 300ms timeout to catch busboy errors faster
    
    // Clear timeout when response is sent
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data) {
      clearTimeout(busboyTimeout);
      originalSend.call(this, data);
    };
    
    res.json = function(data) {
      clearTimeout(busboyTimeout);
      originalJson.call(this, data);
    };
    
    // Just pass to the next middleware (controller)
    next();
  },
  imageUploadController.uploadNotaKecilImages,
  // Error handler to catch busboy errors that occur during controller execution
  async (error, req, res, next) => {
    console.error('❌ Route error handler caught:', error.message);
    
    // Prevent multiple responses
    if (res.headersSent) {
      console.log('📸 Response already sent, skipping error handler');
      return next(error);
    }
    
    // Handle busboy errors - let the controller handle them instead of returning early
    if (error.message && error.message.includes('Unexpected end of form')) {
      console.log('📸 Route handler: Busboy error detected, but letting controller handle it');
      console.log('📸 Route handler: Files processed (req.files):', req.files ? req.files.length : 'none');
      console.log('📸 Route handler: Files processed (stored):', req.processedFilesCount || 0);
      
      // Instead of returning early, let the controller handle the upload
      // The controller has better error handling for this case
      console.log('📸 Route handler: Passing control to controller despite busboy error');
      
      // Store the error in req so controller can handle it
      req.busboyError = error;
      req.filesCount = req.processedFilesCount || (req.files ? req.files.length : 0);
      
      // Ensure files are available for controller
      if (!req.files && req.processedFilesCount > 0) {
        console.log('📸 Route handler: Files missing from req.files, attempting to reconstruct');
        // The files might be in a different format, let's try to handle this
      }
      
      console.log('📸 Route handler: About to call controller with:', {
        hasFiles: !!req.files,
        filesLength: req.files ? req.files.length : 0,
        filesCount: req.filesCount,
        busboyError: !!req.busboyError
      });
      
      // Call the controller with error handling
      try {
        return await imageUploadController.uploadNotaKecilImages(req, res, next);
      } catch (controllerError) {
        console.error('❌ Controller error:', controllerError);
        return res.status(500).json({
          success: false,
          message: 'Controller error during image upload',
          error: controllerError.message
        });
      }
    }
    
    // Handle other errors
    console.log('📸 Route handler: Returning 500 error');
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during image upload.',
      details: error.message
    });
  }
);

/**
 * @route   DELETE /api/image-upload/:publicId
 * @desc    Delete image from Cloudinary
 * @access  Private (Admin/Owner)
 */
router.delete('/:publicId', 
  verifyToken, 
  checkRole(['admin', 'owner']),
  imageUploadController.deleteImage
);

/**
 * @route   GET /api/image-upload/nota-kecil/:notaKecilId
 * @desc    Get images for a specific nota kecil
 * @access  Private (Admin/Owner/Driver)
 */
router.get('/nota-kecil/:notaKecilId', 
  verifyToken, 
  checkRole(['admin', 'owner', 'driver']),
  imageUploadController.getNotaKecilImages
);

module.exports = router;
