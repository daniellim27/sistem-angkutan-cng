const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('driver_profiles');
    
    if (!tableDescription.sim_expiry_date) {
      await queryInterface.addColumn('driver_profiles', 'sim_expiry_date', {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'SIM (driver license) expiry date'
      });
      console.log('✓ sim_expiry_date column added to driver_profiles');
    } else {
      console.log('⏭️ sim_expiry_date column already exists, skipping');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Check if column exists before removing
    const tableDescription = await queryInterface.describeTable('driver_profiles');
    
    if (tableDescription.sim_expiry_date) {
      await queryInterface.removeColumn('driver_profiles', 'sim_expiry_date');
      console.log('✓ sim_expiry_date column removed from driver_profiles');
    } else {
      console.log('⏭️ sim_expiry_date column does not exist, skipping');
    }
  }
};
