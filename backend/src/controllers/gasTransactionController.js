// backend/src/controllers/gasTransactionController.js
const { GasTransaction, DepositGroup, Vehicle, User, DriverProfile } = require('../models');
const { Op } = require('sequelize');

/**
 * Create a gas transaction (fire-and-forget)
 * POST /api/gas-transactions
 */
exports.createGasTransaction = async (req, res, next) => {
  try {
    const {
      deposit_group_id,
      delivery_order_id,
      vehicle_id,
      volume_m3,
      calculation_method,
      rate_per_m3,
      jisdor_rate,
      total_cost,
      nota_ocr_data,
      surat_jalan_photo,
      nota_photo,
      biaya_lain_photo,
      biaya_lain_amount,
      biaya_lain_description
    } = req.body;

    const driverId = req.user?.id;

    // Validate required fields
    if (!volume_m3 || !calculation_method || !rate_per_m3 || !total_cost) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: volume_m3, calculation_method, rate_per_m3, total_cost'
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

    // delivery_order_id is optional - no auto-lookup (client doesn't want delivery order dependency)
    const finalDeliveryOrderId = delivery_order_id || null;

    // Handle file uploads from req.files (multer stores them here)
    const files = req.files || {};
    const suratJalanFile = files.surat_jalan_photo?.[0];
    const notaFile = files.nota_photo?.[0]; // THIS is the one used for OCR (not surat jalan)
    const biayaLainFile = files.biaya_lain_photo?.[0];

    // Store file paths (relative to /uploads route)
    const suratJalanPhotoUrl = suratJalanFile ? `/uploads/receipts/${suratJalanFile.filename}` : null;
    const notaPhotoUrl = notaFile ? `/uploads/receipts/${notaFile.filename}` : null; // This is used for OCR
    const biayaLainPhotoUrl = biayaLainFile ? `/uploads/receipts/${biayaLainFile.filename}` : null;

    // IMPORTANT: The NOTA photo (not surat jalan) is what's used for OCR
    // The OCR service extracts: stan_awal, current_stan, pressure_inlet, pressure_outlet, temperature
    // These are used to calculate final billable gas volume for SPBG tagihan
    const notaSnapshot = nota_ocr_data || {
      surat_jalan_photo_url: suratJalanPhotoUrl,
      nota_photo_url: notaPhotoUrl, // This is the receipt photo used for OCR
      biaya_lain_photo_url: biayaLainPhotoUrl,
      biaya_lain_amount: biaya_lain_amount ? parseFloat(biaya_lain_amount) : null,
      biaya_lain_description: biaya_lain_description || null,
      submitted_at: new Date().toISOString(),
      // OCR fields for SPBG billing calculation (extracted from nota_photo):
      // stan_awal, current_stan, pressure_inlet, pressure_outlet, temperature
      // These will be extracted from nota_photo via OCR service later
    };

    // Create gas transaction (fire-and-forget, no balance check, no delivery order required)
    const gasTransaction = await GasTransaction.create({
      deposit_group_id: deposit_group_id || null,
      delivery_order_id: finalDeliveryOrderId,
      driver_id: driverId,
      vehicle_id: finalVehicleId || null,
      volume_m3: parseFloat(volume_m3),
      calculation_method: calculation_method,
      rate_per_m3: parseFloat(rate_per_m3),
      jisdor_rate: jisdor_rate ? parseFloat(jisdor_rate) : null,
      total_cost: parseFloat(total_cost),
      status: 'pending', // Will be approved later by admin
      surat_jalan_photo_url: suratJalanPhotoUrl,
      nota_photo_url: notaPhotoUrl, // This is used for OCR
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
        status: gasTransaction.status
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

