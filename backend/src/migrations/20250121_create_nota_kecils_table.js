'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create nota_kecils table
    await queryInterface.createTable('nota_kecils', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      delivery_order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'delivery_orders',
          key: 'id'
        },
        comment: 'Reference to delivery order'
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
      
      // Raw OCR Extracted Values (from photos)
      stan_awal: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Initial meter reading from OCR'
      },
      stan_akhir: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Final meter reading from OCR'
      },
      tekanan_operasi: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Pressure in Bar from OCR'
      },
      temperatur_operasi: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Temperature in Celsius from OCR'
      },
      
      // Calculated Values (derived from raw values)
      Vt: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Volume from Meter: stan_akhir - stan_awal'
      },
      k: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
        comment: 'Super Compressibility Factor'
      },
      V: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Final Volume Gas (m³): Vt * k'
      },
      
      // Photos (JSONB array of URLs)
      pressure_bar_photos: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of pressure bar photo URLs'
      },
      temperature_photos: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of temperature photo URLs'
      },
      stan_awal_photos: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of stan awal photo URLs'
      },
      stan_akhir_photos: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of stan akhir photo URLs'
      },
      
      // OCR Metadata
      ocr_confidence_scores: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'OCR confidence scores for each field'
      },
      ocr_processing_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'pending',
        comment: 'OCR processing status: pending, processing, completed, failed'
      },
      ocr_processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when OCR processing completed'
      },
      
      // Driver Confirmation & Validation
      driver_confirmed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether driver has confirmed the values'
      },
      driver_confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when driver confirmed the values'
      },
      driver_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional notes from driver'
      },
      
      // Manual Override (if driver corrects OCR values)
      manual_stan_awal: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Manually corrected stan awal value'
      },
      manual_stan_akhir: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Manually corrected stan akhir value'
      },
      manual_tekanan: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Manually corrected pressure value'
      },
      manual_temperatur: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Manually corrected temperature value'
      },
      manual_calculation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether manual values were used for calculation'
      },
      
      // Audit Trail
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
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('nota_kecils', ['delivery_order_id']);
    await queryInterface.addIndex('nota_kecils', ['customer_location_index']);
    await queryInterface.addIndex('nota_kecils', ['driver_confirmed']);
    await queryInterface.addIndex('nota_kecils', ['created_at']);
    await queryInterface.addIndex('nota_kecils', ['delivery_order_id', 'customer_location_index']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('nota_kecils');
  }
};
