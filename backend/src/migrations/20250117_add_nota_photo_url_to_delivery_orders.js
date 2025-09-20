const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the column already exists
    const tableDescription = await queryInterface.describeTable('delivery_orders');
    
    if (!tableDescription.nota_photo_url) {
      // Add nota_photo_url column to delivery_orders table only if it doesn't exist
      await queryInterface.addColumn('delivery_orders', 'nota_photo_url', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL of the nota (receipt) photo uploaded for OCR processing'
      });
    } else {
      console.log('Column nota_photo_url already exists in delivery_orders table, skipping...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Check if the column exists before trying to remove it
    const tableDescription = await queryInterface.describeTable('delivery_orders');
    
    if (tableDescription.nota_photo_url) {
      // Remove nota_photo_url column from delivery_orders table
      await queryInterface.removeColumn('delivery_orders', 'nota_photo_url');
    }
  }
};
