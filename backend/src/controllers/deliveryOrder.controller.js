// src/controllers/deliveryOrder.controller.js

const {
  DeliveryOrder,
  PurchaseOrder,
  Vehicle,
  User,
  DriverExpense,
  DriverProfile,
  BudgetRequest,
  DepositGroup, // Add DepositGroup
  DepositGroupMember, // Add DepositGroupMember
  DeliveryOrderAdjustments,
  DeliveryOrderPayments, // <<< FIX: Make sure this is imported
  NotaKecil, // Add NotaKecil
  sequelize,
  Sequelize,
} = require("../models");
const { Op } = require("sequelize");
const path = require('path');
const fs = require('fs');

// === TAMBAHKAN UTILITY FUNCTION ===
const filterSensitiveDataForDriver = (data, userRole) => {
  if (userRole !== "driver") {
    return data; // Admin/Owner tetap bisa lihat semua data
  }

  // Function untuk remove gaji dari object
  const removeGaji = (obj) => {
    if (!obj || typeof obj !== "object") {
      return obj; // Return original if not a valid object
    }

    // Create a copy to avoid mutating the original object
    const copy = { ...obj };
    delete copy.gaji;

    // Remove gaji dari financial_summary juga
    if (copy.financial_summary) {
      copy.financial_summary = { ...copy.financial_summary };
      delete copy.financial_summary.gaji;
      // Recalculate total_for_driver without gaji
      copy.financial_summary.total_for_driver =
        copy.financial_summary.trip_allowance || 0;
    }
    
    // Preserve expenses and budgetRequests data - always include as arrays
    copy.expenses = obj.expenses || [];
    copy.budgetRequests = obj.budgetRequests || [];

    return copy;
  };

  // Handle array atau single object
  if (Array.isArray(data)) {
    return data.map((item) => removeGaji(item));
  } else {
    return removeGaji(data);
  }
};

// CREATE Delivery Order by Admin user
exports.createDeliveryOrder = async (req, res, next) => {
  try {
    // TAMBAHKAN DEBUG LOGGING
    console.log("=== DELIVERY ORDER CREATION DEBUG ===");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    console.log("=====================================");
    const {
      driver_id,
      vehicle_id,
      do_number,
      unit, // Unit input (will be overridden to kubik)
      unit_price,
      total_amount,
      load_location,
      unload_location,
      load_latitude,
      load_longitude,
      unload_latitude,
      unload_longitude,
      additional_unload_locations, // New field for multiple unload locations
      payment_status,
      payment_type,
      deposit_amount,
      invoice_amount,
      due_date,
      trip_allowance,
      gaji, // <-- FIELD BARU
      customer_name,
      customer_location,
    } = req.body;

    // Force unit to always be 'kubik' for delivery orders
    const finalUnit = "kubik";

    // Validasi sederhana
    // CEK: Apakah driver sudah punya trip aktif (assigned, otw_to_unload_location, at_unload_location)
    const activeTrip = await DeliveryOrder.findOne({
      where: {
        driver_id,
        status: {
          [Op.in]: [
            "assigned",
            "otw_to_unload_location",
            "at_unload_location",
          ],
        },
      },
    });
    if (activeTrip) {
      return res.status(400).json({
        message: "Driver ini masih menjalani trip lain yang belum selesai!",
      });
    }

    // CEK: Apakah vehicle sudah punya trip aktif
    const activeVehicle = await DeliveryOrder.findOne({
      where: {
        vehicle_id,
        status: {
          [Op.in]: [
            "assigned",
            "otw_to_unload_location",
            "at_unload_location",
          ],
        },
      },
    });
    if (activeVehicle) {
      return res.status(400).json({
        message: "Mobil ini masih dipakai untuk trip lain yang belum selesai!",
      });
    }

    if (
      !driver_id ||
      !vehicle_id ||
      !do_number ||
      !unit_price ||
      !trip_allowance ||
      !gaji
    ) {
      return res.status(400).json({
        message: "Data wajib belum lengkap.",
        missing_fields: {
          driver_id: !driver_id,
          vehicle_id: !vehicle_id,
          do_number: !do_number,
          unit_price: !unit_price,
          trip_allowance: !trip_allowance,
          gaji: !gaji,
        },
      });
    }

    // Unit is always kubik for DOs - no validation needed

    // Handle file upload (surat jalan)
    let surat_jalan_url = null;
    if (req.file) {
      surat_jalan_url = req.file.path.replace(/\\/g, "/");
    }

    // Calculate total amount if not provided
    const calculatedTotalAmount = total_amount || parseFloat(unit_price);

    // Buat DeliveryOrder baru
    const newDO = await DeliveryOrder.create({
      driver_id,
      vehicle_id,
      do_number,
      unit: finalUnit, // Always kubik
      unit_price: unit_price || 0,
      total_amount: calculatedTotalAmount,
      load_location,
      unload_location,
      load_latitude,
      load_longitude,
      unload_latitude,
      unload_longitude,
      additional_unload_locations, // Include additional unload locations
      payment_status: payment_status || "proses_tagihan",
      payment_type,
      deposit_amount: deposit_amount || 0,
      invoice_amount,
      due_date,
      trip_allowance: trip_allowance || 0,
      gaji: gaji || 0,
      customer_name,
      customer_location,
      status: "assigned",
    });

    // Set status driver & mobil ke busy/in_use (opsional, jika ada field status di tabel driver/vehicle)
    await DriverProfile.update(
      { status: "busy" },
      { where: { user_id: driver_id } }
    );
    await Vehicle.update({ status: "in_use" }, { where: { id: vehicle_id } });

    res.status(201).json({
      ...newDO.toJSON(),
      financial_summary: newDO.getFinancialSummary(),
    });
  } catch (err) {
    console.error("Error creating delivery order:", err);
    next(err);
  }
};

// GET /api/delivery-orders/me - Get assigned tasks for the logged-in driver
exports.getMyDeliveryOrders = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const userRole = req.user.role;

    const myOrders = await DeliveryOrder.findAll({
      where: { driver_id: driverId },
      attributes: {
        include: [
          [
            // Subquery untuk menjumlahkan semua expense yang terkait dengan DO ini
            sequelize.literal(`(
              SELECT COALESCE(SUM(amount), 0)
              FROM driver_expenses AS de
              WHERE
                de.delivery_order_id = "DeliveryOrder".id
            )`),
            "expenses_total", // Nama alias untuk total expense
          ],
          "location_documentation", // Include location documentation for multiple locations
        ],
      },
      include: [
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["id", "license_plate", "type"],
        },
        {
          model: User,
          as: "driver",
          attributes: ["id", "username"],
          include: [
            {
              model: DriverProfile,
              as: "driverProfile",
              attributes: ["full_name"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Proses data untuk menambahkan sisa saldo
    // Update response untuk include financial data
    const ordersWithAllowance = myOrders.map((order) => {
      const plainOrder = order.get({ plain: true });
      const expensesTotal = parseFloat(plainOrder.expenses_total) || 0;
      const tripAllowance = parseFloat(plainOrder.trip_allowance) || 0;
      const gaji = parseFloat(plainOrder.gaji) || 0;

      return {
        ...plainOrder,
        expenses_total: expensesTotal,
        remaining_allowance: tripAllowance - expensesTotal,
        financial_summary: {
          trip_allowance: tripAllowance,
          gaji: gaji,
          total_for_driver: tripAllowance + gaji,
          expenses_total: expensesTotal,
          remaining_allowance: tripAllowance - expensesTotal,
        },
        driver_name:
          plainOrder.driver?.driverProfile?.full_name ||
          plainOrder.driver?.username,
        driver: undefined,
      };
    });

    // === FILTER SENSITIVE DATA FOR DRIVERS ===
    const filteredOrders = filterSensitiveDataForDriver(
      ordersWithAllowance,
      userRole
    );

    res.json(filteredOrders); // Kirim data yang sudah diolah
  } catch (err) {
    console.error("Error in getMyDeliveryOrders:", err);
    next(err);
  }
};

// GET /api/delivery-orders - Get all orders (for admins) or filtered orders
exports.getAllDeliveryOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const user = req.user;

    const options = {
      include: [
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["license_plate", "type"],
        },
        {
          model: User,
          as: "driver",
          include: {
            model: DriverProfile,
            as: "driverProfile",
            attributes: ["full_name"],
          },
        },
      ],
      order: [["created_at", "DESC"]],
      where: {},
    };

    if (status) {
      options.where.status = { [Op.in]: status.split(",") };
    }

    if (user.role === "driver") {
      options.where.driver_id = user.id;
    }

    const deliveryOrders = await DeliveryOrder.findAll(options);
    // === FILTER SENSITIVE DATA FOR DRIVERS ===
    const filteredOrders = filterSensitiveDataForDriver(
      deliveryOrders.map((order) => order.get({ plain: true })),
      user.role
    );
    res.json(filteredOrders);
  } catch (err) {
    console.error("Error in getAllDeliveryOrders:", err);
    next(err);
  }
};

// GET /api/delivery-orders/active - Get all active delivery orders
exports.getActiveDeliveryOrders = async (req, res, next) => {
  try {
    const ACTIVE_STATUSES = [
      "assigned",
      "otw_to_unload_location",
      "at_unload_location",
    ];

    const user = req.user;

    const options = {
      where: { status: { [Op.in]: ACTIVE_STATUSES } },
      include: [
        {
          model: Vehicle,
          as: "vehicle",
          attributes: ["license_plate", "type"],
        },
        {
          model: User,
          as: "driver",
          include: {
            model: DriverProfile,
            as: "driverProfile",
            attributes: ["full_name"],
          },
        },
      ],
      order: [["created_at", "DESC"]],
    };

    // If driver, only show their own DOs
    if (user.role === "driver") {
      options.where.driver_id = user.id;
    }

    const activeDOs = await DeliveryOrder.findAll(options);

    // Filter sensitive data for drivers
    const filtered = filterSensitiveDataForDriver(
      activeDOs.map((order) => order.get({ plain: true })),
      user.role
    );

    res.json(filtered);
  } catch (err) {
    console.error("Error in getActiveDeliveryOrders:", err);
    next(err);
  }
};

// GET /api/delivery-orders/:id - Get a single order by ID
exports.getDeliveryOrderById = async (req, res, next) => {
  try {
    // Debug logging
    console.log("getDeliveryOrderById - req.user:", req.user);
    console.log("getDeliveryOrderById - req.params:", req.params);

    // Validasi req.user
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!req.user.role) {
      console.error(
        "User role is undefined in getDeliveryOrderById:",
        req.user
      );
      return res.status(500).json({
        message: "User role is not defined",
      });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    console.log("Fetching delivery order with ID:", req.params.id);
    
    const order = await DeliveryOrder.findByPk(req.params.id, {
      include: [
        { model: Vehicle, as: "vehicle" },
        {
          model: User,
          as: "driver",
          include: { model: DriverProfile, as: "driverProfile" },
        },
        {
          model: DriverExpense,
          as: "expenses",
          required: false, // Important: don't require expenses to exist
          include: [
            {
              model: User,
              as: "driver",
              attributes: ["id", "username"],
              required: false
            }
          ]
        },
        {
          model: BudgetRequest,
          as: "budgetRequests",
          required: false, // Important: don't require budget requests to exist
          include: [
            {
              model: User,
              as: "driver",
              attributes: ["id", "username"],
              required: false
            },
            {
              model: User,
              as: "approver",
              attributes: ["id", "username"],
              required: false
            }
          ]
        },
      ],
    });
    
    console.log("Raw order found:", !!order);
    if (order) {
      console.log("📱 Mobile API - Order ID:", order.id);
      console.log("📱 Mobile API - Current Status:", order.status);
      console.log("Raw expenses count:", order.expenses?.length || 'undefined');
      console.log("Raw budget requests count:", order.budgetRequests?.length || 'undefined');
    }

    if (!order) {
      return res.status(404).json({ message: "Delivery Order not found" });
    }

    // === AUTHORIZATION CHECK ===
    if (userRole === "driver" && order.driver_id !== userId) {
      return res.status(403).json({
        message: "Access denied. You can only view your own delivery orders.",
      });
    }

    const plainOrder = order.get({ plain: true });
    
    // DEBUG: Log the raw order data
    console.log("=== RAW ORDER DATA DEBUG ===");
    console.log("Raw expenses data:", plainOrder.expenses);
    console.log("Raw budget requests data:", plainOrder.budgetRequests);
    console.log("===========================");
    
    // Ensure expenses and budgetRequests are always arrays
    const expenses = plainOrder.expenses || [];
    const budgetRequests = plainOrder.budgetRequests || [];
    
    const expensesTotal = expenses.reduce(
      (sum, expense) => sum + parseFloat(expense.amount),
      0
    );
    const tripAllowance = parseFloat(plainOrder.trip_allowance) || 0;
    const gaji = parseFloat(plainOrder.gaji) || 0;

    const responseData = {
      ...plainOrder,
      expenses: expenses, // Ensure this is always an array
      budgetRequests: budgetRequests, // Ensure this is always an array
      expenses_total: expensesTotal,
      remaining_allowance: tripAllowance - expensesTotal,
      financial_summary: {
        trip_allowance: tripAllowance,
        gaji: gaji,
        total_for_driver: tripAllowance + gaji,
        expenses_total: expensesTotal,
        remaining_allowance: tripAllowance - expensesTotal,
      },
    };

    // DEBUG: Log the raw response data BEFORE filtering
    console.log("=== BEFORE FILTERING DEBUG ===");
    console.log("Raw expenses:", responseData.expenses);
    console.log("Raw budget requests:", responseData.budgetRequests);
    console.log("Raw expenses type:", typeof responseData.expenses);
    console.log("Raw budget requests type:", typeof responseData.budgetRequests);
    console.log("================================");

    // === FILTER SENSITIVE DATA FOR DRIVERS ===
    const filteredData = filterSensitiveDataForDriver(responseData, userRole);

    // DEBUG: Log the response data structure AFTER filtering
    console.log("=== AFTER FILTERING DEBUG ===");
    console.log("User role:", userRole);
    console.log("Filtered expenses:", filteredData.expenses);
    console.log("Filtered budget requests:", filteredData.budgetRequests);
    console.log("Expenses type:", typeof filteredData.expenses);
    console.log("Budget requests type:", typeof filteredData.budgetRequests);
    console.log("Full response keys:", Object.keys(filteredData));
    console.log("===============================");

    res.json(filteredData);
  } catch (err) {
    console.error("Error in getDeliveryOrderById:", err);
    next(err);
  }
};

// PATCH /api/delivery-orders/:id/start
exports.startToDestination = (req, res, next) => {
  updateStatus(
    req.params.id,
    req.user.id,
    "otw_to_unload_location", // ✅ Start journey to unload location
    "departed_to_load_location_at" // ✅ Update field timestamp baru
  )
    .then((order) =>
      res.json({
        message: "Status updated to OTW to SPBU Location",
        order,
        status_text: "Menuju SPBU",
      })
    )
    .catch(next);
};

// PATCH /api/delivery-orders/:id/arrive - Arrive at SPBU (load location)
exports.arriveAtLoadLocation = (req, res, next) => {
  updateStatus(
    req.params.id,
    req.user.id,
    "at_unload_location",
    "arrived_at_load_location_at"
  )
    .then((order) =>
      res.json({
        message: "Status updated to At SPBU",
        order,
        status_text: "Di SPBU",
      })
    )
    .catch(next);
};

// PATCH /api/delivery-orders/:id/arrive-at-unload - Arrive at unload location
exports.arriveAtDestination = (req, res, next) => {
  updateStatus(
    req.params.id,
    req.user.id,
    "at_unload_location",
    "arrived_at_unload_location_at"
  )
    .then((order) =>
      res.json({
        message: "Status updated to At Customer",
        order,
        status_text: "Di Pelanggan",
      })
    )
    .catch(next);
};

// PATCH /api/delivery-orders/:id/return
exports.startReturnToBase = (req, res, next) => {
  updateStatus(
    req.params.id,
    req.user.id,
    "completed",
    "completed_at"
  )
    .then((order) =>
      res.json({
        message: "Delivery completed",
        order,
        status_text: "Selesai",
      })
    )
    .catch(next);
};

// PATCH /api/delivery-orders/:id/complete
exports.completeDeliveryOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { notes } = req.body || {}; 
    const driverId = req.user.id;

    const order = await DeliveryOrder.findOne({
      where: { id: id, driver_id: driverId },
      include: [],  // Removed PO dependency
      transaction: transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: "Delivery Order not found or not assigned to you." });
    }

    if (order.status !== "at_unload_location") {
      await transaction.rollback();
      return res.status(400).json({
          message: `Cannot complete delivery. Current status: ${order.status}.`,
      });
    }
    
    if (!order.actual_load_quantity) {
        await transaction.rollback();
        return res.status(400).json({ message: "Cannot complete order. Actual load quantity has not been confirmed." });
    }

    const dgMember = await DepositGroupMember.findOne({
        where: { delivery_order_id: id },
        include: [{ model: DepositGroup, as: 'depositGroup' }], 
        transaction,
    });

    let paymentStatusUpdate = {};
    let priceUsed = 0;
    let grp = null;

    if (dgMember && dgMember.depositGroup) {
        paymentStatusUpdate = {
            payment_status: 'lunas',
            payment_confirmation_status: 'confirmed',
            payment_confirmation_at: new Date()
        };

        grp = dgMember.depositGroup;
        const qtyUsed = parseFloat(order.actual_load_quantity); 
        const unitPrice = parseFloat(order.unit_price);
        priceUsed = qtyUsed * unitPrice;

        // Update group's balance, remaining quantity, and completed quantity
        grp.remaining_quantity = parseFloat(grp.remaining_quantity) - qtyUsed;
        grp.completed_quantity = parseFloat(grp.completed_quantity || 0) + qtyUsed;
        grp.balance = parseFloat(grp.balance) - priceUsed;
        if (grp.remaining_quantity <= 0) grp.status = 'fulfilled';
        await grp.save({ transaction });
        await dgMember.update({ quantity: qtyUsed }, { transaction });
    }

    // *** FIX STARTS HERE: Update the Delivery Order FIRST ***
    await order.update({
        status: "completed",
        completed_at: new Date(),
        notes: notes || order.notes,
        ...paymentStatusUpdate
    }, { transaction: transaction });
    // *** FIX ENDS HERE ***

    // *** THEN, create the payment record ***
    if (dgMember && dgMember.depositGroup) {
        await DeliveryOrderPayments.create({
            delivery_order_id: id,
            payment_amount: priceUsed,
            payment_type: 'transfer', // Use an allowed payment type
            payment_date: new Date(),
            notes: `Auto-payment from Deposit Group: ${grp.spbg_location}`,
            received_by: req.user?.id,
            created_by: req.user?.id,
        }, { transaction });
    }

    // Free up driver and vehicle
    await DriverProfile.update(
      { status: "available" },
      { where: { user_id: driverId }, transaction: transaction }
    );
    await Vehicle.update(
      { status: "available" },
      { where: { id: order.vehicle_id }, transaction: transaction }
    );

    await transaction.commit();

    res.json({
      message: "Delivery Order completed successfully!",
      status_text: "Perjalanan Selesai",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error completing delivery order from mobile:", err);
    next(err);
  }
};

// PATCH /api/delivery-orders/:id/depart-spbu
exports.departFromSPBU = (req, res, next) => {
  updateStatus(
    req.params.id,
    req.user.id,
    "otw_to_unload_location",
    "departed_from_spbu_at"
  )
    .then((order) =>
      res.json({
        message: "Status updated to On The Way to Customer",
        order,
        status_text: "Perjalanan ke Lokasi Bongkar",
      })
    )
    .catch(next);
};

// POST /api/delivery-orders/:id/upload-nota
exports.uploadNotaPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { location_index, location_name } = req.body;
    const driverId = req.user.id;

    // Find the delivery order
    const order = await DeliveryOrder.findOne({
      where: { id, driver_id: driverId },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Delivery Order tidak ditemukan.",
      });
    }

    // Check if driver is at the right status to upload nota
    if (order.status !== "otw_to_unload_location" && order.status !== "at_unload_location") {
      return res.status(400).json({
        success: false,
        message: "Foto nota hanya dapat diunggah ketika dalam perjalanan atau di lokasi pelanggan.",
      });
    }

    console.log("Nota upload request:", {
      id,
      driverId,
    });
    console.log("Uploaded file:", req.file);
    console.log("All uploaded files:", req.files);
    console.log("Request body:", req.body);
    console.log("Content-Type:", req.headers['content-type']);

    // Accept both single and multiple file upload (same as surat jalan)
    let notaFile = req.file;
    const notaFiles = req.files || []; // Ensure it's always an array

    console.log("Files received:", {
      file: req.file,
      files: req.files,
      filesLength: notaFiles.length
    });

    if (!notaFile && notaFiles.length > 0) {
      notaFile = notaFiles[0];
    }

    // Nota photos are now optional - drivers can proceed without photos
    // if (!notaFile && notaFiles.length === 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Foto nota harus diunggah.",
    //   });
    // }

    // Process file upload - handle both single file and multiple files (same as surat jalan)
    let nota_photo_url = [];
    
    if (notaFiles.length > 0) {
      // Multiple files uploaded
      nota_photo_url = notaFiles.map((f) =>
        f.path.replace(/\\/g, "/")
      );
    } else if (notaFile) {
      // Single file uploaded  
      nota_photo_url = [notaFile.path.replace(/\\/g, "/")];
    }
    // If no files uploaded, nota_photo_url remains empty array - this is now allowed

    // Update both legacy and new location-specific storage
    const currentPhotos = order.nota_photo_url || [];
    const currentLocationDocs = order.location_documentation || [];
    
    // If location context is provided, store per-location
    if (location_index !== undefined && location_name) {
      const locationIndex = parseInt(location_index);
      
      console.log(`📸 Processing nota upload for location ${locationIndex} (${location_name})`);
      console.log(`📸 Current location docs before update:`, JSON.stringify(currentLocationDocs, null, 2));
      
      // Find existing documentation for this location or create new
      const existingDocIndex = currentLocationDocs.findIndex(doc => doc.location_index === locationIndex);
      
      if (existingDocIndex >= 0) {
        // Update existing location documentation
        const existingPhotos = currentLocationDocs[existingDocIndex].photos || [];
        currentLocationDocs[existingDocIndex].photos = [
          ...existingPhotos,
          ...nota_photo_url
        ];
        currentLocationDocs[existingDocIndex].uploaded_at = new Date().toISOString();
        console.log(`Updated existing location doc for index ${locationIndex}:`, currentLocationDocs[existingDocIndex]);
      } else {
        // Create new location documentation
        const newDoc = {
          location_index: locationIndex,
          location_name: location_name,
          photos: nota_photo_url,
          uploaded_at: new Date().toISOString(),
          completed: false
        };
        currentLocationDocs.push(newDoc);
        console.log(`Created new location doc for index ${locationIndex}:`, newDoc);
      }
    }

    console.log(`📸 Final location docs to save:`, JSON.stringify(currentLocationDocs, null, 2));

    // Update nota_photo_url using Sequelize
    await order.update({
      nota_photo_url: [...currentPhotos, ...nota_photo_url], // Legacy storage
    });
    
    // Update location_documentation using raw SQL to ensure proper JSONB handling
    const updateQuery = `
      UPDATE delivery_orders 
      SET location_documentation = :locationDocs
      WHERE id = :orderId
    `;
    
    const { sequelize } = require('../models');
    await sequelize.query(updateQuery, {
      replacements: {
        locationDocs: JSON.stringify(currentLocationDocs),
        orderId: id
      }
    });
    
    // Reload the order to get the updated data
    await order.reload();
    
    console.log(`📸 Order updated successfully with location docs`);
    console.log(`📸 Order after reload - location_documentation:`, JSON.stringify(order.location_documentation, null, 2));

    const responseMessage = nota_photo_url.length > 0 
      ? `${nota_photo_url.length} foto nota berhasil diunggah.`
      : "Status lokasi berhasil diperbarui.";

    res.json({
      success: true,
      message: responseMessage,
      data: {
        nota_photo_url: order.nota_photo_url,
        location_documentation: order.location_documentation,
        photos_uploaded: nota_photo_url.length,
      },
    });

  } catch (err) {
    console.error("Error uploading nota photo:", err);
    next(err);
  }
};

// POST /api/delivery-orders/:id/complete-location
exports.completeLocation = async (req, res, next) => {
  console.log('🔥 COMPLETE LOCATION ENDPOINT CALLED 🔥');
  console.log('Request params:', req.params);
  console.log('Request body:', req.body);
  
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { location_index } = req.body;
    const driverId = req.user.id;

    // Find the delivery order
    const order = await DeliveryOrder.findOne({
      where: { id, driver_id: driverId },
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Delivery Order tidak ditemukan.",
      });
    }

    // Check if driver is at customer location
    if (order.status !== "at_unload_location") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Lokasi hanya dapat diselesaikan ketika berada di lokasi pelanggan.",
      });
    }

    const locationIndex = parseInt(location_index);
    const currentLocationDocs = order.location_documentation || [];
    
    console.log(`Completing location ${locationIndex} for order ${id}`);
    console.log('Current location docs:', currentLocationDocs);
    
    // Build all locations array first
    const allLocations = [];
    
    // Add primary unload location
    if (order.unload_location) {
      allLocations.push({ index: 0, location: order.unload_location });
    }
    
    // Add additional unload locations
    if (order.additional_unload_locations && Array.isArray(order.additional_unload_locations)) {
      order.additional_unload_locations.forEach((loc, idx) => {
        if (typeof loc === 'string') {
          allLocations.push({ index: idx + 1, location: loc });
        } else if (loc.location) {
          allLocations.push({ index: idx + 1, location: loc.location });
        }
      });
    }
    
    // Mark the specified location as completed
    const docIndex = currentLocationDocs.findIndex(doc => doc.location_index === locationIndex);
    console.log(`Looking for location index ${locationIndex}, found at docIndex: ${docIndex}`);
    console.log(`Current location docs before update:`, JSON.stringify(currentLocationDocs, null, 2));
    
    if (docIndex >= 0) {
      console.log(`Before update - doc at index ${docIndex}:`, JSON.stringify(currentLocationDocs[docIndex], null, 2));
      // Force update the completion status
      currentLocationDocs[docIndex] = {
        ...currentLocationDocs[docIndex],
        completed: true,
        completed_at: new Date().toISOString()
      };
      console.log(`After update - doc at index ${docIndex}:`, JSON.stringify(currentLocationDocs[docIndex], null, 2));
      console.log(`Updated existing location doc at index ${docIndex}:`, currentLocationDocs[docIndex]);
    } else {
      // If location documentation doesn't exist yet, create it
      const targetLocation = allLocations.find(loc => loc.index === locationIndex);
      console.log(`Target location for index ${locationIndex}:`, targetLocation);
      
      if (targetLocation) {
        const newDoc = {
          location_index: locationIndex,
          location_name: targetLocation.location,
          photos: [],
          completed: true,
          uploaded_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        };
        currentLocationDocs.push(newDoc);
        console.log(`Created new location doc:`, newDoc);
      }
    }
    
    // Ensure all completed fields are boolean true (not string "true")
    currentLocationDocs.forEach((doc, index) => {
      if (doc.completed === 'true' || doc.completed === 1) {
        doc.completed = true;
        console.log(`Fixed completion status for doc ${index}:`, doc);
      }
    });

    const isLastLocation = locationIndex >= allLocations.length - 1;
    const hasMoreLocations = !isLastLocation;

    console.log(`About to update database with location docs:`, JSON.stringify(currentLocationDocs, null, 2));
    
    // Update the order with the new location documentation using raw SQL
    // This ensures the JSON field is properly updated in the database
    const updateQuery = `
      UPDATE delivery_orders 
      SET location_documentation = :locationDocs
      WHERE id = :orderId AND driver_id = :driverId
    `;
    
    await sequelize.query(updateQuery, {
      replacements: {
        locationDocs: JSON.stringify(currentLocationDocs),
        orderId: id,
        driverId: driverId
      },
      transaction
    });

    // Refresh the order from database to ensure we have the latest data
    await order.reload();
    
    console.log(`Updated order ${id} with location docs from database:`, JSON.stringify(order.location_documentation, null, 2));
    console.log(`Has more locations: ${hasMoreLocations}, is last location: ${isLastLocation}`);
    
    // Log the final response data for debugging
    const responseData = {
      location_documentation: order.location_documentation,
      has_more_locations: hasMoreLocations,
      next_location_index: hasMoreLocations ? locationIndex + 1 : null,
      can_complete_task: !hasMoreLocations,
    };
    console.log('Response data being sent:', JSON.stringify(responseData, null, 2));

    // Commit the transaction
    await transaction.commit();

    res.json({
      success: true,
      message: hasMoreLocations ? "Lokasi selesai. Lanjut ke lokasi berikutnya." : "Semua lokasi selesai. Siap menyelesaikan tugas.",
      data: responseData,
    });

  } catch (err) {
    // Rollback the transaction on error
    await transaction.rollback();
    console.error("Error completing location:", err);
    next(err);
  }
};

// === UPDATE HELPER FUNCTION updateStatus ===
const updateStatus = async (orderId, driverId, newStatus, timestampField) => {
  try {
    const order = await DeliveryOrder.findOne({
      where: { id: orderId, driver_id: driverId },
    });

    if (!order) {
      throw { status: 404, message: "Delivery Order tidak ditemukan." };
    }

    // Status validation mapping
    const validTransitions = {
      assigned: ["otw_to_unload_location"], // Fixed: allow transition to otw_to_unload_location
      otw_to_unload_location: ["at_unload_location"],
      at_unload_location: ["completed"],
      completed: [],
      cancelled: [],
    };

    const allowedTransitions = validTransitions[order.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw {
        status: 400,
        message: `Invalid status transition from ${order.status} to ${newStatus}`,
      };
    }

    const updateData = {
      status: newStatus,
      [timestampField]: new Date(),
    };

    await order.update(updateData);

    return order;
  } catch (error) {
    throw error;
  }
};

/**
 * @desc    Upload documentation photos (pressure bar, temperature, stan awal, stan akhir)
 * @route   POST /api/delivery-orders/:id/upload-documentation
 * @access  Private (Driver only)
 */
exports.uploadDocumentationPhotos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { location_index } = req.body;
    const driverId = req.user.id;

    console.log("📋 Documentation upload request:", {
      id,
      location_index,
      driverId,
      files: req.files
    });

    // Validate location index
    if (location_index === undefined || location_index === null) {
      return res.status(400).json({
        message: "Location index is required"
      });
    }

    const locationIndex = parseInt(location_index);

    // Find the delivery order
    const order = await DeliveryOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({
        message: "Delivery Order tidak ditemukan",
      });
    }

    // Verify driver ownership
    if (order.driver_id !== driverId) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses untuk delivery order ini",
      });
    }

    // Process uploaded files
    const documentationPhotos = {
      pressure_bar: [],
      temperature: [],
      stan_awal: [],
      stan_akhir: []
    };

    // Helper function to process files for each type
    const processFiles = (fileType) => {
      const files = req.files[fileType] || [];
      return files.map(file => {
        const fileUrl = `/uploads/surat_jalan_photos/${file.filename}`;
        console.log(`📸 ${fileType} photo uploaded:`, fileUrl);
        return fileUrl;
      });
    };

    // Process each type of documentation photo
    documentationPhotos.pressure_bar = processFiles('pressure_bar');
    documentationPhotos.temperature = processFiles('temperature');
    documentationPhotos.stan_awal = processFiles('stan_awal');
    documentationPhotos.stan_akhir = processFiles('stan_akhir');

    console.log("📋 Processed documentation photos:", documentationPhotos);

    // Update location documentation
    const currentLocationDocs = order.location_documentation || [];
    
    // Find existing documentation for this location or create new
    const existingDocIndex = currentLocationDocs.findIndex(doc => doc.location_index === locationIndex);
    
    if (existingDocIndex >= 0) {
      // Update existing location documentation
      const existingDoc = currentLocationDocs[existingDocIndex];
      currentLocationDocs[existingDocIndex] = {
        ...existingDoc,
        pressure_bar_photos: [
          ...(existingDoc.pressure_bar_photos || []),
          ...documentationPhotos.pressure_bar
        ],
        temperature_photos: [
          ...(existingDoc.temperature_photos || []),
          ...documentationPhotos.temperature
        ],
        stan_awal_photos: [
          ...(existingDoc.stan_awal_photos || []),
          ...documentationPhotos.stan_awal
        ],
        stan_akhir_photos: [
          ...(existingDoc.stan_akhir_photos || []),
          ...documentationPhotos.stan_akhir
        ],
        documentation_uploaded_at: new Date().toISOString()
      };
      console.log(`📋 Updated existing location doc for index ${locationIndex}`);
    } else {
      // Create new location documentation
      const newDoc = {
        location_index: locationIndex,
        location_name: `Location ${locationIndex + 1}`, // Default name
        pressure_bar_photos: documentationPhotos.pressure_bar,
        temperature_photos: documentationPhotos.temperature,
        stan_awal_photos: documentationPhotos.stan_awal,
        stan_akhir_photos: documentationPhotos.stan_akhir,
        documentation_uploaded_at: new Date().toISOString(),
        completed: false
      };
      currentLocationDocs.push(newDoc);
      console.log(`📋 Created new location doc for index ${locationIndex}`);
    }

    console.log(`📋 Final location docs to save:`, JSON.stringify(currentLocationDocs, null, 2));

    // Update location_documentation using raw SQL to ensure proper JSONB handling
    const updateQuery = `
      UPDATE delivery_orders 
      SET location_documentation = :locationDocs
      WHERE id = :orderId
    `;
    
    const { sequelize } = require('../models');
    await sequelize.query(updateQuery, {
      replacements: {
        locationDocs: JSON.stringify(currentLocationDocs),
        orderId: id
      },
      type: sequelize.QueryTypes.UPDATE
    });

    console.log(`📋 Documentation photos uploaded successfully for location ${locationIndex}`);

    res.status(200).json({
      message: "Documentation photos uploaded successfully",
      data: {
        location_index: locationIndex,
        uploaded_photos: documentationPhotos
      }
    });

  } catch (error) {
    console.error("Error uploading documentation photos:", error);
    next(error);
  }
};

// === NOTA KECIL CONTROLLER METHODS ===

/**
 * @desc    Process individual photo OCR
 * @route   POST /api/delivery-orders/:id/process-nota-kecil/:photoType
 * @access  Private (Driver only)
 */
exports.processIndividualPhotoOCR = async (req, res, next) => {
  try {
    const { id, photoType } = req.params;
    const { customer_location_index } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No photo file provided"
      });
    }

    if (!customer_location_index && customer_location_index !== 0) {
      return res.status(400).json({
        success: false,
        message: "Customer location index is required"
      });
    }

    // Validate photo type
    const validPhotoTypes = ['pressure_bar', 'temperature', 'stan_awal', 'stan_akhir'];
    if (!validPhotoTypes.includes(photoType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid photo type. Must be one of: " + validPhotoTypes.join(', ')
      });
    }

    // Get delivery order
    const deliveryOrder = await DeliveryOrder.findByPk(id);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: "Delivery order not found"
      });
    }

    // Check if driver has access to this delivery order
    if (deliveryOrder.driver_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this delivery order"
      });
    }

    console.log(`Processing OCR for ${photoType} photo...`);

    try {
      // Import OCR service
      const ocrService = require('../services/ocrService');
      
      // Read image file
      const fs = require('fs');
      const imageBuffer = fs.readFileSync(file.path);
      
      // Process with real OCR service
      const ocrResult = await ocrService.processNotaImage(imageBuffer);
      
      // Smart extraction: try to get the requested field first, then fallback to any available value
      let extractedValue = null;
      let confidenceScore = ocrResult.confidence || 0;
      let actualField = photoType; // Track which field actually provided the value
      
      // First, try to get the exact field requested
      switch (photoType) {
        case 'pressure_bar':
          extractedValue = ocrResult.tekanan_operasi;
          break;
        case 'temperature':
          extractedValue = ocrResult.temperatur_operasi;
          break;
        case 'stan_awal':
          extractedValue = ocrResult.stan_awal;
          break;
        case 'stan_akhir':
          extractedValue = ocrResult.stan_akhir;
          break;
        default:
          throw new Error(`Unknown photo type: ${photoType}`);
      }
      
      // If the requested field is null, try to get any available meter reading
      if (extractedValue === null) {
        console.log(`No ${photoType} value found, looking for any available meter reading...`);
        
        // Priority order: stan_akhir, stan_awal, tekanan_operasi, temperatur_operasi
        if (ocrResult.stan_akhir !== null) {
          extractedValue = ocrResult.stan_akhir;
          actualField = 'stan_akhir';
          console.log(`Using stan_akhir value: ${extractedValue}`);
        } else if (ocrResult.stan_awal !== null) {
          extractedValue = ocrResult.stan_awal;
          actualField = 'stan_awal';
          console.log(`Using stan_awal value: ${extractedValue}`);
        } else if (ocrResult.tekanan_operasi !== null) {
          extractedValue = ocrResult.tekanan_operasi;
          actualField = 'pressure_bar';
          console.log(`Using tekanan_operasi value: ${extractedValue}`);
        } else if (ocrResult.temperatur_operasi !== null) {
          extractedValue = ocrResult.temperatur_operasi;
          actualField = 'temperature';
          console.log(`Using temperatur_operasi value: ${extractedValue}`);
        }
      }
      
      // Convert to string for mobile app compatibility
      const extractedValueStr = extractedValue ? extractedValue.toString() : '0';
      
      // Save photo URL
      const photoUrl = `/uploads/nota_kecil/${file.filename}`;

      // Determine if this is a mismatch scenario
      const isMismatch = actualField !== photoType;
      
      const message = isMismatch 
        ? `${photoType} OCR processing completed - Found ${actualField} instead (${extractedValueStr})`
        : `${photoType} OCR processing completed`;

      res.status(200).json({
        success: true,
        message: message,
        data: {
          photo_type: photoType,
          extracted_value: extractedValueStr,
          confidence_score: confidenceScore / 100, // Convert to 0-1 scale
          photo_url: photoUrl,
          processing_time: 2.0,
          customer_location_index: parseInt(customer_location_index),
          actual_field: actualField,
          is_mismatch: isMismatch
        }
      });
      
    } catch (ocrError) {
      console.error(`OCR processing failed for ${photoType}:`, ocrError);
      
      // Fallback to simulated data if OCR fails
      console.log(`Using simulated OCR data as fallback for ${photoType}...`);
      
      const simulatedResults = {
        pressure_bar: { extracted_value: "1.70", confidence_score: 0.92 },
        temperature: { extracted_value: "29.0", confidence_score: 0.88 },
        stan_awal: { extracted_value: "1279.07", confidence_score: 0.95 },
        stan_akhir: { extracted_value: "1413.03", confidence_score: 0.91 },
      };

      const result = simulatedResults[photoType];
      const photoUrl = `/uploads/nota_kecil/${file.filename}`;

      res.status(200).json({
        success: true,
        message: `${photoType} OCR processing completed (simulated)`,
        data: {
          photo_type: photoType,
          extracted_value: result.extracted_value,
          confidence_score: result.confidence_score,
          photo_url: photoUrl,
          processing_time: 1.5,
          customer_location_index: parseInt(customer_location_index),
          simulated: true,
          ocr_error: ocrError.message
        }
      });
    }

  } catch (error) {
    console.error("Error processing individual photo OCR:", error);
    next(error);
  }
};

// Helper function to suggest correct photo type based on OCR results
function getSuggestedPhotoType(requestedType, ocrResult) {
  if (ocrResult.stan_awal && ocrResult.stan_akhir) {
    // If both readings exist, suggest based on which one is closer to typical ranges
    return 'stan_awal'; // Default to stan_awal
  } else if (ocrResult.stan_awal) {
    return 'stan_awal';
  } else if (ocrResult.stan_akhir) {
    return 'stan_akhir';
  } else if (ocrResult.tekanan_operasi) {
    return 'pressure_bar';
  } else if (ocrResult.temperatur_operasi) {
    return 'temperature';
  }
  return null;
}

/**
 * @desc    Process nota kecil OCR (bulk)
 * @route   POST /api/delivery-orders/:id/process-nota-kecil
 * @access  Private (Driver only)
 */
exports.processNotaKecilOCR = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { customer_location_index } = req.body;
    const files = req.files;

    if (!customer_location_index && customer_location_index !== 0) {
      return res.status(400).json({
        success: false,
        message: "Customer location index is required"
      });
    }

    // Get delivery order
    const deliveryOrder = await DeliveryOrder.findByPk(id);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: "Delivery order not found"
      });
    }

    // Check if driver has access to this delivery order
    if (deliveryOrder.driver_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this delivery order"
      });
    }

    console.log("Processing bulk OCR for nota kecil...");

    try {
      // Import services
      const ocrService = require('../services/ocrService');
      const gasCalculationService = require('../services/gasCalculationService');
      const fs = require('fs');
      
      const ocrResults = {
        stan_awal: null,
        stan_akhir: null,
        tekanan_operasi: null,
        temperatur_operasi: null,
        confidence_scores: {},
        photo_results: {}
      };
      
      // Process each photo type if available
      const photoTypes = ['pressure_bar', 'temperature', 'stan_awal', 'stan_akhir'];
      
      for (const photoType of photoTypes) {
        if (files[photoType] && files[photoType][0]) {
          try {
            console.log(`Processing ${photoType} photo...`);
            
            // Read image file
            const imageBuffer = fs.readFileSync(files[photoType][0].path);
            
            // Process with OCR service
            const ocrResult = await ocrService.processNotaImage(imageBuffer);
            
            // Extract the specific value based on photo type
            let extractedValue = null;
            let confidenceScore = ocrResult.confidence || 0;
            
            switch (photoType) {
              case 'pressure_bar':
                extractedValue = ocrResult.tekanan_operasi;
                ocrResults.tekanan_operasi = extractedValue;
                break;
              case 'temperature':
                extractedValue = ocrResult.temperatur_operasi;
                ocrResults.temperatur_operasi = extractedValue;
                break;
              case 'stan_awal':
                extractedValue = ocrResult.stan_awal;
                ocrResults.stan_awal = extractedValue;
                break;
              case 'stan_akhir':
                extractedValue = ocrResult.stan_akhir;
                ocrResults.stan_akhir = extractedValue;
                break;
            }
            
            ocrResults.confidence_scores[photoType] = confidenceScore / 100;
            ocrResults.photo_results[photoType] = {
              extracted_value: extractedValue,
              confidence_score: confidenceScore / 100,
              photo_url: `/uploads/nota_kecil/${files[photoType][0].filename}`,
              full_ocr_result: ocrResult
            };
            
          } catch (photoError) {
            console.error(`Error processing ${photoType}:`, photoError);
            ocrResults.photo_results[photoType] = {
              error: photoError.message,
              extracted_value: null,
              confidence_score: 0
            };
          }
        }
      }
      
      // Calculate gas values if we have all required data
      if (ocrResults.stan_awal && ocrResults.stan_akhir && 
          ocrResults.tekanan_operasi && ocrResults.temperatur_operasi) {
        
        const gasCalculation = gasCalculationService.calculateVolumeGas(
          ocrResults.stan_awal,
          ocrResults.stan_akhir,
          ocrResults.tekanan_operasi,
          ocrResults.temperatur_operasi
        );
        
        ocrResults.Vt = gasCalculation.Vt;
        ocrResults.k = gasCalculation.k;
        ocrResults.V = gasCalculation.V;
      }

      res.status(200).json({
        success: true,
        message: "Nota kecil OCR processing completed",
        data: ocrResults
      });
      
    } catch (error) {
      console.error("Bulk OCR processing failed:", error);
      
      // Fallback to simulated data
      const simulatedResults = {
        stan_awal: 1279.07,
        stan_akhir: 1413.03,
        tekanan_operasi: 1.70,
        temperatur_operasi: 29.0,
        Vt: 133.96,
        k: 1.00034,
        V: 134.00,
        confidence_scores: {
          stan_awal: 0.95,
          stan_akhir: 0.92,
          tekanan_operasi: 0.88,
          temperatur_operasi: 0.91,
        },
        simulated: true,
        error: error.message
      };

      res.status(200).json({
        success: true,
        message: "Nota kecil OCR processing completed (simulated)",
        data: simulatedResults
      });
    }

  } catch (error) {
    console.error("Error processing nota kecil OCR:", error);
    next(error);
  }
};

/**
 * @desc    Confirm nota kecil
 * @route   POST /api/delivery-orders/:id/nota-kecil/confirm
 * @access  Private (Driver only)
 */
exports.confirmNotaKecil = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      stan_awal, 
      stan_akhir, 
      tekanan_operasi, 
      temperatur_operasi, 
      driver_notes,
      customer_location_index,
      customer_name,
      customer_address,
      photos,
      ocr_results 
    } = req.body;

    // Get delivery order
    const deliveryOrder = await DeliveryOrder.findByPk(id);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: "Delivery order not found"
      });
    }

    // Check if driver has access to this delivery order
    if (deliveryOrder.driver_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this delivery order"
      });
    }

    // Import gas calculation service
    const gasCalculationService = require('../services/gasCalculationService');

    // Validate inputs
    const validation = gasCalculationService.validateGasCalculationInputs({
      stan_awal,
      stan_akhir,
      tekanan_operasi,
      temperatur_operasi
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors
      });
    }

    // Calculate gas values
    const calculatedValues = gasCalculationService.calculateVolumeGas(
      stan_awal,
      stan_akhir,
      tekanan_operasi,
      temperatur_operasi
    );

    // Create nota kecil record
    const { NotaKecil } = require('../models');
    
    const notaKecil = await NotaKecil.create({
      delivery_order_id: id,
      customer_location_index: customer_location_index || 0,
      customer_name: customer_name,
      customer_address: customer_address,
      stan_awal: parseFloat(stan_awal),
      stan_akhir: parseFloat(stan_akhir),
      tekanan_operasi: parseFloat(tekanan_operasi),
      temperatur_operasi: parseFloat(temperatur_operasi),
      Vt: calculatedValues.Vt,
      k: calculatedValues.k,
      V: calculatedValues.V,
      pressure_bar_photos: photos?.pressure_bar ? [photos.pressure_bar] : [],
      temperature_photos: photos?.temperature ? [photos.temperature] : [],
      stan_awal_photos: photos?.stan_awal ? [photos.stan_awal] : [],
      stan_akhir_photos: photos?.stan_akhir ? [photos.stan_akhir] : [],
      ocr_confidence_scores: ocr_results,
      ocr_processing_status: 'completed',
      ocr_processed_at: new Date(),
      driver_confirmed: true,
      driver_confirmed_at: new Date(),
      driver_notes: driver_notes || null
    });

    res.status(201).json({
      success: true,
      message: "Nota kecil confirmed successfully",
      data: notaKecil
    });

  } catch (error) {
    console.error("Error confirming nota kecil:", error);
    next(error);
  }
};

/**
 * @desc    Get nota kecils for delivery order
 * @route   GET /api/delivery-orders/:id/nota-kecils
 * @access  Private (Admin, Owner, Driver)
 */
exports.getNotaKecils = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get delivery order
    const deliveryOrder = await DeliveryOrder.findByPk(id);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: "Delivery order not found"
      });
    }

    // Check access permissions
    if (req.user.role === 'driver' && deliveryOrder.driver_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this delivery order"
      });
    }

    const notaKecils = await NotaKecil.findAll({
      where: { delivery_order_id: id },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: notaKecils
    });

  } catch (error) {
    console.error("Error getting nota kecils:", error);
    next(error);
  }
};

/**
 * @desc    Get nota kecils for specific customer location
 * @route   GET /api/delivery-orders/:id/customers/:customerIndex/nota-kecils
 * @access  Private (Admin, Owner, Driver)
 */
exports.getCustomerNotaKecils = async (req, res, next) => {
  try {
    const { id, customerIndex } = req.params;

    // Get delivery order
    const deliveryOrder = await DeliveryOrder.findByPk(id);
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: "Delivery order not found"
      });
    }

    // Check access permissions
    if (req.user.role === 'driver' && deliveryOrder.driver_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this delivery order"
      });
    }

    const notaKecils = await NotaKecil.findAll({
      where: { 
        delivery_order_id: id,
        customer_location_index: parseInt(customerIndex)
      },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: notaKecils
    });

  } catch (error) {
    console.error("Error getting customer nota kecils:", error);
    next(error);
  }
};