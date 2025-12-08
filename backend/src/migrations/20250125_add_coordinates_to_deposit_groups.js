const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableDesc = await queryInterface.describeTable('deposit_groups');
      
      // Add latitude column if it doesn't exist
      if (!tableDesc.latitude) {
        await queryInterface.addColumn('deposit_groups', 'latitude', {
          type: DataTypes.DECIMAL(10, 7),
          allowNull: true,
          comment: "Latitude coordinate for SPBG location"
        }, { transaction });
        console.log('✅ Added latitude column to deposit_groups');
      }
      
      // Add longitude column if it doesn't exist
      if (!tableDesc.longitude) {
        await queryInterface.addColumn('deposit_groups', 'longitude', {
          type: DataTypes.DECIMAL(10, 7),
          allowNull: true,
          comment: "Longitude coordinate for SPBG location"
        }, { transaction });
        console.log('✅ Added longitude column to deposit_groups');
      }
      
      await transaction.commit();
      console.log('✅ Successfully added coordinates columns to deposit_groups table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableDesc = await queryInterface.describeTable('deposit_groups');
      
      // Remove latitude column if it exists
      if (tableDesc.latitude) {
        await queryInterface.removeColumn('deposit_groups', 'latitude', { transaction });
        console.log('✅ Removed latitude column from deposit_groups');
      }
      
      // Remove longitude column if it exists
      if (tableDesc.longitude) {
        await queryInterface.removeColumn('deposit_groups', 'longitude', { transaction });
        console.log('✅ Removed longitude column from deposit_groups');
      }
      
      await transaction.commit();
      console.log('✅ Successfully removed coordinates columns from deposit_groups table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration rollback failed:', error);
      throw error;
    }
  }
};

