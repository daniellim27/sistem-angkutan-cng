const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableDesc = await queryInterface.describeTable('deposit_groups');
      
      // Add spbg_name column if it doesn't exist
      if (!tableDesc.spbg_name) {
        await queryInterface.addColumn('deposit_groups', 'spbg_name', {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "Display name for SPBG (optional)"
        }, { transaction });
        console.log('✅ Added spbg_name column to deposit_groups');
      }
      
      await transaction.commit();
      console.log('✅ Successfully added spbg_name column to deposit_groups table');
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
      
      // Remove spbg_name column if it exists
      if (tableDesc.spbg_name) {
        await queryInterface.removeColumn('deposit_groups', 'spbg_name', { transaction });
        console.log('✅ Removed spbg_name column from deposit_groups');
      }
      
      await transaction.commit();
      console.log('✅ Successfully removed spbg_name column from deposit_groups table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration rollback failed:', error);
      throw error;
    }
  }
};

