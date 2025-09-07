const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column exists before adding it
    const tableDescription = await queryInterface.describeTable('delivery_orders');
    
    if (!tableDescription.additional_unload_locations) {
      await queryInterface.addColumn('delivery_orders', 'additional_unload_locations', {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'JSON array of additional unload locations: [{"location": "Address", "latitude": "lat", "longitude": "lng"}]'
      });
      console.log('✅ Added additional_unload_locations column');
    } else {
      console.log('ℹ️ Column additional_unload_locations already exists, skipping...');
    }

    // Check if index exists before adding it
    try {
      await queryInterface.addIndex('delivery_orders', 
        {
          fields: ['additional_unload_locations'],
          using: 'gin',
          name: 'delivery_orders_additional_unload_locations_gin_idx'
        }
      );
      console.log('✅ Added GIN index for additional_unload_locations');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Index for additional_unload_locations already exists, skipping...');
      } else {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove the index first (if it exists)
    try {
      await queryInterface.removeIndex('delivery_orders', 'delivery_orders_additional_unload_locations_gin_idx');
      console.log('✅ Removed GIN index for additional_unload_locations');
    } catch (error) {
      if (!error.message.includes('does not exist')) {
        throw error;
      }
      console.log('ℹ️ Index does not exist, skipping index removal...');
    }
    
    // Remove the column (if it exists)
    const tableDescription = await queryInterface.describeTable('delivery_orders');
    if (tableDescription.additional_unload_locations) {
      await queryInterface.removeColumn('delivery_orders', 'additional_unload_locations');
      console.log('✅ Removed additional_unload_locations column');
    } else {
      console.log('ℹ️ Column additional_unload_locations does not exist, skipping...');
    }
  }
};

