'use strict';

const { Sequelize, QueryInterface } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 Creating CCTV monitoring tables...');

    // 1. Create cctv_sessions table WITH meter_type
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
        onDelete: 'RESTRICT'
      },
      customer_location_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      customer_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      device_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bardi_session_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'dead', 'stopped'),
        allowNull: false,
        defaultValue: 'active'
      },
      total_screenshots_captured: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      last_screenshot_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      session_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_nota_kecil_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      panel_row: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      panel_column: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      // ✅ MISSING FIELD - THIS WAS THE PROBLEM!
      meter_type: {
        type: Sequelize.ENUM('stan', 'pressure_inlet', 'pressure_outlet', 'temperature'),
        allowNull: false  // ✅ Required now
      },
      screenshot_interval_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      health_check_interval_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 15
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      // ✅ NOTA BATCH FIELDS (from your model)
      nota_batch_start_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      nota_batch_start_sequence: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      nota_batch_capture_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      nota_batch_end_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      nota_batch_end_sequence: {
        type: Sequelize.INTEGER,
        allowNull: true
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

    console.log('✅ cctv_sessions table created');

    // 2. ✅ NOW ADD THE UNIQUE CONSTRAINT
    await queryInterface.addConstraint('cctv_sessions', {
      fields: ['delivery_order_id', 'customer_location_index', 'customer_name', 'meter_type'],
      type: 'unique',
      name: 'unique_session_per_sensor_per_customer_per_order'
    });

    console.log('✅ Unique constraint added: 1 session per sensor per customer per order');

    // 3. Create cctv_screenshots table (unchanged)
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
        onDelete: 'CASCADE'
      },
      screenshot_url: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      cloudinary_public_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      captured_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      sequence_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      ocr_status: {
        type: Sequelize.ENUM('pending', 'processing', 'success', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      ocr_result: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      ocr_raw_response: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      ocr_confidence_score: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      ocr_processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ocr_error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    console.log('✅ cctv_screenshots table created');

    // 4. Safe index creation
    const createIndexSafely = async (tableName, fields, indexName) => {
      try {
        await queryInterface.addIndex(tableName, fields, { name: indexName });
        console.log(`✅ Created index: ${indexName}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Index ${indexName} already exists - SKIPPED`);
        } else {
          throw error;
        }
      }
    };

    // Sessions indexes
    await createIndexSafely('cctv_sessions', ['delivery_order_id', 'customer_location_index', 'meter_type'], 'idx_cctv_sessions_delivery_customer_sensor');
    await createIndexSafely('cctv_sessions', ['delivery_order_id', 'customer_location_index'], 'idx_cctv_sessions_delivery_customer');
    await createIndexSafely('cctv_sessions', ['status'], 'idx_cctv_sessions_status');
    await createIndexSafely('cctv_sessions', ['start_time'], 'idx_cctv_sessions_start_time');
    await createIndexSafely('cctv_sessions', ['created_by'], 'idx_cctv_sessions_created_by');
    await createIndexSafely('cctv_sessions', ['meter_type'], 'idx_cctv_sessions_sensor');

    // Screenshots indexes
    await createIndexSafely('cctv_screenshots', ['session_id', 'sequence_number'], 'idx_cctv_screenshots_session_sequence');
    await createIndexSafely('cctv_screenshots', ['captured_at'], 'idx_cctv_screenshots_captured_at');
    await createIndexSafely('cctv_screenshots', ['ocr_status'], 'idx_cctv_screenshots_ocr_status');
    await createIndexSafely('cctv_screenshots', ['session_id'], 'idx_cctv_screenshots_session_id');

    console.log('🎉 CCTV monitoring migration COMPLETED SUCCESSFULLY!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Rolling back CCTV monitoring...');

    // Remove constraint FIRST
    try {
      await queryInterface.removeConstraint('cctv_sessions', 'unique_session_per_sensor_per_customer_per_order');
      console.log('✅ Unique constraint removed');
    } catch (e) {
      console.log('⚠️  Constraint didn\'t exist');
    }

    // Drop tables
    await queryInterface.dropTable('cctv_screenshots');
    await queryInterface.dropTable('cctv_sessions');
    
    console.log('🎉 Rollback COMPLETED!');
  }
};