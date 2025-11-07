'use strict';

const { Sequelize, QueryInterface } = require('sequelize');

/**
 * Migration: Create CCTV Monitoring Tables
 * Creates tables for cctv_sessions and cctv_screenshots
 */
module.exports = {
  /**
   * Run the migration
   * @param {QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  up: async (queryInterface, Sequelize) => {
    console.log('Creating CCTV monitoring tables...');

    // Create cctv_sessions table
    await queryInterface.createTable('cctv_sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      delivery_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'delivery_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Foreign key to delivery_orders table'
      },
      customer_location_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Index of customer location in delivery order locations array'
      },
      customer_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Name of the customer location being monitored'
      },
      device_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'BARDI device ID used for monitoring'
      },
      bardi_session_token: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Encrypted BARDI session token for API access'
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When the monitoring session started'
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the monitoring session ended'
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'dead', 'stopped'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Current status of the monitoring session'
      },
      total_screenshots_captured: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of screenshots captured in this session'
      },
      last_screenshot_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of the last captured screenshot'
      },
      session_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about the session'
      },
      created_nota_kecil_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'nota_kecils',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Nota Kecil created from this monitoring session'
      },
      panel_row: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Panel row location in BARDI interface'
      },
      panel_column: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Panel column location in BARDI interface'
      },
      screenshot_interval_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
        comment: 'Interval between automatic screenshots in minutes'
      },
      health_check_interval_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 15,
        comment: 'Interval for health status checks in minutes'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who created this monitoring session'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    console.log('✓ cctv_sessions table created');

    // Create cctv_screenshots table
    await queryInterface.createTable('cctv_screenshots', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cctv_sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to cctv_sessions table'
      },
      screenshot_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'URL to screenshot image (Cloudinary or local storage)'
      },
      cloudinary_public_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Cloudinary public ID for image management'
      },
      captured_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp when the screenshot was captured'
      },
      sequence_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Sequential number within the session (1, 2, 3, ...)'
      },
      ocr_status: {
        type: Sequelize.ENUM('pending', 'processing', 'success', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Status of OCR processing'
      },
      ocr_result: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'OCR extracted data: meter_reading, pressure, temperature, flow_rate, etc.'
      },
      ocr_raw_response: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Full raw OCR API response for debugging'
      },
      ocr_confidence_score: {
        type: Sequelize.FLOAT,
        allowNull: true,
        comment: 'OCR confidence score (0-1), higher is better'
      },
      ocr_processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when OCR processing completed'
      },
      ocr_error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if OCR processing failed'
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of OCR retry attempts'
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Soft delete flag'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about this screenshot'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    console.log('✓ cctv_screenshots table created');

    // Create indexes for cctv_sessions
    await queryInterface.addIndex('cctv_sessions', ['delivery_order_id'], {
      name: 'idx_cctv_sessions_delivery_order'
    });
    await queryInterface.addIndex('cctv_sessions', ['status'], {
      name: 'idx_cctv_sessions_status'
    });
    await queryInterface.addIndex('cctv_sessions', ['start_time'], {
      name: 'idx_cctv_sessions_start_time'
    });
    await queryInterface.addIndex('cctv_sessions', ['created_by'], {
      name: 'idx_cctv_sessions_created_by'
    });

    console.log('✓ cctv_sessions indexes created');

    // Create indexes for cctv_screenshots
    await queryInterface.addIndex('cctv_screenshots', ['session_id', 'sequence_number'], {
      name: 'idx_cctv_screenshots_session_sequence'
    });
    await queryInterface.addIndex('cctv_screenshots', ['captured_at'], {
      name: 'idx_cctv_screenshots_captured_at'
    });
    await queryInterface.addIndex('cctv_screenshots', ['ocr_status'], {
      name: 'idx_cctv_screenshots_ocr_status'
    });
    await queryInterface.addIndex('cctv_screenshots', ['session_id'], {
      name: 'idx_cctv_screenshots_session_id'
    });

    console.log('✓ cctv_screenshots indexes created');
    console.log('✅ CCTV monitoring migration completed successfully!');
  },

  /**
   * Revert the migration
   * @param {QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  down: async (queryInterface, Sequelize) => {
    console.log('Dropping CCTV monitoring tables...');

    // Drop tables in reverse order (due to foreign key constraints)
    await queryInterface.dropTable('cctv_screenshots');
    console.log('✓ cctv_screenshots table dropped');

    await queryInterface.dropTable('cctv_sessions');
    console.log('✓ cctv_sessions table dropped');

    console.log('✅ CCTV monitoring migration reverted successfully!');
  }
};

