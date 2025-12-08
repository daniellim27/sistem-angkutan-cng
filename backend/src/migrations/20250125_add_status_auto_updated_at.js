const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableDesc = await queryInterface.describeTable('delivery_orders');
      
      // Add status_auto_updated_at column if it doesn't exist
      if (!tableDesc.status_auto_updated_at) {
        await queryInterface.addColumn('delivery_orders', 'status_auto_updated_at', {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Timestamp when status was last auto-updated by GPS system"
        }, { transaction });
        console.log('✅ Added status_auto_updated_at column to delivery_orders');
      }
      
      await transaction.commit();
      console.log('✅ Successfully added status_auto_updated_at column to delivery_orders table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      const tableDesc = await queryInterface.describeTable('delivery_orders');
      
      // Remove status_auto_updated_at column if it exists
      if (tableDesc.status_auto_updated_at) {
        await queryInterface.removeColumn('delivery_orders', 'status_auto_updated_at', { transaction });
        console.log('✅ Removed status_auto_updated_at column from delivery_orders');
      }
      
      await transaction.commit();
      console.log('✅ Successfully removed status_auto_updated_at column from delivery_orders table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration rollback failed:', error);
      throw error;
    }
  }
};

