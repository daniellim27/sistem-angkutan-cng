const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if location_documentation column already exists
    const tableInfo = await queryInterface.describeTable('delivery_orders');
    
    if (!tableInfo.location_documentation) {
      // Add location_documentation field to delivery_orders table only if it doesn't exist
      await queryInterface.addColumn('delivery_orders', 'location_documentation', {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Per-location documentation: [{location_index: 0, location_name: "Bandung", photos: ["url1"], uploaded_at: "timestamp", completed: true}]',
      });
      console.log('✅ Added location_documentation column to delivery_orders table');
    } else {
      console.log('ℹ️ Column location_documentation already exists in delivery_orders table, skipping...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Check if location_documentation column exists before trying to remove it
    const tableInfo = await queryInterface.describeTable('delivery_orders');
    
    if (tableInfo.location_documentation) {
      // Remove location_documentation field from delivery_orders table
      await queryInterface.removeColumn('delivery_orders', 'location_documentation');
      console.log('✅ Removed location_documentation column from delivery_orders table');
    } else {
      console.log('ℹ️ Column location_documentation does not exist in delivery_orders table, skipping...');
    }
  }
};
