// src/controllers/loadConfirmation.controller.js
const { DeliveryOrder, DriverProfile, Vehicle } = require("../models");
const path = require("path");
const fs = require("fs");
const ocrService = require("../services/ocrService");

/**
 * @desc    Confirm load - Driver confirms actual load and uploads surat jalan photo
 * @route   POST /api/delivery-orders/:id/confirm-load
 * @access  Private (Driver only)
 */
exports.confirmLoad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { actual_load_quantity } = req.body;
    const driverId = req.user.id;

    console.log("Confirm load request:", {
      id,
      actual_load_quantity,
      driverId,
    });
    console.log("Uploaded file:", req.file);
    console.log("All uploaded files:", req.files);
    console.log("Request body:", req.body);
    console.log("Content-Type:", req.headers['content-type']);

    // Validasi input
    if (!actual_load_quantity) {
      return res.status(400).json({
        message: "Berat muatan aktual harus diisi.",
      });
    }

    // Accept both single and multiple file upload
    let suratJalanFile = req.file;
    const suratJalanFiles = req.files || []; // Ensure it's always an array

    console.log("Files received:", {
      file: req.file,
      files: req.files,
      filesLength: suratJalanFiles.length
    });

    if (!suratJalanFile && suratJalanFiles.length > 0) {
      suratJalanFile = suratJalanFiles[0];
    }

    // Foto surat jalan now optional - can be uploaded later
    // if (!suratJalanFile && suratJalanFiles.length === 0) {
    //   return res.status(400).json({
    //     message: "Foto surat jalan harus diupload.",
    //   });
    // }

    // Cari delivery order first
    const deliveryOrder = await DeliveryOrder.findOne({
      where: {
        id,
        driver_id: driverId,
      },
    });

    if (!deliveryOrder) {
      return res.status(404).json({
        message:
          "Delivery Order tidak ditemukan atau Anda tidak berhak mengaksesnya.",
      });
    }

    // Process file upload to Cloudinary - handle both single file and multiple files
    let surat_jalan_photo_url = [];
    
    if (suratJalanFiles.length > 0 || suratJalanFile) {
      const cloudinaryService = require('../services/cloudinaryService');
      const filesToUpload = suratJalanFiles.length > 0 ? suratJalanFiles : (suratJalanFile ? [suratJalanFile] : []);
      
      try {
        for (const file of filesToUpload) {
          // Check if file has buffer (memory storage) or path (disk storage - backward compatibility)
          if (!file.buffer && !file.path) {
            console.warn('Skipping file without buffer or path:', file);
            continue;
          }

          console.log(`Uploading surat jalan photo to Cloudinary:`, {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.buffer ? file.buffer.length : (file.size || 'unknown'),
            hasBuffer: !!file.buffer,
            hasPath: !!file.path
          });

          const uploadResult = await cloudinaryService.uploadSuratJalanImage(file, id);
          surat_jalan_photo_url.push(uploadResult.secureUrl);
          
          console.log(`✅ Uploaded to Cloudinary: ${uploadResult.secureUrl}`);
        }
      } catch (uploadError) {
        console.error("Error uploading to Cloudinary:", uploadError);
        return res.status(500).json({
          message: "Gagal mengunggah foto surat jalan ke Cloudinary: " + uploadError.message,
        });
      }
    }

    // Verifikasi status - Driver should be able to confirm load when at SPBU
    if (deliveryOrder.status !== "at_spbu") {
      return res.status(400).json({
        message: `Tidak dapat konfirmasi muatan. Status saat ini: ${deliveryOrder.status}. Anda harus berada di SPBU untuk konfirmasi muatan.`,
      });
    }

    // Validasi quantity
    const actualQuantity = parseFloat(actual_load_quantity);
    const minimalQuantity = parseFloat(deliveryOrder.minimal_load_quantity);

    if (actualQuantity < minimalQuantity) {
      return res.status(400).json({
        message: `Muatan aktual (${actualQuantity} ton) kurang dari minimal yang ditetapkan (${minimalQuantity} ton).`,
      });
    }

    // Update delivery order
    await deliveryOrder.update({
      actual_load_quantity: actualQuantity,
      surat_jalan_photo_url, // now always an array
      status: "otw_to_unload_location",
      departed_from_spbu_at: new Date(),
    });

    // Calculate progress info
    const loadProgress = {
      percentage: (actualQuantity / minimalQuantity) * 100,
      excess:
        actualQuantity > minimalQuantity ? actualQuantity - minimalQuantity : 0,
      shortage:
        actualQuantity < minimalQuantity ? minimalQuantity - actualQuantity : 0,
      meets_minimum: actualQuantity >= minimalQuantity,
    };

    res.status(200).json({
      message:
        "Konfirmasi muatan berhasil. Perjalanan ke lokasi bongkar dimulai.",
      delivery_order: {
        id: deliveryOrder.id,
        do_number: deliveryOrder.do_number,
        status: deliveryOrder.status,
        status_text: "Menuju Lokasi Bongkar",
        minimal_load_quantity: minimalQuantity,
        actual_load_quantity: actualQuantity,
        load_progress: loadProgress,
        departed_from_spbu_at:
          deliveryOrder.departed_from_spbu_at,
        surat_jalan_photo_url: surat_jalan_photo_url,
      },
    });

    console.log("Request body:", req.body);
    console.log("Uploaded file details:", {
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      path: req.file?.path,
    });
  } catch (error) {
    console.error("Full error in confirmLoad:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      response: error.response?.data,
    });
    next(error);
  }
};

/**
 * @desc    Upload surat jalan photos separately from load confirmation
 * @route   POST /api/delivery-orders/:id/upload-surat-jalan
 * @access  Private (Driver only)
 */
exports.uploadSuratJalanPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;
    const cloudinaryService = require('../services/cloudinaryService');

    console.log("Upload surat jalan photo request:", {
      id,
      driverId,
    });
    console.log("Uploaded files:", req.files);

    // Accept both single and multiple file upload
    const suratJalanFiles = req.files || [];

    console.log("Files received:", {
      filesLength: suratJalanFiles.length
    });

    if (suratJalanFiles.length === 0) {
      return res.status(400).json({
        message: "Minimal 1 foto surat jalan harus diupload.",
      });
    }

    // Cari delivery order first
    const deliveryOrder = await DeliveryOrder.findOne({
      where: {
        id,
        driver_id: driverId,
      },
    });

    if (!deliveryOrder) {
      return res.status(404).json({
        message:
          "Delivery Order tidak ditemukan atau Anda tidak berhak mengaksesnya.",
      });
    }

    // Process file upload to Cloudinary - handle multiple files
    let surat_jalan_photo_url = [];
    
    try {
      for (const file of suratJalanFiles) {
        console.log(`Uploading surat jalan photo to Cloudinary:`, {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.buffer ? file.buffer.length : 'unknown'
        });

        const uploadResult = await cloudinaryService.uploadSuratJalanImage(file, id);
        surat_jalan_photo_url.push(uploadResult.secureUrl);
        
        console.log(`✅ Uploaded to Cloudinary: ${uploadResult.secureUrl}`);
      }
    } catch (uploadError) {
      console.error("Error uploading to Cloudinary:", uploadError);
      return res.status(500).json({
        message: "Gagal mengunggah foto surat jalan ke Cloudinary: " + uploadError.message,
      });
    }

    // Update delivery order with surat jalan photos
    const existingPhotos = deliveryOrder.surat_jalan_photo_url || [];
    const updatedPhotos = [...existingPhotos, ...surat_jalan_photo_url];

    await deliveryOrder.update({
      surat_jalan_photo_url: updatedPhotos,
    });

    // Process OCR on the first uploaded photo
    let ocrResult = null;
    if (suratJalanFiles.length > 0 && suratJalanFiles[0].buffer) {
      try {
        console.log("Starting OCR processing for surat jalan...");
        const firstPhoto = suratJalanFiles[0];
        const imageBuffer = firstPhoto.buffer;
        
        console.log(`Image buffer size: ${imageBuffer.length} bytes`);
        
        // Check OCR service configuration
        const config = ocrService.checkConfiguration();
        if (!config.isConfigured) {
          throw new Error('OCR service is not properly configured. Please check OPENAI_API_KEY.');
        }
        
        ocrResult = await ocrService.processSuratJalanImage(imageBuffer);
        console.log("OCR processing completed:", JSON.stringify(ocrResult, null, 2));

        // Validate OCR result
        if (!ocrResult || typeof ocrResult !== 'object') {
          throw new Error('Invalid OCR result received');
        }

        // Update delivery order with OCR results
        const updateData = {
          surat_jalan_ocr_data: ocrResult,
          surat_jalan_ocr_confidence: ocrResult.overall_confidence || 0,
          surat_jalan_volume_extracted: ocrResult.total_volume_pengisian || null,
          surat_jalan_ocr_processed_at: new Date()
        };
        
        console.log("Updating delivery order with OCR data:", updateData);
        await deliveryOrder.update(updateData);

        console.log("✅ OCR results saved to delivery order");
      } catch (ocrError) {
        console.error("❌ OCR processing failed:", {
          message: ocrError.message,
          stack: ocrError.stack,
          deliveryOrderId: id
        });
        
        // Save error information to delivery order for debugging
        try {
          await deliveryOrder.update({
            surat_jalan_ocr_data: {
              error: ocrError.message,
              processed_at: new Date(),
              status: 'failed'
            },
            surat_jalan_ocr_processed_at: new Date()
          });
        } catch (saveError) {
          console.error("Failed to save OCR error to database:", saveError);
        }
        
        // Don't fail the upload if OCR fails - just log it
      }
    }

    res.status(200).json({
      message: "Foto surat jalan berhasil diupload" + (ocrResult ? " dan diproses dengan OCR" : ""),
      delivery_order: {
        id: deliveryOrder.id,
        do_number: deliveryOrder.do_number,
        status: deliveryOrder.status,
        surat_jalan_photo_url: updatedPhotos,
        ocr_result: ocrResult ? {
          total_volume_pengisian: ocrResult.total_volume_pengisian,
          confidence: ocrResult.overall_confidence,
          extracted_at: ocrResult.extracted_at
        } : null,
        photos_uploaded: surat_jalan_photo_url.length,
        total_photos: updatedPhotos.length,
      },
    });

    console.log("Surat jalan photos uploaded successfully:", {
      orderId: id,
      newPhotos: surat_jalan_photo_url.length,
      totalPhotos: updatedPhotos.length
    });
  } catch (error) {
    console.error("Full error in uploadSuratJalanPhoto:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    next(error);
  }
};

/**
 * @desc    Retry OCR processing for surat jalan photos
 * @route   POST /api/delivery-orders/:id/retry-surat-jalan-ocr
 * @access  Private (Admin only)
 */
exports.retrySuratJalanOCR = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log("Retry surat jalan OCR request for DO:", id);

    // Find delivery order
    const deliveryOrder = await DeliveryOrder.findByPk(id);

    if (!deliveryOrder) {
      return res.status(404).json({
        message: "Delivery Order tidak ditemukan."
      });
    }

    // Check if surat jalan photos exist
    if (!deliveryOrder.surat_jalan_photo_url || deliveryOrder.surat_jalan_photo_url.length === 0) {
      return res.status(400).json({
        message: "Tidak ada foto surat jalan untuk diproses."
      });
    }

    console.log("Found surat jalan photos:", deliveryOrder.surat_jalan_photo_url);

    // Process OCR on the first photo
    let ocrResult = null;
    try {
      const firstPhotoUrl = deliveryOrder.surat_jalan_photo_url[0];
      let imageBuffer;
      
      // Check if it's a Cloudinary URL or local file path
      if (firstPhotoUrl.startsWith('http://') || firstPhotoUrl.startsWith('https://')) {
        // Cloudinary URL - fetch the image
        console.log('Fetching image from Cloudinary URL:', firstPhotoUrl);
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const imageUrl = firstPhotoUrl;
        const protocol = imageUrl.startsWith('https') ? https : http;
        
        imageBuffer = await new Promise((resolve, reject) => {
          protocol.get(imageUrl, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to fetch image: ${response.statusCode}`));
              return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
              resolve(Buffer.concat(chunks));
            });
            response.on('error', reject);
          }).on('error', reject);
        });
        
        console.log(`Fetched image from Cloudinary, buffer size: ${imageBuffer.length} bytes`);
      } else {
        // Local file path - read from filesystem (backward compatibility)
        console.log('Reading image from local file path:', firstPhotoUrl);
        
        let fullPath = firstPhotoUrl;
        if (!path.isAbsolute(firstPhotoUrl)) {
          // Handle different possible path formats
          if (firstPhotoUrl.startsWith('uploads/')) {
            // Path like "uploads/surat_jalan_photos/file.jpg" - relative to backend directory
            fullPath = path.join(__dirname, '../../..', firstPhotoUrl);
          } else {
            // Path like "surat_jalan_photos/file.jpg" - relative to uploads directory
            fullPath = path.join(__dirname, '../../../uploads', firstPhotoUrl);
          }
        }
        
        console.log('Resolving file path:', {
          original: firstPhotoUrl,
          resolved: fullPath,
          exists: fs.existsSync(fullPath)
        });
        
        if (!fs.existsSync(fullPath)) {
          throw new Error(`Surat jalan photo file not found: ${fullPath}`);
        }
        
        imageBuffer = fs.readFileSync(fullPath);
        console.log(`Read image from local file, buffer size: ${imageBuffer.length} bytes`);
      }
      
      // Check OCR service configuration
      const config = ocrService.checkConfiguration();
      if (!config.isConfigured) {
        throw new Error('OCR service is not properly configured. Please check OPENAI_API_KEY.');
      }
      
      ocrResult = await ocrService.processSuratJalanImage(imageBuffer);
      console.log("OCR retry processing completed:", JSON.stringify(ocrResult, null, 2));

      // Validate OCR result
      if (!ocrResult || typeof ocrResult !== 'object') {
        throw new Error('Invalid OCR result received');
      }

      // Update delivery order with OCR results
      const updateData = {
        surat_jalan_ocr_data: ocrResult,
        surat_jalan_ocr_confidence: ocrResult.overall_confidence || 0,
        surat_jalan_volume_extracted: ocrResult.total_volume_pengisian || null,
        surat_jalan_ocr_processed_at: new Date()
      };
      
      console.log("Updating delivery order with retry OCR data:", updateData);
      await deliveryOrder.update(updateData);

      console.log("✅ OCR retry results saved to delivery order");
    } catch (ocrError) {
      console.error("❌ OCR retry processing failed:", {
        message: ocrError.message,
        stack: ocrError.stack,
        deliveryOrderId: id
      });
      
      // Save error information to delivery order for debugging
      try {
        await deliveryOrder.update({
          surat_jalan_ocr_data: {
            error: ocrError.message,
            processed_at: new Date(),
            status: 'failed',
            retry_attempt: true
          },
          surat_jalan_ocr_processed_at: new Date()
        });
      } catch (saveError) {
        console.error("Failed to save OCR retry error to database:", saveError);
      }
      
      return res.status(500).json({
        message: "OCR processing failed: " + ocrError.message,
        error: ocrError.message
      });
    }

    res.status(200).json({
      message: "OCR processing berhasil dijalankan ulang" + (ocrResult ? " dan berhasil" : ""),
      delivery_order: {
        id: deliveryOrder.id,
        do_number: deliveryOrder.do_number,
        ocr_result: ocrResult ? {
          total_volume_pengisian: ocrResult.total_volume_pengisian,
          confidence: ocrResult.overall_confidence,
          extracted_at: ocrResult.extracted_at
        } : null
      }
    });

  } catch (error) {
    console.error("Full error in retrySuratJalanOCR:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    next(error);
  }
};

/**
 * @desc    Get load confirmation status
 * @route   GET /api/delivery-orders/:id/load-status
 * @access  Private (Driver + Admin)
 */
exports.getLoadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const deliveryOrder = await DeliveryOrder.findByPk(id);

    if (!deliveryOrder) {
      return res.status(404).json({
        message: "Delivery Order tidak ditemukan.",
      });
    }

    // Security check
    if (user.role === "driver" && deliveryOrder.driver_id !== user.id) {
      return res.status(403).json({
        message: "Anda tidak berhak mengakses data ini.",
      });
    }

    const response = {
      id: deliveryOrder.id,
      do_number: deliveryOrder.do_number,
      status: deliveryOrder.status,
      minimal_load_quantity: deliveryOrder.minimal_load_quantity,
      actual_load_quantity: deliveryOrder.actual_load_quantity,
      has_load_confirmation: !!(
        deliveryOrder.actual_load_quantity &&
        deliveryOrder.surat_jalan_photo_url
      ),
      surat_jalan_photo_url: deliveryOrder.surat_jalan_photo_url,
      departed_from_spbu_at:
        deliveryOrder.departed_from_spbu_at,
      can_confirm_load: deliveryOrder.status === "at_spbu",
    };

    if (
      deliveryOrder.actual_load_quantity &&
      deliveryOrder.minimal_load_quantity
    ) {
      const actual = parseFloat(deliveryOrder.actual_load_quantity);
      const minimal = parseFloat(deliveryOrder.minimal_load_quantity);
      response.load_progress = {
        percentage: (actual / minimal) * 100,
        excess: actual > minimal ? actual - minimal : 0,
        shortage: actual < minimal ? minimal - actual : 0,
        meets_minimum: actual >= minimal,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("Error in getLoadStatus:", error);
    next(error);
  }
};
