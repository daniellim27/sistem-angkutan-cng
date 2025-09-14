const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('vehicles', 'kir_expiry_date', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'KIR (Kendaraan Inspeksi Rencana) expiry date'
    });

    // Add index for better query performance
    await queryInterface.addIndex('vehicles', ['kir_expiry_date'], {
      name: 'vehicles_kir_expiry_date_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('vehicles', 'vehicles_kir_expiry_date_idx');
    await queryInterface.removeColumn('vehicles', 'kir_expiry_date');
  }
};
