// 20250122_add_customer_location_to_delivery_orders.js
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('delivery_orders', 'customer_location', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Customer location/address from customer management'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('delivery_orders', 'customer_location');
  },
};
