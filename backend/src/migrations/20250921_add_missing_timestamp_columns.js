const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add missing timestamp columns to delivery_orders table
    await queryInterface.addColumn('delivery_orders', 'departed_to_load_location_at', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when driver departed to load location'
    });

    await queryInterface.addColumn('delivery_orders', 'arrived_at_load_location_at', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when driver arrived at load location'
    });

    await queryInterface.addColumn('delivery_orders', 'departed_from_load_location_at', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when driver departed from load location'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added timestamp columns
    await queryInterface.removeColumn('delivery_orders', 'departed_to_load_location_at');
    await queryInterface.removeColumn('delivery_orders', 'arrived_at_load_location_at');
    await queryInterface.removeColumn('delivery_orders', 'departed_from_load_location_at');
  }
};
