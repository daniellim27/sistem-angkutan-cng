const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add nota_photo_url column to delivery_orders table
    await queryInterface.addColumn('delivery_orders', 'nota_photo_url', {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL of the nota (receipt) photo uploaded for OCR processing'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove nota_photo_url column from delivery_orders table
    await queryInterface.removeColumn('delivery_orders', 'nota_photo_url');
  }
};
