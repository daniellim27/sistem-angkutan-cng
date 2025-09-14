const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('driver_profiles', 'sim_expiry_date', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'SIM (driver license) expiry date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('driver_profiles', 'sim_expiry_date');
  }
};
