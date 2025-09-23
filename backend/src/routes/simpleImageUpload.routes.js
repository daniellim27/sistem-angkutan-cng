const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const multer = require('multer');
const googleDriveService = require('../services/googleDriveService');
const { NotaKecil } = require('../models');

// Simple multer configuration - just accept one image file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
}).single('image'); // Accept only ONE file with field name 'image'

/**
 * @route   POST /api/simple-upload/nota-image
 * @desc    Upload single nota kecil image to Google Drive
 * @access  Private (Admin/Owner/Driver)
 */
router.post('/nota-image', 
  verifyToken, 
  checkRole(['admin', 'owner', 'driver']),
  (req, res, next) => {
    console.log('📸 Simple upload middleware processing request...');
    
    upload(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err.message);
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message
        });
      }
      
      console.log('✅ Multer processing completed successfully');
      console.log('📸 File received:', req.file ? req.file.originalname : 'none');
      
      next();
    });
  },
  async (req, res) => {
    try {
      console.log('🎯 Simple upload controller called');
      
      // Get request data
      const { deliveryOrderId, customerName, locationIndex, photoType, notaKecilId } = req.body;
      const file = req.file;
      
      console.log('📊 Request data:', {
        deliveryOrderId,
        customerName,
        locationIndex,
        photoType,
        notaKecilId,
        hasFile: !!file,
        fileName: file ? file.originalname : 'none'
      });
      
      // Validate required fields
      if (!deliveryOrderId || !customerName || !locationIndex || !photoType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: deliveryOrderId, customerName, locationIndex, photoType'
        });
      }
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }
      
      // Validate photo type
      const validPhotoTypes = ['pressure_bar', 'temperature', 'stan_awal', 'stan_akhir'];
      if (!validPhotoTypes.includes(photoType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid photo type. Must be one of: ' + validPhotoTypes.join(', ')
        });
      }
      
      console.log(`📸 Uploading ${photoType} image to Google Drive...`);
      
      // Upload to Google Drive
      const uploadResult = await googleDriveService.uploadNotaKecilImage(
        file,
        deliveryOrderId,
        customerName,
        locationIndex,
        photoType
      );
      
      console.log(`✅ Successfully uploaded ${photoType} image:`, uploadResult.filename);
      
      // Prepare response data
      const imageData = {
        url: uploadResult.publicUrl,
        filename: uploadResult.filename,
        fileId: uploadResult.fileId,
        uploadedAt: uploadResult.uploadedAt
      };
      
      // Update nota kecil record if ID provided
      if (notaKecilId) {
        try {
          const notaKecil = await NotaKecil.findByPk(notaKecilId);
          if (notaKecil) {
            // Get existing URLs
            const fieldName = photoType + '_photos_urls';
            const existingUrls = notaKecil[fieldName] || [];
            
            // Add new URL
            existingUrls.push(imageData);
            
            // Update database
            await notaKecil.update({
              [fieldName]: existingUrls
            });
            
            console.log(`✅ Updated nota kecil record with new ${photoType} image URL`);
          }
        } catch (updateError) {
          console.error('❌ Error updating nota kecil record:', updateError);
          // Don't fail the request if database update fails
        }
      }
      
      // Return success response
      res.json({
        success: true,
        message: `Successfully uploaded ${photoType} image to Google Drive`,
        data: {
          imageData,
          deliveryOrderId,
          customerName,
          locationIndex,
          photoType,
          notaKecilId
        }
      });
      
    } catch (error) {
      console.error('❌ Error in simple upload controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image to Google Drive',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/simple-upload/nota-image-test
 * @desc    Upload single nota kecil image to Google Drive (TEST - NO AUTH)
 * @access  Public (for testing only)
 */
router.post('/nota-image-test', 
  (req, res, next) => {
    console.log('📸 Simple upload test middleware processing request...');
    
    upload(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err.message);
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message
        });
      }
      
      console.log('✅ Multer processing completed successfully');
      console.log('📸 File received:', req.file ? req.file.originalname : 'none');
      
      next();
    });
  },
  async (req, res) => {
    try {
      console.log('🎯 Simple upload test controller called');
      
      // Get request data
      const { deliveryOrderId, customerName, locationIndex, photoType, notaKecilId } = req.body;
      const file = req.file;
      
      console.log('📊 Request data:', {
        deliveryOrderId,
        customerName,
        locationIndex,
        photoType,
        notaKecilId,
        hasFile: !!file,
        fileName: file ? file.originalname : 'none'
      });
      
      // Validate required fields
      if (!deliveryOrderId || !customerName || !locationIndex || !photoType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: deliveryOrderId, customerName, locationIndex, photoType'
        });
      }
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }
      
      // Validate photo type
      const validPhotoTypes = ['pressure_bar', 'temperature', 'stan_awal', 'stan_akhir'];
      if (!validPhotoTypes.includes(photoType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid photo type. Must be one of: ' + validPhotoTypes.join(', ')
        });
      }
      
      console.log(`📸 Uploading ${photoType} image to Google Drive...`);
      
      // Upload to Google Drive
      const uploadResult = await googleDriveService.uploadNotaKecilImage(
        file,
        deliveryOrderId,
        customerName,
        locationIndex,
        photoType
      );
      
      console.log(`✅ Successfully uploaded ${photoType} image:`, uploadResult.filename);
      
      // Prepare response data
      const imageData = {
        url: uploadResult.publicUrl,
        filename: uploadResult.filename,
        fileId: uploadResult.fileId,
        uploadedAt: uploadResult.uploadedAt
      };
      
      // Return success response
      res.json({
        success: true,
        message: `Successfully uploaded ${photoType} image to Google Drive (TEST)`,
        data: {
          imageData,
          deliveryOrderId,
          customerName,
          locationIndex,
          photoType,
          notaKecilId
        }
      });
      
    } catch (error) {
      console.error('❌ Error in simple upload test controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image to Google Drive',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/simple-upload/:fileId
 * @desc    Delete image from Google Drive
 * @access  Private (Admin/Owner)
 */
router.delete('/:fileId', 
  verifyToken, 
  checkRole(['admin', 'owner']),
  async (req, res) => {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        return res.status(400).json({
          success: false,
          message: 'File ID is required'
        });
      }

      await googleDriveService.deleteImage(fileId);

      res.json({
        success: true,
        message: 'Image deleted successfully from Google Drive'
      });

    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete image from Google Drive',
        error: error.message
      });
    }
  }
);

module.exports = router;
