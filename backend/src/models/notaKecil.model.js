const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NotaKecil = sequelize.define("NotaKecil", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    delivery_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Now nullable - DOs are auto-generated
      references: {
        model: 'delivery_orders',
        key: 'id'
      },
      comment: 'Reference to delivery order (optional - DOs are auto-generated)'
    },
    customer_location_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Index of customer location (0 for primary, 1+ for additional)'
    },
    customer_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Customer name for this nota kecil'
    },
    customer_address: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Customer address for this nota kecil'
    },
    
    // ✅ NEW: REPRESENTATIVE SCREENSHOT FIELDS (added here for logical grouping with session data)
    representative_screenshot_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL of the representative screenshot for this nota kecil'
    },
    representative_screenshot_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cctv_screenshots',
        key: 'id'
      },
      comment: 'Reference to the representative CCTVScreenshot'
    },
    
    // ✅ NEW SCHEMA: CONTINUOUS STAN MONITORING
    stan_awal: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: true,
      comment: 'Initial stan reading (first reading of session/batch)'
    },
    current_stan: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: true,
      comment: 'Current/latest stan reading'
    },
    stan_akhir: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: true,
      comment: 'Calculated: current_stan - stan_awal'
    },
    
    // ✅ NEW SCHEMA: SEPARATE PRESSURE SENSORS
    pressure_inlet: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Pressure inlet (bar) - average from batch'
    },
    pressure_outlet: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Pressure outlet (bar) - average from batch'
    },
    temperature: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Temperature (°C) - average from batch'
    },
    
    // Calculated Values
    volume_delta: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Volume consumed in this batch: stan_akhir * k'
    },
    k: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      comment: 'Super Compressibility Factor (calculated)'
    },
    
    // ✅ NEW: BATCH TRACKING
    cctv_session_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cctv_sessions',
        key: 'id'
      },
      comment: 'CCTV session this nota was created from'
    },
    batch_start_sequence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Starting sequence number of batch'
    },
    batch_end_sequence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Ending sequence number of batch'
    },
    screenshots_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of screenshots used for this nota'
    },
    ocr_success_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of successful OCR readings'
    },
    
    // OCR Metadata
    ocr_confidence_avg: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      comment: 'Average OCR confidence score'
    },
    ocr_processing_status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'insufficient_data', 'invalid_data'),
      allowNull: false,
      defaultValue: 'pending'
    },
    ocr_processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    
    // Driver Confirmation
    driver_confirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    driver_confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    driver_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    // Manual Override
    manual_values_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "nota_kecils",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["delivery_order_id"]
      },
      {
        fields: ["customer_location_index"]
      },
      {
        fields: ["driver_confirmed"]
      },
      {
        fields: ["created_at"]
      },
      // ✅ NEW: Index for screenshot lookup
      {
        fields: ["representative_screenshot_id"]
      },
      // ✅ NEW: Composite index for batch tracking
      {
        fields: ["cctv_session_id", "batch_start_sequence", "batch_end_sequence"]
      }
    ]
  });

  return NotaKecil;
};