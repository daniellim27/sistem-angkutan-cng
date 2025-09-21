// src/controllers/loadConfirmation.controller.js
const { DeliveryOrder, DriverProfile, Vehicle } = require("../models");
const path = require("path");

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

    // Process file upload - handle both single file and multiple files
    let surat_jalan_photo_url = [];
    
    if (suratJalanFiles.length > 0) {
      // Multiple files uploaded
      surat_jalan_photo_url = suratJalanFiles.map((f) =>
        f.path.replace(/\\/g, "/")
      );
    } else if (suratJalanFile) {
      // Single file uploaded  
      surat_jalan_photo_url = [suratJalanFile.path.replace(/\\/g, "/")];
    }

    // Cari delivery order
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

    // Verifikasi status
    if (deliveryOrder.status !== "at_unload_location") {
      return res.status(400).json({
        message: `Tidak dapat konfirmasi muatan. Status saat ini: ${deliveryOrder.status}`,
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

    // Process file upload - handle multiple files
    let surat_jalan_photo_url = [];
    
    if (suratJalanFiles.length > 0) {
      // Multiple files uploaded
      surat_jalan_photo_url = suratJalanFiles.map((f) =>
        f.path.replace(/\\/g, "/")
      );
    }

    // Cari delivery order
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

    // Update delivery order with surat jalan photos
    const existingPhotos = deliveryOrder.surat_jalan_photo_url || [];
    const updatedPhotos = [...existingPhotos, ...surat_jalan_photo_url];

    await deliveryOrder.update({
      surat_jalan_photo_url: updatedPhotos,
    });

    res.status(200).json({
      message: "Foto surat jalan berhasil diupload.",
      delivery_order: {
        id: deliveryOrder.id,
        do_number: deliveryOrder.do_number,
        status: deliveryOrder.status,
        surat_jalan_photo_url: updatedPhotos,
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
      can_confirm_load: deliveryOrder.status === "at_unload_location",
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
