// 20250122_create_customers_table.js
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('customers', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customer_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Customer name',
      },
      location: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Customer location/address',
      },
      nota_besar: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Nota Besar amount',
      },
      nota_kecil: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Nota Kecil amount',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add index for customer_name for faster searches
    await queryInterface.addIndex('customers', ['customer_name'], {
      name: 'idx_customers_customer_name'
    });

    // Add index for location for faster location-based queries
    await queryInterface.addIndex('customers', ['location'], {
      name: 'idx_customers_location'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('customers');
  },
};
