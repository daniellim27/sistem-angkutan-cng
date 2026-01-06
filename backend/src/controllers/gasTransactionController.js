// backend/src/controllers/gasTransactionController.js
const { GasTransaction, DepositGroup, Vehicle, User, DriverProfile } = require('../models');
const receiptOcrService = require('../services/receiptOcrService');
const fs = require('fs'); // Add this import
const { Op } = require('sequelize');

/**
 * Create a gas transaction (fire-and-forget) with OCR extraction
 * POST /api/gas-transactions
 */
exports.createGasTransaction = async (req, res, next) => {
  try {
    const {
      deposit_group_id,
      delivery_order_id,
      vehicle_id,
      // These fields are now optional - will be extracted by OCR
      volume_m3,
      calculation_method,
      rate_per_m3,
      jisdor_rate,
      total_cost,
      nota_ocr_data,
      biaya_lain_amount,
      biaya_lain_description
    } = req.body;

    const driverId = req.user?.id;

    // Handle file uploads from req.files (multer stores them here)
    const files = req.files || {};
    const suratJalanFile = files.surat_jalan_photo?.[0];
    const notaFile = files.nota_photo?.[0]; // This is the receipt for OCR
    const biayaLainFile = files.biaya_lain_photo?.[0];

    // Store file paths (relative to /uploads route)
    const suratJalanPhotoUrl = suratJalanFile ? `/uploads/receipts/${suratJalanFile.filename}` : null;
    const notaPhotoUrl = notaFile ? `/uploads/receipts/${notaFile.filename}` : null; // This is used for OCR
    const biayaLainPhotoUrl = biayaLainFile ? `/uploads/receipts/${biayaLainFile.filename}` : null;

    // Check if we have a nota photo for OCR
    let ocrExtractedData = null;
    let extractedFields = null;

    if (notaFile && notaFile.path) {
      try {
        console.log('🔍 Starting OCR extraction from receipt...');
        
        // Read the file directly from the file system (multer saves it temporarily)
        const imageBuffer = fs.readFileSync(notaFile.path);
        
        // Extract data from receipt using OCR with the buffer
        const ocrResult = await receiptOcrService.processReceipt(imageBuffer);
        
        if (ocrResult.success && ocrResult.data) {
          ocrExtractedData = ocrResult.data;
          console.log('✅ OCR extraction successful:', {
            volume_m3: ocrExtractedData.volume_m3,
            rate_per_m3: ocrExtractedData.rate_per_m3,
            total_cost: ocrExtractedData.total_cost
          });
          
          // Mark which fields were extracted by OCR
          extractedFields = {
            volume_m3: !!ocrExtractedData.volume_m3,
            rate_per_m3: !!ocrExtractedData.rate_per_m3,
            total_cost: !!ocrExtractedData.total_cost
          };
        } else {
          console.warn('⚠️ OCR extraction failed or incomplete:', ocrResult.error);
        }
      } catch (ocrError) {
        console.error('❌ OCR processing error:', ocrError);
        // Don't fail the transaction if OCR fails
      }
    }

    // Determine final values: use OCR-extracted data if available, otherwise use manual input
    const finalVolumeM3 = ocrExtractedData?.volume_m3 || volume_m3;
    const finalCalculationMethod = ocrExtractedData?.calculation_method || calculation_method || 'fixed_rate';
    const finalRatePerM3 = ocrExtractedData?.rate_per_m3 || rate_per_m3;
    const finalTotalCost = ocrExtractedData?.total_cost || total_cost;
    const finalJisdorRate = jisdor_rate; // Not from OCR, only manual

    // Validate required fields (either from OCR or manual)
    if (!finalVolumeM3 || !finalRatePerM3 || !finalTotalCost) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: volume_m3, rate_per_m3, total_cost',
        details: {
          ocr_used: !!ocrExtractedData,
          ocr_success: ocrExtractedData ? 'partial' : 'failed',
          required: {
            volume_m3: !finalVolumeM3,
            rate_per_m3: !finalRatePerM3,
            total_cost: !finalTotalCost
          }
        }
      });
    }

    // Get vehicle_id from user's vehicle if not provided
    let finalVehicleId = vehicle_id;
    if (!finalVehicleId && driverId) {
      const vehicle = await Vehicle.findOne({
        where: { driver_id: driverId }
      });
      if (vehicle) {
        finalVehicleId = vehicle.id;
      }
    }

    // delivery_order_id is optional
    const finalDeliveryOrderId = delivery_order_id || null;

    // Prepare OCR data snapshot
    const notaSnapshot = {
      surat_jalan_photo_url: suratJalanPhotoUrl,
      nota_photo_url: notaPhotoUrl,
      biaya_lain_photo_url: biayaLainPhotoUrl,
      biaya_lain_amount: biaya_lain_amount ? parseFloat(biaya_lain_amount) : null,
      biaya_lain_description: biaya_lain_description || null,
      submitted_at: new Date().toISOString(),
      ocr_used: !!ocrExtractedData,
      ocr_extracted_fields: extractedFields,
      ocr_confidence: ocrExtractedData?.ocr_confidence || null,
      manual_override: !ocrExtractedData // True if user manually entered data
    };

    // Create gas transaction
    const gasTransaction = await GasTransaction.create({
      deposit_group_id: deposit_group_id || null,
      delivery_order_id: finalDeliveryOrderId,
      driver_id: driverId,
      vehicle_id: finalVehicleId || null,
      volume_m3: parseFloat(finalVolumeM3),
      calculation_method: finalCalculationMethod,
      rate_per_m3: parseFloat(finalRatePerM3),
      jisdor_rate: finalJisdorRate ? parseFloat(finalJisdorRate) : null,
      total_cost: parseFloat(finalTotalCost),
      status: 'pending',
      surat_jalan_photo_url: suratJalanPhotoUrl,
      nota_photo_url: notaPhotoUrl,
      biaya_lain_photo_url: biayaLainPhotoUrl,
      biaya_lain_amount: biaya_lain_amount ? parseFloat(biaya_lain_amount) : null,
      biaya_lain_description: biaya_lain_description || null,
      nota_ocr_data: notaSnapshot
    });

    res.json({
      success: true,
      message: 'Gas transaction submitted successfully',
      data: {
        id: gasTransaction.id,
        status: gasTransaction.status,
        ocr_extracted: !!ocrExtractedData,
        volume_m3: gasTransaction.volume_m3,
        rate_per_m3: gasTransaction.rate_per_m3,
        total_cost: gasTransaction.total_cost,
        calculation_method: gasTransaction.calculation_method
      }
    });

  } catch (error) {
    console.error('Error creating gas transaction:', error);
    next(error);
  }
};

/**
 * Get gas transactions by deposit_group_id (for SPBG tagihan)
 * GET /api/gas-transactions/by-deposit-group/:deposit_group_id
 */
exports.getGasTransactionsByDepositGroup = async (req, res, next) => {
  try {
    const deposit_group_id = parseInt(req.params.deposit_group_id, 10);

    if (isNaN(deposit_group_id)) {
      return res.status(400).json({ success: false, message: 'Invalid deposit_group_id' });
    }

    const gasTransactions = await GasTransaction.findAll({
      where: {
        deposit_group_id: deposit_group_id
      },
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type'],
          required: false
        },
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          required: false,
          include: [{
            model: DriverProfile,
            as: 'driverProfile',
            attributes: ['full_name', 'phone'],
            required: false
          }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: gasTransactions
    });
  } catch (error) {
    console.error('Error getting gas transactions by deposit group:', error?.stack || error);
    // Return a clear message for the mobile client in development
    return res.status(500).json({ success: false, message: 'Failed to fetch gas transactions', details: error?.message || String(error) });
  }
};


