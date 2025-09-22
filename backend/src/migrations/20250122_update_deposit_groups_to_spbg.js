const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if spbg_location column already exists
      const tableDesc = await queryInterface.describeTable('deposit_groups');
      
      // 1. Only rename if spbg_location doesn't exist and group_name does
      if (tableDesc.group_name && !tableDesc.spbg_location) {
        await queryInterface.renameColumn('deposit_groups', 'group_name', 'spbg_location', { transaction });
        console.log('✅ Renamed group_name to spbg_location');
      } else if (tableDesc.group_name && tableDesc.spbg_location) {
        // Both columns exist, copy data and drop group_name
        await queryInterface.sequelize.query(
          'UPDATE deposit_groups SET spbg_location = group_name WHERE spbg_location IS NULL',
          { transaction }
        );
        await queryInterface.removeColumn('deposit_groups', 'group_name', { transaction });
        console.log('✅ Copied group_name data to spbg_location and removed group_name');
      }
      
      // 2. Remove target_quantity column if it exists
      if (tableDesc.target_quantity) {
        await queryInterface.removeColumn('deposit_groups', 'target_quantity', { transaction });
        console.log('✅ Removed target_quantity column');
      }
      
      // 3. Add completed_quantity column if it doesn't exist
      if (!tableDesc.completed_quantity) {
        await queryInterface.addColumn('deposit_groups', 'completed_quantity', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          comment: "Completed quantity (auto-updated on DO completion)"
        }, { transaction });
        console.log('✅ Added completed_quantity column');
      }
      
      await transaction.commit();
      console.log('✅ Successfully updated deposit_groups table for SPBG management');
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
      
      // Reverse the changes
      // 1. Rename spbg_location back to group_name if it exists
      if (tableDesc.spbg_location && !tableDesc.group_name) {
        await queryInterface.renameColumn('deposit_groups', 'spbg_location', 'group_name', { transaction });
      }
      
      // 2. Remove completed_quantity column if it exists
      if (tableDesc.completed_quantity) {
        await queryInterface.removeColumn('deposit_groups', 'completed_quantity', { transaction });
      }
      
      // 3. Add back target_quantity column if it doesn't exist
      if (!tableDesc.target_quantity) {
        await queryInterface.addColumn('deposit_groups', 'target_quantity', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          comment: "Target quantity for this deposit group"
        }, { transaction });
      }
      
      await transaction.commit();
      console.log('✅ Successfully reverted deposit_groups table changes');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration rollback failed:', error);
      throw error;
    }
  }
};
