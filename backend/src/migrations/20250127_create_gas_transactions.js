'use strict';

/**
 * Migration: Create gas_transactions table
 * 
 * This table records each realized SPBG gas purchase (one row per approved nota),
 * while keeping the existing delivery_orders + deposit_groups plumbing intact.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, DECIMAL, STRING, JSONB, DATE, ENUM } = Sequelize;

    await queryInterface.createTable('gas_transactions', {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      // Links to existing structures
      deposit_group_id: {
        type: INTEGER,
        allowNull: true,
        references: {
          model: 'deposit_groups',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'SPBG / deposit group this gas filling belongs to'
      },
      delivery_order_id: {
        type: INTEGER,
        allowNull: true,
        references: {
          model: 'delivery_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Internal DO used for legacy links (CCTV, nota, etc.)'
      },
      driver_id: {
        type: INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Driver who performed the filling (optional)'
      },
      vehicle_id: {
        type: INTEGER,
        allowNull: true,
        references: {
          model: 'vehicles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Vehicle used for this gas filling (optional)'
      },

      // Core gas transaction data
      volume_m3: {
        type: DECIMAL(10, 2),
        allowNull: false,
        comment: 'Gas volume in cubic meters (from nota / meter calculation)'
      },
      calculation_method: {
        type: STRING(20),
        allowNull: false,
        comment: 'Pricing method used: jisdor | fixed'
      },
      rate_per_m3: {
        type: DECIMAL(10, 2),
        allowNull: false,
        comment: 'Applied rate per m³ in IDR (either JISDOR-based or fixed)'
      },
      jisdor_rate: {
        type: DECIMAL(10, 2),
        allowNull: true,
        comment: 'JISDOR rate used, if calculation_method = jisdor'
      },
      total_cost: {
        type: DECIMAL(15, 2),
        allowNull: false,
        comment: 'Total cost in IDR for this gas transaction'
      },

      status: {
        type: ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'approved',
        comment: 'Approval status of this gas transaction'
      },

      // Snapshot of nota OCR and related data at the time of approval
      nota_ocr_data: {
        type: JSONB,
        allowNull: true,
        comment: 'JSON snapshot of OCR result / nota details used for this transaction'
      },

      created_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Helpful indexes
    await queryInterface.addIndex('gas_transactions', ['deposit_group_id'], {
      name: 'idx_gas_transactions_deposit_group_id'
    });
    await queryInterface.addIndex('gas_transactions', ['delivery_order_id'], {
      name: 'idx_gas_transactions_delivery_order_id'
    });
    await queryInterface.addIndex('gas_transactions', ['created_at'], {
      name: 'idx_gas_transactions_created_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop table and enum safely
    await queryInterface.dropTable('gas_transactions');

    // ENUM cleanup (only if it exists)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_gas_transactions_status') THEN
            DROP TYPE enum_gas_transactions_status;
          END IF;
        END$$;
      `);
    }
  }
};


