// backend/src/controllers/gasTransactionController.js
const { GasTransaction, DepositGroup, Vehicle, User, DriverProfile, sequelize } = require('../models');
const { Op } = require('sequelize');
const receiptOcrService = require('../services/receiptOcrService');
const fs = require('fs'); // Add this import

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
            volume_liters: ocrExtractedData.volume_liters,
            rate_per_liter: ocrExtractedData.rate_per_liter,
            total_cost: ocrExtractedData.total_cost
          });
          
          // Mark which fields were extracted by OCR
          extractedFields = {
            volume_liters: !!ocrExtractedData.volume_liters,
            rate_per_liter: !!ocrExtractedData.rate_per_liter,
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
    // Note: volume_m3 field stores liters (for backward compatibility with DB schema)
    const finalVolumeLiters = ocrExtractedData?.volume_liters || volume_m3;
    const finalCalculationMethod = ocrExtractedData?.calculation_method || calculation_method || 'fixed_rate';
    const finalRatePerLiter = ocrExtractedData?.rate_per_liter || rate_per_m3;
    const finalTotalCost = ocrExtractedData?.total_cost || total_cost;
    const finalJisdorRate = jisdor_rate; // Not from OCR, only manual

    // Validate required fields (either from OCR or manual)
    if (!finalVolumeLiters || !finalRatePerLiter || !finalTotalCost) {
      console.error('❌ Missing required fields:', {
        finalVolumeLiters,
        finalRatePerLiter,
        finalTotalCost,
        ocrExtractedData: !!ocrExtractedData
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: volume_liters, rate_per_liter, total_cost',
        details: {
          ocr_used: !!ocrExtractedData,
          ocr_success: ocrExtractedData ? 'partial' : 'failed',
          required: {
            volume_liters: !finalVolumeLiters,
            rate_per_liter: !finalRatePerLiter,
            total_cost: !finalTotalCost
          }
        }
      });
    }

    // Validate that values are valid numbers
    const volumeNum = parseFloat(finalVolumeLiters);
    const rateNum = parseFloat(finalRatePerLiter);
    const totalNum = parseFloat(finalTotalCost);

    if (isNaN(volumeNum) || isNaN(rateNum) || isNaN(totalNum)) {
      console.error('❌ Invalid number values:', {
        volumeNum,
        rateNum,
        totalNum,
        finalVolumeLiters,
        finalRatePerLiter,
        finalTotalCost
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid number values provided',
        details: {
          volume_liters: isNaN(volumeNum),
          rate_per_liter: isNaN(rateNum),
          total_cost: isNaN(totalNum)
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
      manual_override: !ocrExtractedData, // True if user manually entered data
      // Store OCR extracted values for display even if main fields are 0/null
      ocr_extracted_values: ocrExtractedData ? {
        volume_liters: ocrExtractedData.volume_liters ? parseFloat(ocrExtractedData.volume_liters) : null,
        rate_per_liter: ocrExtractedData.rate_per_liter ? parseFloat(ocrExtractedData.rate_per_liter) : null,
        total_cost: ocrExtractedData.total_cost ? parseFloat(ocrExtractedData.total_cost) : null
      } : null
    };

    // Create gas transaction
    // Note: volume_m3 and rate_per_m3 fields store liters and rate_per_liter (for backward compatibility)
    const gasTransaction = await GasTransaction.create({
      deposit_group_id: deposit_group_id || null,
      delivery_order_id: finalDeliveryOrderId,
      driver_id: driverId,
      vehicle_id: finalVehicleId || null,
      volume_m3: volumeNum, // Store liters in volume_m3 field
      calculation_method: finalCalculationMethod,
      rate_per_m3: rateNum, // Store rate_per_liter in rate_per_m3 field
      jisdor_rate: finalJisdorRate ? parseFloat(finalJisdorRate) : null,
      total_cost: totalNum,
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
        volume_liters: gasTransaction.volume_m3, // Return as volume_liters (stored in volume_m3 field)
        rate_per_liter: gasTransaction.rate_per_m3, // Return as rate_per_liter (stored in rate_per_m3 field)
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

/**
 * Get gas transactions by driver_id
 * GET /api/gas-transactions/by-driver
 */
exports.getGasTransactionsByDriver = async (req, res, next) => {
  try {
    const driverId = req.user?.id;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const gasTransactions = await GasTransaction.findAll({
      where: {
        driver_id: driverId
      },
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type'],
          required: false
        },
        {
          model: DepositGroup,
          as: 'depositGroup',
          attributes: ['id', 'spbg_name', 'spbg_location'],
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
    console.error('Error getting gas transactions by driver:', error?.stack || error);
    return res.status(500).json({ success: false, message: 'Failed to fetch gas transactions', details: error?.message || String(error) });
  }
};

/**
 * Get all gas transactions that have driver "biaya lain" (extra expenses)
 * For web admin view under /driver-expenses
 *
 * GET /api/gas-transactions/driver-extra-expenses
 * (also mounted under /api/web/gas-transactions/driver-extra-expenses)
 */
exports.getDriverExtraExpensesForAdmin = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const whereClause = {
      [Op.or]: [
        { biaya_lain_amount: { [Op.not]: null } },
        { biaya_lain_photo_url: { [Op.not]: null } },
        { biaya_lain_description: { [Op.not]: null } },
      ],
    };

    if (status) {
      whereClause.status = status;
    }

    const result = await GasTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          required: false,
          include: [
            {
              model: DriverProfile,
              as: 'driverProfile',
              attributes: ['full_name', 'phone'],
              required: false,
            },
          ],
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type'],
          required: false,
        },
        {
          model: DepositGroup,
          as: 'depositGroup',
          attributes: ['id', 'spbg_name', 'spbg_location'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: {
          total: result.count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(result.count / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching driver extra gas expenses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch driver extra gas expenses',
      details: error?.message || String(error),
    });
  }
};

/**
 * Update a gas transaction (admin/owner only)
 * PATCH /api/gas-transactions/:id
 *
 * Allows updating:
 * - status: 'pending' | 'approved' | 'rejected'
 * - volume_m3, rate_per_m3, total_cost
 * - nota_ocr_data (optional JSON payload)
 */
exports.updateGasTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const txId = parseInt(id, 10);

    if (isNaN(txId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gas transaction id',
      });
    }

    const gasTransaction = await GasTransaction.findByPk(txId);

    if (!gasTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Gas transaction not found',
      });
    }

    const updatableFields = [
      'status',
      'volume_m3',
      'rate_per_m3',
      'total_cost',
      'nota_ocr_data',
    ];

    const updates = {};

    updatableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        // For numeric fields, allow strings but store as-is; Sequelize/DB will coerce
        updates[field] = req.body[field];
      }
    });

    // If admin updates numeric fields, also sync them into nota_ocr_data so mobile,
    // which prefers OCR values, sees the corrected numbers.
    const hasVolumeUpdate = Object.prototype.hasOwnProperty.call(
      updates,
      "volume_m3"
    );
    const hasRateUpdate = Object.prototype.hasOwnProperty.call(
      updates,
      "rate_per_m3"
    );
    const hasTotalUpdate = Object.prototype.hasOwnProperty.call(
      updates,
      "total_cost"
    );

    if (hasVolumeUpdate || hasRateUpdate || hasTotalUpdate) {
      const currentSnapshot = gasTransaction.nota_ocr_data || {};
      const existingValues = currentSnapshot.ocr_extracted_values || {};

      const newVolume =
        hasVolumeUpdate && updates.volume_m3 !== undefined
          ? parseFloat(String(updates.volume_m3))
          : existingValues.volume_liters ?? parseFloat(String(gasTransaction.volume_m3));

      const newRate =
        hasRateUpdate && updates.rate_per_m3 !== undefined
          ? parseFloat(String(updates.rate_per_m3))
          : existingValues.rate_per_liter ?? parseFloat(String(gasTransaction.rate_per_m3));

      const newTotal =
        hasTotalUpdate && updates.total_cost !== undefined
          ? parseFloat(String(updates.total_cost))
          : existingValues.total_cost ?? parseFloat(String(gasTransaction.total_cost));

      updates.nota_ocr_data = {
        ...currentSnapshot,
        ocr_used: true,
        manual_override: true,
        ocr_extracted_fields: {
          volume_liters: true,
          rate_per_liter: true,
          total_cost: true,
        },
        ocr_extracted_values: {
          volume_liters: isNaN(newVolume) ? null : newVolume,
          rate_per_liter: isNaN(newRate) ? null : newRate,
          total_cost: isNaN(newTotal) ? null : newTotal,
        },
      };
    }

    await gasTransaction.update(updates);

    return res.json({
      success: true,
      data: gasTransaction,
    });
  } catch (error) {
    console.error('Error updating gas transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update gas transaction',
      details: error?.message || String(error),
    });
  }
};

/**
 * Mark gas transaction as paid using SPBG balance
 * POST /api/gas-transactions/:id/pay
 * Admin/Owner only
 */
exports.payGasTransaction = async (req, res, next) => {
  const dbTransaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const txId = parseInt(id, 10);

    if (isNaN(txId)) {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid gas transaction id',
      });
    }

    const gasTransaction = await GasTransaction.findByPk(txId, {
      include: [
        {
          model: DepositGroup,
          as: 'depositGroup',
          required: false,
        },
      ],
      transaction: dbTransaction,
    });

    if (!gasTransaction) {
      await dbTransaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Gas transaction not found',
      });
    }

    // Only allow payment for approved transactions
    if (gasTransaction.status !== 'approved') {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only approved gas transactions can be marked as paid',
      });
    }

    // Check if already paid
    const currentOcrData = gasTransaction.nota_ocr_data || {};
    if (currentOcrData.payment_status === 'paid') {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'This transaction is already marked as paid',
      });
    }

    // Check if transaction has a deposit group
    if (!gasTransaction.deposit_group_id || !gasTransaction.depositGroup) {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Gas transaction is not associated with an SPBG',
      });
    }

    const depositGroup = gasTransaction.depositGroup;
    const transactionAmount = parseFloat(gasTransaction.total_cost) || 0;
    const currentBalance = parseFloat(depositGroup.balance) || 0;

    // Check if balance is sufficient
    if (currentBalance < transactionAmount) {
      await dbTransaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Insufficient SPBG balance. Current balance: Rp ${currentBalance.toLocaleString('id-ID')}, Required: Rp ${transactionAmount.toLocaleString('id-ID')}`,
        current_balance: currentBalance,
        required_amount: transactionAmount,
      });
    }

    // Deduct from SPBG balance
    const newBalance = currentBalance - transactionAmount;
    await depositGroup.update(
      {
        balance: newBalance,
      },
      { transaction: dbTransaction }
    );

    // Mark transaction as paid in nota_ocr_data
    const updatedOcrData = {
      ...currentOcrData,
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: req.user?.id || null,
      payment_amount: transactionAmount,
    };

    await gasTransaction.update(
      {
        nota_ocr_data: updatedOcrData,
      },
      { transaction: dbTransaction }
    );

    await dbTransaction.commit();

    const updatedTx = await GasTransaction.findByPk(txId, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'type'],
          required: false,
        },
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          required: false,
          include: [
            {
              model: DriverProfile,
              as: 'driverProfile',
              attributes: ['full_name', 'phone'],
              required: false,
            },
          ],
        },
        {
          model: DepositGroup,
          as: 'depositGroup',
          attributes: ['id', 'spbg_name', 'spbg_location', 'balance'],
          required: false,
        },
      ],
    });

    return res.json({
      success: true,
      message: `Gas transaction marked as paid. Rp ${transactionAmount.toLocaleString('id-ID')} deducted from SPBG balance.`,
      data: updatedTx,
      new_balance: newBalance,
    });
  } catch (error) {
    await dbTransaction.rollback();
    console.error('Error paying gas transaction:', error);
    next(error);
  }
};

/**
 * Process nota photo with OCR and return extracted data
 * POST /api/gas-transactions/process-nota-ocr
 * Driver only
 */
exports.processNotaOCR = async (req, res, next) => {
  try {
    const notaFile = req.file;
    
    if (!notaFile) {
      return res.status(400).json({
        success: false,
        message: 'No nota photo provided'
      });
    }

    try {
      console.log('🔍 Processing nota OCR extraction...');
      
      // Read the file directly from the file system
      const imageBuffer = fs.readFileSync(notaFile.path);
      
      // Extract data from receipt using OCR
      const ocrResult = await receiptOcrService.processReceipt(imageBuffer);
      
      if (ocrResult.success && ocrResult.data) {
        console.log('✅ OCR extraction successful:', {
          volume_liters: ocrResult.data.volume_liters,
          rate_per_liter: ocrResult.data.rate_per_liter,
          total_cost: ocrResult.data.total_cost
        });
        
        return res.json({
          success: true,
          message: 'OCR processing completed successfully',
          data: ocrResult.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'OCR extraction failed or incomplete',
          error: ocrResult.error || 'Unknown error'
        });
      }
    } catch (ocrError) {
      console.error('❌ OCR processing error:', ocrError);
      return res.status(500).json({
        success: false,
        message: 'OCR processing failed',
        error: ocrError.message
      });
    }
  } catch (error) {
    console.error('Error processing nota OCR:', error);
    next(error);
  }
};


