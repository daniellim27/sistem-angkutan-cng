const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('budget_requests', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      delivery_order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'delivery_orders',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      requested_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'approved' // ✅ DEFAULT TO APPROVED FOR INSTANT APPROVAL
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      evidence_url: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance (with IF NOT EXISTS check)
    try {
      await queryInterface.addIndex('budget_requests', ['delivery_order_id'], {
        name: 'budget_requests_delivery_order_id'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('Index budget_requests_delivery_order_id already exists, skipping...');
    }

    try {
      await queryInterface.addIndex('budget_requests', ['driver_id'], {
        name: 'budget_requests_driver_id'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('Index budget_requests_driver_id already exists, skipping...');
    }

    try {
      await queryInterface.addIndex('budget_requests', ['status'], {
        name: 'budget_requests_status'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('Index budget_requests_status already exists, skipping...');
    }

    try {
      await queryInterface.addIndex('budget_requests', ['created_at'], {
        name: 'budget_requests_created_at'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('Index budget_requests_created_at already exists, skipping...');
    }

    // Add composite index for common queries
    try {
      await queryInterface.addIndex('budget_requests', ['driver_id', 'delivery_order_id'], {
        name: 'budget_requests_driver_delivery_composite'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('Index budget_requests_driver_delivery_composite already exists, skipping...');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('budget_requests');
  }
};
