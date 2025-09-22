const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get current table structure to check existing columns
    const tableInfo = await queryInterface.describeTable('delivery_orders');
    
    const columnsToAdd = [
      {
        name: 'departed_to_load_location_at',
        config: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Timestamp when driver departed to load location'
        }
      },
      {
        name: 'arrived_at_load_location_at',
        config: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Timestamp when driver arrived at load location'
        }
      },
      {
        name: 'departed_from_load_location_at',
        config: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Timestamp when driver departed from load location'
        }
      }
    ];

    // Add each column only if it doesn't already exist
    for (const column of columnsToAdd) {
      if (!tableInfo[column.name]) {
        await queryInterface.addColumn('delivery_orders', column.name, column.config);
        console.log(`✅ Added ${column.name} column to delivery_orders table`);
      } else {
        console.log(`ℹ️ Column ${column.name} already exists in delivery_orders table, skipping...`);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Get current table structure to check existing columns
    const tableInfo = await queryInterface.describeTable('delivery_orders');
    
    const columnsToRemove = [
      'departed_to_load_location_at',
      'arrived_at_load_location_at', 
      'departed_from_load_location_at'
    ];

    // Remove each column only if it exists
    for (const columnName of columnsToRemove) {
      if (tableInfo[columnName]) {
        await queryInterface.removeColumn('delivery_orders', columnName);
        console.log(`✅ Removed ${columnName} column from delivery_orders table`);
      } else {
        console.log(`ℹ️ Column ${columnName} does not exist in delivery_orders table, skipping...`);
      }
    }
  }
};
