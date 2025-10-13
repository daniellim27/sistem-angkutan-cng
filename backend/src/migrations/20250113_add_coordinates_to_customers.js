// 20250113_add_coordinates_to_customers.js
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('customers', 'latitude', {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90,
      },
      comment: 'GPS latitude coordinate for customer location',
    });

    await queryInterface.addColumn('customers', 'longitude', {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180,
      },
      comment: 'GPS longitude coordinate for customer location',
    });

    // Add index for coordinates for faster location-based queries
    await queryInterface.addIndex('customers', ['latitude', 'longitude'], {
      name: 'idx_customers_coordinates'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('customers', 'idx_customers_coordinates');
    await queryInterface.removeColumn('customers', 'longitude');
    await queryInterface.removeColumn('customers', 'latitude');
  },
};
