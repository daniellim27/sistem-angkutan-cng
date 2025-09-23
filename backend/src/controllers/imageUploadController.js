const multer = require('multer');
const cloudinaryService = require('../services/cloudinaryService');
const { NotaKecil } = require('../models');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Configure multer to accept specific field names from mobile app
const uploadNotaKecilImages = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
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

/**
 * Upload nota kecil images to Cloudinary
 */
exports.uploadNotaKecilImages = async (req, res) => {
  console.log('🎯 CONTROLLER CALLED! uploadNotaKecilImages function started');
  
  // Check if this is a busboy error case from route handler
  if (req.busboyError) {
    console.log('📸 Controller received busboy error from route handler, processing files anyway');
    console.log('📸 Files count from route:', req.filesCount);
  }
  
  // Wrap the entire function in try-catch to prevent crashes
  try {
  
  // Handle busboy errors gracefully
  const handleBusboyError = (error) => {
    if (error.message && error.message.includes('Unexpected end of form') && req.files && req.files.length > 0) {
      console.log('📸 Busboy error detected in controller, but files were processed:', req.files.length);
      console.log('📸 Proceeding with file processing despite busboy error...');
      return true; // Continue processing
    }
    return false; // Don't continue processing
  };

  try {
    console.log('📸 Image upload request received:', {
      body: req.body,
      files: req.files ? (Array.isArray(req.files) ? req.files.map(f => f.fieldname) : Object.keys(req.files)) : 'no files',
      fileCount: req.files ? (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : 0
    });

    const { deliveryOrderId, customerName, locationIndex, notaKecilId } = req.body;
    
    if (!deliveryOrderId || !customerName || !locationIndex) {
      console.log('❌ Missing required fields:', { deliveryOrderId, customerName, locationIndex });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: deliveryOrderId, customerName, locationIndex'
      });
    }

    if (!req.files || (Array.isArray(req.files) ? req.files.length === 0 : Object.keys(req.files).length === 0)) {
      console.log('❌ No files uploaded');
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const photoTypes = ['Pressure-Bar', 'Temperature', 'Stan-Awal', 'Stan-Akhir'];
    const uploadedImages = {
      pressure_bar_photos_urls: [],
      temperature_photos_urls: [],
      stan_awal_photos_urls: [],
      stan_akhir_photos_urls: []
    };

    // Process each uploaded file - handle both array and object formats
    const filesToProcess = Array.isArray(req.files) ? req.files : Object.entries(req.files).flatMap(([fieldName, files]) => 
      files.map(file => ({ ...file, fieldname: fieldName }))
    );

    console.log('📸 Processing files:', filesToProcess.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })));

    for (const file of filesToProcess) {
      const fieldName = file.fieldname;
      
      // Map mobile field names to backend field names
      const fieldMapping = {
        'Pressure-Bar': 'pressure_bar',
        'Temperature': 'temperature', 
        'Stan-Awal': 'stan_awal',
        'Stan-Akhir': 'stan_akhir'
      };
      
      const mappedPhotoType = fieldMapping[fieldName] || fieldName;
      
      if (!photoTypes.includes(mappedPhotoType)) {
        console.warn(`Unknown photo type: ${fieldName} (mapped to: ${mappedPhotoType})`);
        continue;
      }

      try {
        console.log(`📸 Starting upload for ${fieldName} image:`, {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size || (file.buffer ? file.buffer.length : 'unknown'),
          hasBuffer: !!file.buffer,
          hasPath: !!file.path
        });

        const uploadResult = await cloudinaryService.uploadNotaKecilImage(
          file,
          deliveryOrderId,
          customerName,
          locationIndex,
          mappedPhotoType
        );

        console.log(`✅ Successfully uploaded ${fieldName} image:`, uploadResult.filename);

        // Add to appropriate array based on mapped photo type
        const targetFieldName = mappedPhotoType + '_photos_urls';
        if (uploadedImages[targetFieldName]) {
          uploadedImages[targetFieldName].push({
            url: uploadResult.secureUrl,
            filename: uploadResult.filename,
            publicId: uploadResult.publicId,
            uploadedAt: uploadResult.uploadedAt
          });
        }
      } catch (uploadError) {
        console.error(`❌ Error uploading ${fieldName} image:`, {
          error: uploadError.message,
          stack: uploadError.stack,
          file: {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size || (file.buffer ? file.buffer.length : 'unknown')
          }
        });
        // Continue with other files even if one fails
      }
    }

    // Update nota kecil record if ID provided
    if (notaKecilId) {
      try {
        const notaKecil = await NotaKecil.findByPk(notaKecilId);
        if (notaKecil) {
          // Merge with existing URLs
          const existingUrls = {
            pressure_bar_photos_urls: notaKecil.pressure_bar_photos_urls || [],
            temperature_photos_urls: notaKecil.temperature_photos_urls || [],
            stan_awal_photos_urls: notaKecil.stan_awal_photos_urls || [],
            stan_akhir_photos_urls: notaKecil.stan_akhir_photos_urls || []
          };

          // Merge new URLs with existing ones
          Object.keys(uploadedImages).forEach(key => {
            if (uploadedImages[key].length > 0) {
              existingUrls[key] = [...(existingUrls[key] || []), ...uploadedImages[key]];
            }
          });

          await notaKecil.update(existingUrls);
        }
      } catch (updateError) {
        console.error('Error updating nota kecil record:', updateError);
        // Don't fail the entire request if database update fails
      }
    }

    // Check if any images were successfully uploaded
    const totalUploaded = Object.values(uploadedImages).reduce((total, arr) => total + arr.length, 0);
    
    if (totalUploaded === 0) {
      console.log('⚠️ No images were successfully uploaded');
      return res.status(400).json({
        success: false,
        message: 'No images could be uploaded to Cloudinary',
        data: {
          uploadedImages,
          deliveryOrderId,
          customerName,
          locationIndex,
          filesProcessed: filesToProcess.length
        }
      });
    }

    console.log(`✅ Successfully uploaded ${totalUploaded} images to Cloudinary`);
    res.json({
      success: true,
      message: `Successfully uploaded ${totalUploaded} images to Cloudinary`,
      data: {
        uploadedImages,
        deliveryOrderId,
        customerName,
        locationIndex,
        totalUploaded
      }
    });

  } catch (error) {
    console.error('❌ Error in uploadNotaKecilImages:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Check if this is a busboy error and we have files
    if (handleBusboyError(error)) {
      console.log('📸 Handling busboy error in controller catch block - attempting file upload anyway');
      
      // Always try to process files even with busboy error
      const { deliveryOrderId, customerName, locationIndex } = req.body;
      const photoTypes = ['Pressure-Bar', 'Temperature', 'Stan-Awal', 'Stan-Akhir'];
      const uploadedImages = {
        pressure_bar_photos_urls: [],
        temperature_photos_urls: [],
        stan_awal_photos_urls: [],
        stan_akhir_photos_urls: []
      };

      // Process files even with busboy error
      const filesToProcess = Array.isArray(req.files) ? req.files : Object.entries(req.files).flatMap(([fieldName, files]) => 
        files.map(file => ({ ...file, fieldname: fieldName }))
      );

      console.log('📸 Processing files despite busboy error:', filesToProcess.length, 'files');

      for (const file of filesToProcess) {
        const fieldName = file.fieldname;
        const fieldMapping = {
          'Pressure-Bar': 'pressure_bar',
          'Temperature': 'temperature', 
          'Stan-Awal': 'stan_awal',
          'Stan-Akhir': 'stan_akhir'
        };
        
        const mappedPhotoType = fieldMapping[fieldName] || fieldName;
        
        if (!photoTypes.includes(mappedPhotoType)) {
          console.warn(`Unknown photo type: ${fieldName} (mapped to: ${mappedPhotoType})`);
          continue;
        }

        try {
          console.log(`📸 Uploading ${fieldName} image to Cloudinary...`);
          const uploadResult = await cloudinaryService.uploadNotaKecilImage(
            file,
            deliveryOrderId,
            customerName,
            locationIndex,
            mappedPhotoType
          );

          const targetFieldName = mappedPhotoType + '_photos_urls';
          if (uploadedImages[targetFieldName]) {
            uploadedImages[targetFieldName].push({
              url: uploadResult.secureUrl,
              filename: uploadResult.filename,
              publicId: uploadResult.publicId,
              uploadedAt: uploadResult.uploadedAt
            });
            console.log(`✅ Successfully uploaded ${fieldName} image:`, uploadResult.filename);
          }
        } catch (uploadError) {
          console.error(`❌ Error uploading ${fieldName} image:`, uploadError);
        }
      }

      // Update nota kecil record if ID provided
      if (req.body.notaKecilId) {
        try {
          const notaKecil = await NotaKecil.findByPk(req.body.notaKecilId);
          if (notaKecil) {
            // Merge with existing URLs
            const existingUrls = {
              pressure_bar_photos_urls: notaKecil.pressure_bar_photos_urls || [],
              temperature_photos_urls: notaKecil.temperature_photos_urls || [],
              stan_awal_photos_urls: notaKecil.stan_awal_photos_urls || [],
              stan_akhir_photos_urls: notaKecil.stan_akhir_photos_urls || []
            };

            // Merge new URLs with existing ones
            Object.keys(uploadedImages).forEach(key => {
              if (uploadedImages[key].length > 0) {
                existingUrls[key] = [...(existingUrls[key] || []), ...uploadedImages[key]];
              }
            });

            await notaKecil.update(existingUrls);
            console.log('✅ Updated nota kecil record with new image URLs');
          }
        } catch (updateError) {
          console.error('❌ Error updating nota kecil record:', updateError);
        }
      }

      const totalUploaded = Object.values(uploadedImages).reduce((total, arr) => total + arr.length, 0);
      
      return res.json({
        success: totalUploaded > 0,
        message: totalUploaded > 0 
          ? `Successfully uploaded ${totalUploaded} images to Cloudinary (busboy error handled)`
          : 'Images processed but Cloudinary upload failed due to busboy error',
        data: {
          uploadedImages,
          deliveryOrderId,
          customerName,
          locationIndex,
          filesProcessed: filesToProcess.length,
          totalUploaded
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
  
  } catch (outerError) {
    console.error('❌ Outer catch block - unexpected error:', outerError);
    
    // If response not sent, send error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Unexpected error occurred during image upload',
        error: outerError.message
      });
    }
  }
};

/**
 * Delete image from Cloudinary
 */
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    await cloudinaryService.deleteImage(publicId);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
};

/**
 * Get images for a specific nota kecil
 */
exports.getNotaKecilImages = async (req, res) => {
  try {
    const { notaKecilId } = req.params;

    const notaKecil = await NotaKecil.findByPk(notaKecilId);
    if (!notaKecil) {
      return res.status(404).json({
        success: false,
        message: 'Nota kecil not found'
      });
    }

    const images = {
      pressure_bar_photos_urls: notaKecil.pressure_bar_photos_urls || [],
      temperature_photos_urls: notaKecil.temperature_photos_urls || [],
      stan_awal_photos_urls: notaKecil.stan_awal_photos_urls || [],
      stan_akhir_photos_urls: notaKecil.stan_akhir_photos_urls || []
    };

    res.json({
      success: true,
      data: images
    });

  } catch (error) {
    console.error('Error getting nota kecil images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get images',
      error: error.message
    });
  }
};

module.exports = {
  uploadNotaKecilImages: uploadNotaKecilImages, // Use the specific field configuration
  deleteImage: exports.deleteImage,
  getNotaKecilImages: exports.getNotaKecilImages
};
