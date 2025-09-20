// src/controllers/web/deliveryOrderController.js
const {
  DeliveryOrder,
  DepositGroupMember,
  DepositGroup,
  PurchaseOrder,
  Vehicle,
  DriverProfile,
  User,
  BigDeliveryOrder,
  DeliveryOrderAdjustments,
  DeliveryOrderPayments,
  BigDoTambahan,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");
const { Expo } = require("expo-server-sdk");

// Enhanced calculation helpers with unit awareness
const calculateTotalAmount = (quantity, unitPrice, unit) => {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;

  switch (unit) {
    case "kilogram":
    case "ton":
    case "kubik":
      return qty * price; // Direct: price is per the unit
    default:
      return 0; // Invalid unit: safe default
  }
};

const calculateOngkosan = (totalAmount, tripAllowance, gaji) => {
  const total = parseFloat(totalAmount) || 0;
  const allowance = parseFloat(tripAllowance) || 0;
  const salary = parseFloat(gaji) || 0;

  return total - allowance - salary;
};

/**
 * 🎯 CREATE DELIVERY ORDER (Enhanced with validation and deposit group integration)
 * POST /api/web/delivery-orders
 */
exports.createDeliveryOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      vehicle_id,
      driver_id,
      customer_name,
      item_name,
      minimal_load_quantity,
      unit, // Unit input (will be overridden to kubik)
      unit_price,
      total_amount,
      trip_allowance = 0,
      gaji = 0,
      ongkosan,
      load_location,
      unload_location,
      load_latitude,
      load_longitude,
      unload_latitude,
      unload_longitude,
      additional_unload_locations, // New field for multiple unload locations
      payment_status = "proses_tagihan",
      status = "assigned",
      do_name,
      // Gas filling fields
      gas_volume_m3,
      spbg_location,
      calculation_method,
      jisdor_rate,
      gas_filling_cost,
    } = req.body;

    // Force unit to always be 'kubik' for delivery orders
    const finalUnit = "kubik";

    // Enhanced validation with numeric checks
    if (
      !vehicle_id ||
      !driver_id ||
      !customer_name ||
      !item_name ||
      !unit_price ||
      !minimal_load_quantity ||
      isNaN(parseFloat(minimal_load_quantity)) ||
      isNaN(parseFloat(unit_price))
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Missing or invalid required fields: vehicle_id, driver_id, customer_name, item_name, unit_price, minimal_load_quantity (must be numbers)",
      });
    }

    // Unit is always kubik for DOs - no validation needed
    const finalUnitPrice = unit_price;

    // Enhanced driver availability check
    const activeDriverDelivery = await DeliveryOrder.findOne({
      where: {
        driver_id,
        status: {
          [Op.in]: [
            "assigned",
            "otw_to_load_location",
            "at_load_location",
            "otw_to_unload_location",
            "at_unload_location",
            "otw_to_base",
          ],
        },
      },
      transaction,
    });

    if (activeDriverDelivery) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Driver is already assigned to active delivery order: ${activeDriverDelivery.do_number}`,
      });
    }

    // Enhanced vehicle availability check
    const activeVehicleDelivery = await DeliveryOrder.findOne({
      where: {
        vehicle_id,
        status: {
          [Op.in]: [
            "assigned",
            "otw_to_load_location",
            "at_load_location",
            "otw_to_unload_location",
            "at_unload_location",
            "otw_to_base",
          ],
        },
      },
      transaction,
    });

    if (activeVehicleDelivery) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Vehicle is already assigned to active delivery order: ${activeVehicleDelivery.do_number}`,
      });
    }

    // Check Big DO conflicts
    const existingBigDO = await BigDeliveryOrder.findOne({
      where: {
        driver_id,
        status: { [Op.in]: ["assigned", "in_progress"] },
      },
      transaction,
    });

    if (existingBigDO) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Driver is already assigned to Big DO: ${existingBigDO.big_do_number}`,
      });
    }

    // Enhanced DO number generation (100 attempts)
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    let attempts = 0;
    let do_number;
    do {
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      do_number = `DO-${timestamp}-${randomSuffix}`;
      const existingDO = await DeliveryOrder.findOne({
        where: { do_number },
        transaction,
      });
      if (!existingDO) break;
      attempts++;
    } while (attempts < 100);

    if (attempts >= 100) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to generate unique DO number after 100 attempts",
      });
    }

    // Enhanced calculations
    let calculatedTotalAmount =
      total_amount ||
      calculateTotalAmount(minimal_load_quantity, finalUnitPrice, finalUnit);
    let calculatedOngkosan =
      ongkosan ||
      calculateOngkosan(calculatedTotalAmount, trip_allowance, gaji);

    // Generate DO number if not provided
    let finalDoNumber = do_number;
    if (!finalDoNumber) {
      const yearMonth = `${new Date().getFullYear()}${String(
        new Date().getMonth() + 1
      ).padStart(2, "0")}`;
      const doCount = await DeliveryOrder.count({
        where: { do_number: { [Op.like]: `DO-${yearMonth}-%` } },
        transaction,
      });
      finalDoNumber = `DO-${yearMonth}-${String(doCount + 1).padStart(4, "0")}`;
    }

    // 🎯 GOOGLE MAPS SCRAPING - Scrape coordinates for SPBU and unload locations
    let finalLoadLatitude = load_latitude;
    let finalLoadLongitude = load_longitude;
    let finalUnloadLatitude = unload_latitude;
    let finalUnloadLongitude = unload_longitude;
    let processedAdditionalUnloadLocations = additional_unload_locations || [];

    console.log('🔍 Starting location scraping process...');
    console.log('📍 Input locations:', {
      load_location,
      unload_location,
      additional_unload_locations,
      existing_coordinates: {
        load_lat: load_latitude,
        load_lng: load_longitude,
        unload_lat: unload_latitude,
        unload_lng: unload_longitude
      }
    });

    // Initialize backgroundScrapingData outside try-catch for proper scope
    let backgroundScrapingData = null;

    try {
      const locationsToScrape = [];
      
      // Add load location (SPBU) for scraping if coordinates not provided
      if (load_location && !load_latitude && !load_longitude) {
        locationsToScrape.push({ type: 'load', location: load_location });
        console.log(`➕ Added load location for scraping: ${load_location}`);
      }
      
      // Add unload location for scraping if coordinates not provided
      if (unload_location && !unload_latitude && !unload_longitude) {
        locationsToScrape.push({ type: 'unload', location: unload_location });
        console.log(`➕ Added unload location for scraping: ${unload_location}`);
      }
      
      // Add additional unload locations for scraping
      if (Array.isArray(additional_unload_locations)) {
        additional_unload_locations.forEach((loc, index) => {
          if (typeof loc === 'string' && loc.trim()) {
            locationsToScrape.push({ type: 'additional_unload', location: loc.trim(), index });
            console.log(`➕ Added additional unload location for scraping: ${loc.trim()}`);
          }
        });
      }

      console.log(`📊 Total locations to scrape: ${locationsToScrape.length}`);

      // Store locations for background scraping (don't wait for scraping to complete)
      if (locationsToScrape.length > 0) {
        console.log('🗺️ Will scrape coordinates in background for locations:', locationsToScrape.map(l => l.location));
        backgroundScrapingData = {
          locationsToScrape,
          deliveryOrderData: {
            load_location,
            unload_location,
            additional_unload_locations
          }
        };
      }
    } catch (scrapingError) {
      console.error('❌ Location scraping failed:', scrapingError.message);
      // Continue with DO creation even if scraping fails
    }

    // Create delivery order directly without PO dependency
    const deliveryOrder = await DeliveryOrder.create({
      driver_id,
      vehicle_id,
      do_number: finalDoNumber,
      do_name,
      customer_name,
      item_name,
      minimal_load_quantity,
      unit: finalUnit,
      unit_price: finalUnitPrice,
      total_amount: calculatedTotalAmount,
      trip_allowance,
      gaji,
      ongkosan: calculatedOngkosan,
      load_location,
      load_latitude: finalLoadLatitude,
      load_longitude: finalLoadLongitude,
      unload_location,
      unload_latitude: finalUnloadLatitude,
      unload_longitude: finalUnloadLongitude,
      additional_unload_locations: processedAdditionalUnloadLocations, // Include processed additional unload locations with coordinates
      payment_status,
      status,
      // Gas filling fields
      gas_volume_m3: gas_volume_m3 ? parseFloat(gas_volume_m3) : null,
      spbg_location,
      calculation_method,
      jisdor_rate: jisdor_rate ? parseFloat(jisdor_rate) : null,
      gas_filling_cost: gas_filling_cost ? parseFloat(gas_filling_cost) : null,
    }, {
      transaction,
    });

    // Note: Deposit group integration removed - DOs are now standalone

    // Update vehicle status
    await Vehicle.update(
      { status: "in_use" },
      { where: { id: vehicle_id }, transaction }
    );

    // Enhanced push notification handling (from incoming)
    const driverUser = await User.findOne({
      where: { id: driver_id },
      attributes: ["username", "expo_push_token"],
      include: [
        {
          model: DriverProfile,
          as: "driverProfile",
          attributes: ["full_name"],
        },
      ],
      transaction,
    });

    if (
      driverUser &&
      driverUser.expo_push_token &&
      Expo.isExpoPushToken(driverUser.expo_push_token)
    ) {
      const expo = new Expo();
      const driverName =
        driverUser.driverProfile?.full_name || driverUser.username;
      const messages = [
        {
          to: driverUser.expo_push_token,
          sound: "default",
          title: "Tugas Pengantaran Baru",
          body: `Halo ${driverName}, Anda telah ditugaskan untuk DO ${
            deliveryOrder.do_name || deliveryOrder.do_number
          }. Silakan cek detail pengantaran di aplikasi.`,
          data: { do_number: deliveryOrder.do_number },
        },
      ];

      try {
        await expo.sendPushNotificationsAsync(messages);
      } catch (pushError) {
        console.error("Push notification error:", pushError);
        // Don't fail the whole operation, but log it
      }
    }

    await transaction.commit();

    // Start background location scraping after successful DO creation
    if (backgroundScrapingData) {
      console.log(`🚀 Starting background location scraping for DO ${deliveryOrder.do_number}`);
      
      // Run scraping in background (don't await)
      scrapeLocationsInBackground(deliveryOrder.id, backgroundScrapingData)
        .catch(err => {
          console.error(`❌ Background scraping failed for DO ${deliveryOrder.do_number}:`, err.message);
        });
    }

    res.status(201).json({
      success: true,
      message: "Delivery order created successfully" + (backgroundScrapingData ? " (location scraping in progress)" : ""),
      data: {
        ...deliveryOrder.toJSON(),
        unit_display: deliveryOrder.getUnitDisplay() || "N/A",
        financial_summary: deliveryOrder.getFinancialSummary() || {},
        big_do_context: deliveryOrder.getBigDOContext() || null,
        scraping_in_progress: backgroundScrapingData ? true : false,
      },
    });
  } catch (err) {
    // Only rollback if transaction hasn't been committed yet
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error creating delivery order:", err);
    res.status(500).json({ 
      success: false, 
      message: "An unexpected error occurred on the server.",
      details: err.message 
    });
    next(err);
  }
};

/**
 * 🎯 GET ALL DELIVERY ORDERS (Enhanced for new architecture)
 * GET /api/web/delivery-orders
 */
exports.getAllDeliveryOrders = async (req, res, next) => {
  try {
    const {
      status,
      driver_id,
      vehicle_id,
      page = 1,
      limit = 10,
      search,
      po_id,
      big_do_filter,
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) {
      // Handle comma-separated status values
      if (typeof status === 'string' && status.includes(',')) {
        whereClause.status = { [Op.in]: status.split(',').map(s => s.trim()) };
      } else {
        whereClause.status = status;
      }
    }
    if (driver_id) whereClause.driver_id = driver_id;
    if (vehicle_id) whereClause.vehicle_id = vehicle_id;
    if (po_id) whereClause.purchase_order_id = po_id;

    if (search) {
      whereClause[Op.or] = [
        { do_number: { [Op.iLike]: `%${search}%` } },
        { do_name: { [Op.iLike]: `%${search}%` } },
        { customer_name: { [Op.iLike]: `%${search}%` } },
        { item_name: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Enhanced Big DO filtering (from incoming)
    if (big_do_filter === "standalone") {
      whereClause.id = {
        [Op.notIn]: sequelize.literal(
          "(SELECT main_delivery_order_id FROM big_delivery_orders WHERE status != 'cancelled')"
        ),
      };
    } else if (big_do_filter === "main_dos") {
      whereClause.id = {
        [Op.in]: sequelize.literal(
          "(SELECT main_delivery_order_id FROM big_delivery_orders WHERE status != 'cancelled')"
        ),
      };
    }

    // Enhanced statistics calculation (from incoming)
    const fullWhere = { ...whereClause };
    const statsPromises = [
      DeliveryOrder.count({ where: fullWhere }),
      DeliveryOrder.count({ where: { ...fullWhere, status: "assigned" } }),
      DeliveryOrder.count({
        where: {
          ...fullWhere,
          status: {
            [Op.in]: [
              "otw_to_load_location",
              "at_load_location",
              "otw_to_unload_location",
              "at_unload_location",
              "otw_to_base",
            ],
          },
        },
      }),
      DeliveryOrder.count({ where: { ...fullWhere, status: "completed" } }),
      DeliveryOrder.count({ where: { ...fullWhere, status: "cancelled" } }),
      DeliveryOrder.sum("total_amount", { where: fullWhere }) || 0,
      DeliveryOrder.sum("ongkosan", { where: fullWhere }) || 0,
      DeliveryOrder.count({
        where: {
          ...fullWhere,
          id: {
            [Op.notIn]: sequelize.literal(
              "(SELECT main_delivery_order_id FROM big_delivery_orders)"
            ),
          },
        },
      }),
      DeliveryOrder.count({
        where: {
          ...fullWhere,
          id: {
            [Op.in]: sequelize.literal(
              "(SELECT main_delivery_order_id FROM big_delivery_orders)"
            ),
          },
        },
      }),
      DeliveryOrder.count({ where: { ...fullWhere, unit: "kilogram" } }),
      DeliveryOrder.count({ where: { ...fullWhere, unit: "ton" } }),
      DeliveryOrder.count({ where: { ...fullWhere, unit: "kubik" } }),
    ];

    const [
      total,
      assigned,
      in_progress,
      completed,
      cancelled,
      total_revenue,
      total_ongkosan,
      standalone_dos,
      main_dos,
      kilogram,
      ton,
      kubik,
    ] = await Promise.all(statsPromises);

    const { count, rows: deliveryOrders } = await DeliveryOrder.findAndCountAll(
      {
        where: whereClause,
        include: [
          // Removed PO include - DOs are now standalone
          {
            model: User,
            as: "driver",
            attributes: ["id", "username"],
            include: [
              {
                model: DriverProfile,
                as: "driverProfile",
                attributes: ["full_name", "phone"],
              },
            ],
          },
          {
            model: Vehicle,
            as: "vehicle",
            attributes: ["license_plate", "type", "capacity"],
          },
          {
            model: BigDeliveryOrder,
            as: "bigDeliveryOrderAsMain",
            attributes: ["big_do_number", "status", "total_trip_allowance"],
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    );

    // Enhanced data with computed fields and null checks (from incoming)
    const enhancedDOs = deliveryOrders.map((dOrder) => {
      const doData = dOrder.toJSON();
      const orderUnit = doData.unit || "ton"; // Unit is now directly stored in DO

      let actualTotalAmount = null;
      if (doData.actual_load_quantity && doData.unit_price && orderUnit) {
        actualTotalAmount = calculateTotalAmount(
          doData.actual_load_quantity,
          doData.unit_price,
          orderUnit
        );
      }

      return {
        ...doData,
        unit: orderUnit,
        status_text: dOrder.getStatusText() || doData.status,
        financial_summary: {
          ...(dOrder.getFinancialSummary() || {}),
          actual_total_amount: actualTotalAmount,
          unit: orderUnit,
          unit_display: dOrder.getUnitDisplay() || orderUnit,
        },
        driver_name:
          doData.driver?.driverProfile?.full_name ||
          doData.driver?.username ||
          "N/A",
        vehicle_info:
          `${doData.vehicle?.license_plate} (${doData.vehicle?.type})` || "N/A",
        big_do_context: dOrder.getBigDOContext() || null,
        big_do_info: doData.bigDeliveryOrderAsMain
          ? {
              big_do_number: doData.bigDeliveryOrderAsMain.big_do_number,
              big_do_status: doData.bigDeliveryOrderAsMain.status,
              total_trip_allowance:
                doData.bigDeliveryOrderAsMain.total_trip_allowance,
            }
          : null,
      };
    });

    // Enhanced summary stats (from incoming)
    const stats = {
      total,
      assigned,
      in_progress,
      completed,
      cancelled,
      total_revenue,
      total_ongkosan,
      big_do_breakdown: { standalone_dos, main_dos },
      unit_distribution: { kilogram, ton, kubik },
    };

    res.json({
      success: true,
      data: enhancedDOs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
      stats,
    });
  } catch (err) {
    console.error("Error getting delivery orders:", err);
    res.status(500).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * 🎯 GET DO BY ID (Enhanced for new architecture)
 * GET /api/web/delivery-orders/:id
 */
exports.getDeliveryOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deliveryOrder = await DeliveryOrder.findByPk(id, {
      include: [
          // Removed PO include - DOs are now standalone
        {
          model: User,
          as: "driver",
          include: [{ model: DriverProfile, as: "driverProfile" }],
        },
        { model: Vehicle, as: "vehicle" },
        {
          model: BigDeliveryOrder,
          as: "bigDeliveryOrderAsMain",
          include: [
            {
              model: BigDoTambahan,
              as: "tambahan",
              attributes: ["id", "customer_name", "total_amount", "status"],
            },
          ],
          required: false,
        },
      ],
    });

    if (!deliveryOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery Order not found" });
    }

    const doData = deliveryOrder.toJSON();
    const orderUnit = doData.unit || doData.purchaseOrder?.unit || "ton";

    // Enhanced calculation with null handling (from incoming)
    let minimalTotalAmount =
      doData.minimal_load_quantity && doData.unit_price
        ? calculateTotalAmount(
            doData.minimal_load_quantity,
            doData.unit_price,
            orderUnit
          )
        : null;
    let actualTotalAmount =
      doData.actual_load_quantity && doData.unit_price
        ? calculateTotalAmount(
            doData.actual_load_quantity,
            doData.unit_price,
            orderUnit
          )
        : null;

    res.json({
      success: true,
      data: {
        ...doData,
        unit: orderUnit,
        status_text: deliveryOrder.getStatusText() || doData.status,
        financial_summary: {
          ...(deliveryOrder.getFinancialSummary() || {}),
          minimal_total_amount: minimalTotalAmount,
          actual_total_amount: actualTotalAmount,
          unit: orderUnit,
          unit_display: deliveryOrder.getUnitDisplay() || orderUnit,
        },
        timeline: {
          created_at: doData.created_at,
          departed_from_spbu_at: doData.departed_from_spbu_at,
          arrived_at_unload_location_at: doData.arrived_at_unload_location_at,
          departed_from_unload_location_at:
            doData.departed_from_unload_location_at,
          completed_at: doData.completed_at,
        },
        big_do_context: deliveryOrder.getBigDOContext() || null,
        big_do_info: doData.bigDeliveryOrderAsMain
          ? {
              big_do_number: doData.bigDeliveryOrderAsMain.big_do_number,
              big_do_status: doData.bigDeliveryOrderAsMain.status,
              tambahan_count:
                doData.bigDeliveryOrderAsMain.tambahan?.length || 0,
              tambahan_summary: doData.bigDeliveryOrderAsMain.tambahan || [],
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Error getting delivery order by ID:", err);
    res.status(500).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * 🎯 UPDATE DELIVERY ORDER (Enhanced)
 * PUT /api/web/delivery-orders/:id
 */
exports.updateDeliveryOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      purchase_order_id,
      vehicle_id,
      driver_id,
      customer_name,
      item_name,
      minimal_load_quantity,
      unit,
      unit_price,
      total_amount,
      trip_allowance,
      gaji,
      ongkosan,
      load_location,
      unload_location,
      load_latitude,
      load_longitude,
      unload_latitude,
      unload_longitude,
      additional_unload_locations, // Add support for additional unload locations
      payment_status,
      status,
      do_name,
    } = req.body;

    const deliveryOrder = await DeliveryOrder.findByPk(id, { transaction });

    if (!deliveryOrder) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Delivery Order not found" });
    }

    // Enhanced unit validation (from incoming)
    if (unit && !["kilogram", "ton", "kubik"].includes(unit)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid unit. Must be one of: kilogram, ton, kubik",
      });
    }

    // Enhanced proposed data preparation (from incoming)
    const proposedData = {
      purchase_order_id: purchase_order_id ?? deliveryOrder.purchase_order_id,
      vehicle_id: vehicle_id ?? deliveryOrder.vehicle_id,
      driver_id: driver_id ?? deliveryOrder.driver_id,
      customer_name: customer_name ?? deliveryOrder.customer_name,
      item_name: item_name ?? deliveryOrder.item_name,
      minimal_load_quantity:
        minimal_load_quantity ?? deliveryOrder.minimal_load_quantity,
      unit: unit ?? deliveryOrder.unit,
      unit_price: unit_price ?? deliveryOrder.unit_price,
      total_amount: total_amount ?? deliveryOrder.total_amount,
      trip_allowance: trip_allowance ?? deliveryOrder.trip_allowance,
      gaji: gaji ?? deliveryOrder.gaji,
      ongkosan: ongkosan ?? deliveryOrder.ongkosan,
      load_location: load_location ?? deliveryOrder.load_location,
      unload_location: unload_location ?? deliveryOrder.unload_location,
      load_latitude: load_latitude ?? deliveryOrder.load_latitude,
      load_longitude: load_longitude ?? deliveryOrder.load_longitude,
      unload_latitude: unload_latitude ?? deliveryOrder.unload_latitude,
      unload_longitude: unload_longitude ?? deliveryOrder.unload_longitude,
      additional_unload_locations: additional_unload_locations ?? deliveryOrder.additional_unload_locations,
      payment_status: payment_status ?? deliveryOrder.payment_status,
      status: status ?? deliveryOrder.status,
      do_name: do_name ?? deliveryOrder.do_name,
    };

    // Enhanced recalculation (from incoming)
    let calculatedTotalAmount = proposedData.total_amount;
    if (
      proposedData.minimal_load_quantity &&
      proposedData.unit_price &&
      proposedData.unit
    ) {
      calculatedTotalAmount = calculateTotalAmount(
        proposedData.minimal_load_quantity,
        proposedData.unit_price,
        proposedData.unit
      );
    }

    let calculatedOngkosan = proposedData.ongkosan;
    if (
      calculatedTotalAmount &&
      (proposedData.trip_allowance || proposedData.gaji)
    ) {
      calculatedOngkosan = calculateOngkosan(
        calculatedTotalAmount,
        proposedData.trip_allowance,
        proposedData.gaji
      );
    }

    proposedData.total_amount = calculatedTotalAmount;
    proposedData.ongkosan = calculatedOngkosan;

    // Enhanced validation with temp DO (from incoming)
    const tempDO = DeliveryOrder.build({
      ...deliveryOrder.dataValues,
      ...proposedData,
    });

    // Check if status is changing to update driver status accordingly
    const isStatusChanging = status && status !== deliveryOrder.status;
    const oldStatus = deliveryOrder.status;
    const newStatus = status;
    
    console.log(`🔄 Admin Update - DO ${id}:`);
    console.log(`  - Status changing: ${isStatusChanging}`);
    console.log(`  - Old status: ${oldStatus}`);
    console.log(`  - New status: ${newStatus}`);
    console.log(`  - Driver ID: ${deliveryOrder.driver_id}`);

    // Update delivery order
    const updatedDO = await deliveryOrder.update(proposedData, { transaction });

    // Update driver and vehicle status when DO status changes
    if (isStatusChanging && updatedDO.driver_id) {
      await updateDriverAndVehicleStatus(updatedDO, oldStatus, newStatus, transaction);
    }

    await transaction.commit();

    // Enhanced response with PO stats (from incoming)
    const po = await PurchaseOrder.findByPk(updatedDO.purchase_order_id);
    const stats = po && po.getRemainingAndForecast 
      ? await po.getRemainingAndForecast() 
      : null;

    res.json({
      success: true,
      message: "Delivery Order updated successfully",
      data: {
        ...updatedDO.toJSON(),
        financial_summary: updatedDO.getFinancialSummary() || {},
        po_stats: stats,
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error updating delivery order:", err);
    res.status(500).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * 🎯 CANCEL DELIVERY ORDER (Enhanced)
 * PATCH /api/web/delivery-orders/:id/cancel
 */
exports.cancelDeliveryOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const deliveryOrder = await DeliveryOrder.findByPk(id, { transaction });

    if (!deliveryOrder) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Delivery Order not found" });
    }

    // Check if DO is part of Big DO
    const bigDO = await BigDeliveryOrder.findOne({
      where: { main_delivery_order_id: id },
      transaction,
    });

    if (bigDO) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Cannot cancel DO that is main DO of Big DO. Cancel the Big DO instead.",
      });
    }

    // Update delivery order status
    const oldStatus = deliveryOrder.status;
    await deliveryOrder.update(
      {
        status: "cancelled",
        notes: cancellation_reason || "Cancelled by admin",
      },
      { transaction }
    );

    // Update driver and vehicle status
    await updateDriverAndVehicleStatus(deliveryOrder, oldStatus, "cancelled", transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: "Delivery Order cancelled successfully",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error cancelling delivery order:", err);
    res.status(500).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * 🎯 COMPLETE DELIVERY ORDER (From current - deposit group integration)
 * PATCH /api/web/delivery-orders/:id/complete
 */
exports.completeDeliveryOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { actual_load_quantity, notes } = req.body;

    // Find DO with PO and DepositGroup relationship
    const deliveryOrder = await DeliveryOrder.findByPk(id, {
      include: [
        // Removed PO include - DOs are now standalone
      ],
      transaction,
    });

    if (!deliveryOrder) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Delivery Order not found",
      });
    }

    if (deliveryOrder.status === "completed") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Delivery Order is already completed",
      });
    }

    // Check if DO is linked to a deposit group via its PO
    const po = deliveryOrder.purchaseOrder;
    const isDepositLinked = !!(po && po.deposit_group_id);

    // Check if DO is a direct member of any deposit group
    const dgMember = await DepositGroupMember.findOne({
      where: { delivery_order_id: id },
      include: [{ model: DepositGroup, as: 'group' }],
      transaction,
    });

    const isInDepositGroup = !!dgMember;

    // Auto-payment logic: Set payment status based on ANY deposit linkage
    let paymentStatus;
    let paymentConfirmationStatus;
    let paymentConfirmedAt = null;

    if (isDepositLinked || isInDepositGroup) {
      // Any deposit-linked DO should be automatically marked as paid upon completion
      paymentStatus = "lunas";
      paymentConfirmationStatus = "confirmed";
      paymentConfirmedAt = new Date();
      
      console.log(`✅ DO ${id} auto-paid via deposit group - Deposit linked: ${isDepositLinked}, In group: ${isInDepositGroup}`);
    } else {
      // Regular DOs follow the normal payment process
      paymentStatus = "awaiting_confirmation";
      paymentConfirmationStatus = "awaiting_confirmation";
    }

    // Prepare data for updating the Delivery Order
    const updateData = {
      status: "completed",
      completed_at: new Date(),
      payment_status: paymentStatus,
      payment_confirmation_status: paymentConfirmationStatus,
      payment_confirmation_at: paymentConfirmedAt,
      actual_load_quantity: actual_load_quantity || deliveryOrder.actual_load_quantity,
      notes: notes || deliveryOrder.notes,
    };

    await deliveryOrder.update(updateData, { transaction });

    // If the DO is part of a deposit group, update the group's balance and quantity
    if (dgMember && dgMember.group) {
      const grp = dgMember.group;
      const qtyUsed = parseFloat(updateData.actual_load_quantity);
      // Ensure unit_price is a valid number before calculation
      const unitPrice = parseFloat(deliveryOrder.unit_price);
      if (isNaN(unitPrice)) {
          throw new Error(`Invalid unit_price for DO ${deliveryOrder.id}`);
      }
      const priceUsed = qtyUsed * unitPrice;

      console.log(`🔄 Processing deposit group ${grp.id} for DO ${id}`);
      console.log(`📊 Reducing: ${qtyUsed} qty, Rp ${priceUsed.toLocaleString('id-ID')} amount`);

      // Properly reduce both quantity and balance
      const currentRemaining = parseFloat(grp.remaining_quantity) || 0;
      const currentBalance = parseFloat(grp.balance) || 0;
      
      grp.remaining_quantity = Math.max(0, currentRemaining - qtyUsed);
      grp.balance = Math.max(0, currentBalance - priceUsed);

      // Update group status based on remaining quantities
      if (grp.remaining_quantity <= 0 && grp.balance <= 0) {
        grp.status = 'fulfilled';
      } else if (grp.remaining_quantity < 0 || grp.balance < 0) {
        grp.status = 'overdrawn';
      } else {
        grp.status = 'active';
      }

      await grp.save({ transaction });
      
      // Also update the quantity in the DepositGroupMember table itself
      await dgMember.update({ quantity: qtyUsed }, { transaction });

      console.log(`✅ Updated deposit group: remaining ${grp.remaining_quantity}, balance Rp ${grp.balance.toLocaleString('id-ID')}`);

      // Handle excess quantities (selisih)
      const minimalQuantity = parseFloat(deliveryOrder.minimal_load_quantity);
      const excess = qtyUsed - minimalQuantity;
      
      if (excess > 0) {
        const excessAmount = excess * unitPrice;

        // Create adjustment record for excess quantity
        await DeliveryOrderAdjustments.create({
          delivery_order_id: id,
          payment_amount: priceUsed,
          payment_type: 'deposit', // Use 'deposit' as the payment type
          payment_date: new Date(),
          notes: `Auto-payment from Deposit Group: ${grp.group_name}`,
          received_by: req.user?.id,
          created_by: req.user?.id,
        }, { transaction });

        console.log(`📊 Recorded excess: ${excess} ${deliveryOrder.unit} = Rp ${excessAmount.toLocaleString('id-ID')}`);
      }
    }

    // Free up vehicle for another trip
    if (deliveryOrder.vehicle_id) {
      await Vehicle.update(
        { status: "available" },
        { where: { id: deliveryOrder.vehicle_id }, transaction }
      );
    }

    await transaction.commit();

    // Return updated DO with enriched data for the frontend
    const updatedDO = await DeliveryOrder.findByPk(id, {
      include: [
        // Removed PO include - DOs are now standalone
      ],
    });

    const isAutoPaid = !!(isDepositLinked || isInDepositGroup);

    res.json({
      success: true,
      message: isAutoPaid 
        ? "✅ DO completed and auto-paid via deposit group" 
        : "DO completed successfully",
      data: {
        ...updatedDO.toJSON(),
        is_auto_paid: isAutoPaid,
        deposit_group_handled: isAutoPaid,
        deposit_group_info: dgMember && dgMember.group ? {
          id: dgMember.group.id,
          name: dgMember.group.group_name,
          status: dgMember.group.status,
          remaining_quantity: dgMember.group.remaining_quantity,
          balance: dgMember.group.balance,
        } : null,
        unit_display: updatedDO.getUnitDisplay ? updatedDO.getUnitDisplay() : updatedDO.unit,
        financial_summary: updatedDO.getFinancialSummary ? updatedDO.getFinancialSummary() : null,
      },
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Error completing delivery order:", err);
    next(err);
  }
};


/**
 * 🎯 GET DELIVERY STATISTICS (Enhanced)
 * GET /api/web/delivery-orders/statistics
 */
exports.getDeliveryStatistics = async (req, res, next) => {
  try {
    const { period = "month" } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (period === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { created_at: { [Op.gte]: weekAgo } };
    } else if (period === "month") {
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { created_at: { [Op.gte]: monthAgo } };
    } else if (period === "year") {
      const yearAgo = new Date(now.getFullYear(), 0, 1);
      dateFilter = { created_at: { [Op.gte]: yearAgo } };
    }

    const [
      totalDeliveries,
      completedDeliveries,
      cancelledDeliveries,
      totalRevenue,
      totalOngkosan,
      totalTripAllowance,
      totalGaji,
    ] = await Promise.all([
      DeliveryOrder.count({ where: dateFilter }),
      DeliveryOrder.count({ where: { ...dateFilter, status: "completed" } }),
      DeliveryOrder.count({ where: { ...dateFilter, status: "cancelled" } }),
      DeliveryOrder.sum("total_amount", {
        where: { ...dateFilter, status: "completed" },
      }) || 0,
      DeliveryOrder.sum("ongkosan", {
        where: { ...dateFilter, status: "completed" },
      }) || 0,
      DeliveryOrder.sum("trip_allowance", {
        where: { ...dateFilter, status: "completed" },
      }) || 0,
      DeliveryOrder.sum("gaji", {
        where: { ...dateFilter, status: "completed" },
      }) || 0,
    ]);

    const totalDriverCosts = totalTripAllowance + totalGaji;
    const completionRate =
      totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0;
    const netProfit = totalOngkosan; // Ongkosan already deducts costs

    // Enhanced unit distribution (from incoming)
    const unitStats = await DeliveryOrder.findAll({
      where: dateFilter,
      attributes: [
        "unit",
        [sequelize.fn("COUNT", "*"), "count"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              "COALESCE(actual_load_quantity, minimal_load_quantity)"
            )
          ),
          "total_quantity",
        ],
      ],
      group: ["unit"],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        period,
        total_deliveries: totalDeliveries,
        completed_deliveries: completedDeliveries,
        cancelled_deliveries: cancelledDeliveries,
        completion_rate: parseFloat(completionRate.toFixed(2)),
        total_revenue: totalRevenue,
        total_ongkosan: totalOngkosan,
        total_driver_costs: totalDriverCosts,
        net_profit: netProfit,
        unit_distribution: unitStats.reduce((acc, stat) => {
          const unit = stat.unit || "unknown";
          acc[unit] = {
            count: parseInt(stat.count),
            total_quantity: parseFloat(stat.total_quantity) || 0,
          };
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    console.error("Error getting delivery statistics:", err);
    res.status(500).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * 🎯 HELPER FUNCTION: Update Driver and Vehicle Status
 * Updates driver and vehicle status based on delivery order status changes
 */
const updateDriverAndVehicleStatus = async (deliveryOrder, oldStatus, newStatus, transaction) => {
  try {
    console.log(`Updating driver/vehicle status: DO ${deliveryOrder.id} changed from ${oldStatus} to ${newStatus}`);

    // Define status mappings for driver and vehicle
    const getDriverStatus = (doStatus) => {
      switch (doStatus) {
        case 'assigned':
        case 'otw_to_load_location':
        case 'at_load_location':
        case 'otw_to_unload_location':
        case 'at_unload_location':
          return 'busy';
        case 'completed':
        case 'cancelled':
          return 'available';
        default:
          return 'available';
      }
    };

    const getVehicleStatus = (doStatus) => {
      switch (doStatus) {
        case 'assigned':
        case 'otw_to_load_location':
        case 'at_load_location':
        case 'otw_to_unload_location':
        case 'at_unload_location':
          return 'in_use';
        case 'completed':
        case 'cancelled':
          return 'available';
        default:
          return 'available';
      }
    };

    const newDriverStatus = getDriverStatus(newStatus);
    const newVehicleStatus = getVehicleStatus(newStatus);

    // Update driver status
    if (deliveryOrder.driver_id) {
      await DriverProfile.update(
        { status: newDriverStatus },
        { 
          where: { user_id: deliveryOrder.driver_id },
          transaction 
        }
      );
      console.log(`Updated driver ${deliveryOrder.driver_id} status to: ${newDriverStatus}`);
    }

    // Update vehicle status
    if (deliveryOrder.vehicle_id) {
      await Vehicle.update(
        { status: newVehicleStatus },
        { 
          where: { id: deliveryOrder.vehicle_id },
          transaction 
        }
      );
      console.log(`Updated vehicle ${deliveryOrder.vehicle_id} status to: ${newVehicleStatus}`);
    }

  } catch (error) {
    console.error('Error updating driver/vehicle status:', error);
    throw error;
  }
};

/**
 * 🎯 BACKGROUND LOCATION SCRAPING
 * Scrapes location coordinates in the background and updates the delivery order
 */
async function scrapeLocationsInBackground(deliveryOrderId, scrapingData) {
  try {
    console.log(`🔍 Background scraping started for DO ID ${deliveryOrderId}`);
    
    const { scrapeMultipleLocations } = require("../../utils/locationScraper");
    const { locationsToScrape } = scrapingData;
    
    // Perform the scraping
    const scrapingResults = await scrapeMultipleLocations(locationsToScrape);
    
    // Prepare update data
    const updateData = {};
    let hasUpdates = false;
    
    // Apply scraped coordinates
    if (scrapingResults.load.lat && scrapingResults.load.lng) {
      updateData.load_latitude = scrapingResults.load.lat;
      updateData.load_longitude = scrapingResults.load.lng;
      hasUpdates = true;
      console.log(`✅ Background: Found load coordinates: ${scrapingResults.load.lat}, ${scrapingResults.load.lng}`);
    }
    
    if (scrapingResults.unload.lat && scrapingResults.unload.lng) {
      updateData.unload_latitude = scrapingResults.unload.lat;
      updateData.unload_longitude = scrapingResults.unload.lng;
      hasUpdates = true;
      console.log(`✅ Background: Found unload coordinates: ${scrapingResults.unload.lat}, ${scrapingResults.unload.lng}`);
    }
    
    if (scrapingResults.additional.length > 0) {
      updateData.additional_unload_locations = scrapingResults.additional;
      hasUpdates = true;
      console.log(`✅ Background: Found ${scrapingResults.additional.length} additional location coordinates`);
    }
    
    // Update the delivery order if we have new coordinates
    if (hasUpdates) {
      await DeliveryOrder.update(updateData, {
        where: { id: deliveryOrderId }
      });
      
      console.log(`🎯 Background scraping completed for DO ID ${deliveryOrderId} - coordinates updated`);
    } else {
      console.log(`⚠️ Background scraping completed for DO ID ${deliveryOrderId} - no coordinates found`);
    }
    
  } catch (error) {
    console.error(`❌ Background scraping error for DO ID ${deliveryOrderId}:`, error.message);
    // Don't throw error for background processing - just log it
  }
}

