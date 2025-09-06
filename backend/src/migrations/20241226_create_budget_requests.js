const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table exists first
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('budget_requests')
    );

    if (!tableExists) {
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
        defaultValue: 'pending'
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

    // Add indexes for better query performance (with error handling)
    try {
      await queryInterface.addIndex('budget_requests', ['delivery_order_id']);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('budget_requests', ['driver_id']);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('budget_requests', ['status']);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('budget_requests', ['created_at']);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    // Add foreign key constraints (with error handling)
    try {
      await queryInterface.addConstraint('budget_requests', {
        fields: ['delivery_order_id'],
        type: 'foreign key',
        name: 'fk_budget_requests_delivery_order_id',
        references: {
          table: 'delivery_orders',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addConstraint('budget_requests', {
        fields: ['driver_id'],
        type: 'foreign key',
        name: 'fk_budget_requests_driver_id',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addConstraint('budget_requests', {
        fields: ['approved_by'],
        type: 'foreign key',
        name: 'fk_budget_requests_approved_by',
        references: {
          table: 'users',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key constraints
    await queryInterface.removeConstraint('budget_requests', 'fk_budget_requests_approved_by');
    await queryInterface.removeConstraint('budget_requests', 'fk_budget_requests_driver_id');
    await queryInterface.removeConstraint('budget_requests', 'fk_budget_requests_delivery_order_id');
    
    // Remove indexes
    await queryInterface.removeIndex('budget_requests', ['created_at']);
    await queryInterface.removeIndex('budget_requests', ['status']);
    await queryInterface.removeIndex('budget_requests', ['driver_id']);
    await queryInterface.removeIndex('budget_requests', ['delivery_order_id']);
    
    // Drop table
    await queryInterface.dropTable('budget_requests');
  }
};
