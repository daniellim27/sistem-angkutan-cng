const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add location_documentation field to delivery_orders table
    await queryInterface.addColumn('delivery_orders', 'location_documentation', {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Per-location documentation: [{location_index: 0, location_name: "Bandung", photos: ["url1"], uploaded_at: "timestamp", completed: true}]',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove location_documentation field from delivery_orders table
    await queryInterface.removeColumn('delivery_orders', 'location_documentation');
  }
};
