// src/models/deliveryOrder.model.js
const { DataTypes, Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const DeliveryOrder = sequelize.define(
    "DeliveryOrder",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // === FOREIGN KEYS ===
      driver_id: { type: DataTypes.INTEGER },
      vehicle_id: { type: DataTypes.INTEGER },

      // === BASIC INFO ===
      do_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      do_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Human-readable name for the delivery order",
      },
      customer_name: { type: DataTypes.STRING(100), allowNull: true },
      customer_location: { type: DataTypes.TEXT, allowNull: true },
      // Item name now directly specified for each DO
      item_name: { type: DataTypes.STRING(100), allowNull: true },

      // === QUANTITY FIELDS ===
      minimal_load_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        comment: "Minimal quantity yang harus diangkut (dari admin) - DEPRECATED",
        validate: { min: 0 },
      },
      actual_load_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Actual quantity yang diangkut (dari driver)",
        validate: { min: 0 },
      },
      unit: {
        type: DataTypes.ENUM("kilogram", "ton", "kubik"),
        allowNull: false,
        defaultValue: "kubik",
        comment: "Unit satuan barang - always kubik for DOs",
      },
      // === FINANCIAL FIELDS ===
      unit_price: {
        type: DataTypes.DECIMAL,
        allowNull: false, // Prevent null values
        defaultValue: 0,  // Set a default to avoid missing data
        comment: "Price per unit of the delivery order",
      },
      total_amount: { type: DataTypes.DECIMAL, allowNull: false },
      trip_allowance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Uang operasional (bensin, tol, dll)",
        validate: { min: 0 },
      },
      gaji: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Upah/bayaran untuk driver",
        validate: { min: 0 },
      },
      ongkosan: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0,
        comment: "Pendapatan/keuntungan dari trip (hanya untuk admin/web)",
        validate: { min: 0 },
      },

      final_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: null,
        comment: "Finalized amount after user input or adjustments"
      },

      is_amount_finalized: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      // === LOCATION FIELDS ===
      load_location: { type: DataTypes.TEXT },
      load_latitude: {
        type: DataTypes.DECIMAL(10, 8),
        validate: { min: -90, max: 90 },
      },
      load_longitude: {
        type: DataTypes.DECIMAL(11, 8),
        validate: { min: -180, max: 180 },
      },
      unload_location: { type: DataTypes.TEXT },
      unload_latitude: {
        type: DataTypes.DECIMAL(10, 8),
        validate: { min: -90, max: 90 },
      },
      unload_longitude: {
        type: DataTypes.DECIMAL(11, 8),
        validate: { min: -180, max: 180 },
      },
      // Additional unload locations as JSON array
      additional_unload_locations: { 
        type: DataTypes.JSONB, 
        allowNull: true,
        comment: 'JSON array of additional unload locations: [{"location": "Address", "latitude": "lat", "longitude": "lng"}]'
      },

      // === GAS FILLING FIELDS ===
      gas_volume_m3: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Gas volume in cubic meters',
        validate: { min: 0 }
      },
      spbg_location: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'SPBG (Stasiun Pengisian Bahan Bakar Gas) location for gas filling - DEPRECATED'
      },
      calculation_method: {
        type: DataTypes.ENUM('jisdor', 'fixed'),
        allowNull: true,
        defaultValue: 'jisdor',
        comment: 'Method for calculating gas filling cost (jisdor or fixed)'
      },
      jisdor_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'JISDOR rate in IDR per cubic meter',
        validate: { min: 0 }
      },
      gas_filling_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Calculated gas filling cost',
        validate: { min: 0 }
      },

      // === DISTANCE TRACKING FIELDS ===
      planned_route_distance_km: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Planned route distance in kilometers for distance comparison'
      },
      actual_traveled_distance_km: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Actual traveled distance in kilometers based on GPS tracking'
      },
      distance_tolerance_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 31.0,
        comment: 'Distance tolerance percentage (default 31%)'
      },
      distance_compliance_status: {
        type: DataTypes.ENUM('within_tolerance', 'exceeds_tolerance', 'not_calculated'),
        allowNull: true,
        defaultValue: 'not_calculated',
        comment: 'Status of distance compliance with planned route'
      },

      // === DOCUMENT FIELD ===
      surat_jalan_photo_url: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: true,
        comment: "Photo surat jalan yang diambil driver di lokasi muat",
      },
      // === SURAT JALAN OCR FIELDS ===
      surat_jalan_ocr_data: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "OCR extracted data from surat jalan photos",
      },
      surat_jalan_ocr_confidence: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: "Overall confidence score of surat jalan OCR extraction (0-100)",
      },
      surat_jalan_volume_extracted: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Total volume pengisian extracted from surat jalan via OCR",
      },
      surat_jalan_ocr_confirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Whether admin has confirmed the OCR extracted data",
      },
      surat_jalan_confirmed_volume: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Admin-confirmed volume (may differ from OCR extracted volume)",
      },
      surat_jalan_ocr_processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when OCR processing was completed",
      },
      surat_jalan_confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when admin confirmed the OCR data",
      },
      surat_jalan_confirmed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "User ID of admin who confirmed the OCR data",
      },
      nota_photo_url: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: true,
        comment: "Array of nota (receipt) photo URLs uploaded when driver arrives at customer location",
      },
      location_documentation: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Per-location documentation: [{location_index: 0, location_name: 'Bandung', photos: ['url1'], uploaded_at: 'timestamp', completed: true}]",
      },

      // === PAYMENT FIELDS ===
      payment_status: {
        type: DataTypes.STRING(30),
        defaultValue: "awaiting_confirmation",
        validate: {
          isIn: [
            ["awaiting_confirmation", "lunas", "deposit", "proses_tagihan"],
          ],
        },
      },
      payment_type: {
        type: DataTypes.STRING(20),
        validate: { isIn: [["cash", "transfer", "deposit"]] },
      },
      deposit_amount: { type: DataTypes.DECIMAL, defaultValue: 0 },
      invoice_amount: { type: DataTypes.DECIMAL },
      due_date: { type: DataTypes.DATE },

      payment_confirmation_status: {
        type: DataTypes.STRING(30),
        defaultValue: "pending",
        validate: {
          isIn: [["pending", "awaiting_confirmation", "confirmed"]],
        },
        comment: "Status konfirmasi untuk billing process",
      },
      payment_confirmation_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when payment was confirmed for billing",
      },
      payment_confirmed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "User ID who confirmed the payment for billing",
      },

      // ✅ ENHANCED: Add payment notes field (missing from your model)
      payment_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Additional payment notes",
      },

      // === STATUS ===
      status: {
        type: DataTypes.ENUM(
          "assigned",
          "at_spbu",
          "otw_to_unload_location",
          "at_unload_location",
          "completed",
          "cancelled"
        ),
        allowNull: false,
        defaultValue: "assigned",
      },

      // === TIMESTAMPS ===
      created_at: {
        type: DataTypes.DATE,
        field: "created_at",
        defaultValue: Sequelize.NOW,
      },
      departed_to_load_location_at: { type: DataTypes.DATE },
      arrived_at_load_location_at: { type: DataTypes.DATE },
      departed_from_load_location_at: { type: DataTypes.DATE },
      arrived_at_unload_location_at: { type: DataTypes.DATE },
      departed_from_unload_location_at: { type: DataTypes.DATE },
      completed_at: { type: DataTypes.DATE },
      status_auto_updated_at: { 
        type: DataTypes.DATE, 
        allowNull: true,
        comment: "Timestamp when status was last auto-updated by GPS system"
      },
    },
    {
      tableName: "delivery_orders",
      timestamps: false,
      // Add scope to hide ongkosan from mobile API
      scopes: {
        mobile: {
          attributes: { exclude: ["ongkosan"] },
        },
        web: {
          // Include all fields for web
        },
      },
    }
  );

  // === STATIC HELPERS FOR AUTO-GENERATED DELIVERY ORDERS ===

  /**
   * Generate a simple auto DO number, e.g. AUTO-20250301-001
   * This is intended for internal / auto-created DOs so the UI
   * doesn't need to manage DO numbers directly.
   */
  DeliveryOrder.generateAutoDoNumber = async function () {
    const Op = Sequelize.Op;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${yyyy}${mm}${dd}`;

    const likePattern = `AUTO-${datePrefix}-%`;

    const count = await DeliveryOrder.count({
      where: {
        do_number: {
          [Op.like]: likePattern,
        },
      },
    });

    const sequence = String(count + 1).padStart(3, "0");
    return `AUTO-${datePrefix}-${sequence}`;
  };

  /**
   * Find an existing active DO for this context, or create a new minimal one.
   * This lets mobile/web flows work with "gas transactions" + customer
   * while the backend still keeps a delivery_orders record for all links
   * (CCTV, nota, OCR, deposit groups, etc).
   *
   * @param {object} options
   * @param {string|null} options.customer_name
   * @param {string|null} options.customer_location
   * @param {number|null} options.driver_id
   * @param {number|null} options.vehicle_id
   * @param {object|null} options.transaction - optional Sequelize transaction
   * @returns {Promise<{ deliveryOrder: any, created: boolean }>}
   */
  DeliveryOrder.findOrCreateAutoForContext = async function (options = {}) {
    const {
      customer_name = null,
      customer_location = null,
      driver_id = null,
      vehicle_id = null,
      transaction = null,
    } = options;

    const Op = Sequelize.Op;

    // Active statuses where a DO can still accept related records
    const activeStatuses = [
      "assigned",
      "at_spbu",
      "otw_to_unload_location",
      "at_unload_location",
    ];

    const where = {
      status: { [Op.in]: activeStatuses },
    };

    if (driver_id) where.driver_id = driver_id;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (customer_name) where.customer_name = customer_name;

    // Prefer the most recent active DO that matches this context
    let existing = await DeliveryOrder.findOne({
      where,
      order: [["created_at", "DESC"]],
      transaction,
    });

    if (existing) {
      return { deliveryOrder: existing, created: false };
    }

    // No suitable DO found -> create a minimal auto-generated DO
    const doNumber = await DeliveryOrder.generateAutoDoNumber();

    const payload = {
      do_number: doNumber,
      do_name: customer_name || "Auto Generated DO",
      customer_name,
      customer_location,
      driver_id,
      vehicle_id,
      unit: "kubik",
      unit_price: 0,
      total_amount: 0,
      trip_allowance: 0,
      gaji: 0,
      payment_status: "awaiting_confirmation",
      status: "assigned",
    };

    const created = await DeliveryOrder.create(payload, { transaction });
    return { deliveryOrder: created, created: true };
  };

  // ✅ NEW: Payment confirmation methods
  DeliveryOrder.prototype.canConfirmForBilling = function () {
    return (
      this.status === "completed" &&
      this.payment_confirmation_status !== "confirmed"
    );
  };

  DeliveryOrder.prototype.isConfirmedForBilling = function () {
    return this.payment_confirmation_status === "confirmed";
  };

  DeliveryOrder.prototype.canCreateInvoice = function () {
    return this.payment_confirmation_status === "confirmed";
  };

  DeliveryOrder.prototype.canRecordPayment = function () {
    return (
      this.payment_confirmation_status === "confirmed" &&
      this.invoices &&
      this.invoices.length > 0
    );
  };

  // ✅ ENHANCED: Better financial summary with confirmation status
  DeliveryOrder.prototype.getFinancialSummary = function () {
    const actualTotalAmount = this.calculateActualTotalAmount();
    const finalAmount = actualTotalAmount;

    return {
      trip_allowance: parseFloat(this.trip_allowance) || 0,
      gaji: parseFloat(this.gaji) || 0,
      total_for_driver: this.getTotalDriverPayment(),
      minimal_total_amount: parseFloat(this.total_amount) || 0,
      actual_total_amount: actualTotalAmount,
      final_amount: finalAmount, // ✅ NEW: Include final amount
      ongkosan: parseFloat(this.ongkosan) || 0,
      net_profit:
        this.total_amount - this.getTotalDriverPayment() ||
        actualTotalAmount - this.getTotalDriverPayment(),
      unit: this.unit,
      unit_display: this.getUnitDisplay(),

      // ✅ NEW: Payment status info
      payment_confirmation_status: this.payment_confirmation_status,
      can_confirm_billing: this.canConfirmForBilling(),
      can_create_invoice: this.canCreateInvoice(),
      can_record_payment: this.canRecordPayment(),
    };
  };

  // ✅ NEW: Get payment confirmation status display
  DeliveryOrder.prototype.getPaymentConfirmationStatusText = function () {
    const statusMap = {
      pending: "Menunggu Konfirmasi",
      awaiting_confirmation: "Menunggu Konfirmasi",
      confirmed: "Dikonfirmasi untuk Tagihan",
    };
    return (
      statusMap[this.payment_confirmation_status] ||
      this.payment_confirmation_status
    );
  };

  // === INSTANCE METHODS ===
  DeliveryOrder.prototype.getStatusText = function () {
    const statusMap = {
      assigned: "Ditugaskan",
      at_spbu: "Di SPBU",
      otw_to_unload_location: "Menuju Lokasi Bongkar",
      at_unload_location: "Di Lokasi Bongkar",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };
    return statusMap[this.status] || this.status;
  };

  DeliveryOrder.prototype.canConfirmLoad = function () {
    return this.status === "at_unload_location";
  };

  DeliveryOrder.prototype.hasActualLoadData = function () {
    return !!(this.actual_load_quantity && this.surat_jalan_photo_url);
  };

  DeliveryOrder.prototype.getLoadProgress = function () {
    if (this.actual_load_quantity && this.minimal_load_quantity) {
      const actual = parseFloat(this.actual_load_quantity);
      const minimal = parseFloat(this.minimal_load_quantity);
      return {
        percentage: (actual / minimal) * 100,
        excess: actual > minimal ? actual - minimal : 0,
        shortage: actual < minimal ? minimal - actual : 0,
        meets_minimum: actual >= minimal,
      };
    }
    return null;
  };

  DeliveryOrder.prototype.getTotalDriverPayment = function () {
    const allowance = parseFloat(this.trip_allowance) || 0;
    const salary = parseFloat(this.gaji) || 0;
    return allowance + salary;
  };

  DeliveryOrder.prototype.calculateActualTotalAmount = function () {
    const actualQuantity =
      parseFloat(this.actual_load_quantity) ||
      parseFloat(this.minimal_load_quantity) ||
      0;
    const unitPrice = parseFloat(this.unit_price) || 0;

    switch (this.unit) {
      case "kilogram":
        return actualQuantity * unitPrice;
      case "ton":
        return actualQuantity * unitPrice; // Convert ton to kg
      case "kubik":
        return actualQuantity * unitPrice; // Direct kubik pricing
      default:
        return actualQuantity * unitPrice;
    }
  };

  // 🎯 NEW: Get unit display text
  DeliveryOrder.prototype.getUnitDisplay = function () {
    const unitMap = {
      kilogram: "kg",
      ton: "ton",
      kubik: "m³",
    };
    return unitMap[this.unit] || this.unit;
  };


  return DeliveryOrder;
};
