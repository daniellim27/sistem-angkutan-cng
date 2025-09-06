// Migration: Add additional_unload_locations column to delivery_orders table
// Date: 2024-12-27
// Description: Add support for multiple unload locations in delivery orders

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('delivery_orders');
    
    if (!tableDescription.additional_unload_locations) {
      await queryInterface.addColumn('delivery_orders', 'additional_unload_locations', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'JSON array of additional unload locations: [{"location": "Address", "latitude": "lat", "longitude": "lng"}]'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('delivery_orders', 'additional_unload_locations');
  }
};
