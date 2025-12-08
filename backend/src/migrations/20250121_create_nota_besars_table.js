const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('nota_besars', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      delivery_order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'delivery_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to delivery order'
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Admin user who created this nota besar'
      },
      total_volume: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        comment: 'Total volume in m³ calculated from selected nota kecils'
      },
      total_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Total price calculated from total volume and gas price'
      },
      gas_price_per_m3: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Gas price per m³ used for calculation'
      },
      status: {
        type: DataTypes.ENUM('draft', 'confirmed', 'billed', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'Status of the nota besar'
      },
      // Add to nota_besars migration
      screenshots: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of 6 screenshot URLs for this nota besar (1 hour)'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional notes for this nota besar'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('nota_besars', ['delivery_order_id']);
    await queryInterface.addIndex('nota_besars', ['created_by']);
    await queryInterface.addIndex('nota_besars', ['status']);
    await queryInterface.addIndex('nota_besars', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('nota_besars');
  }
};
