/**
 * Migration: Add departed_from_spbu_at column to delivery_orders table
 * This migration adds the missing timestamp column that's referenced in the model and controllers
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Adding departed_from_spbu_at column to delivery_orders table...');
      
      // Check if column already exists
      const tableInfo = await queryInterface.describeTable('delivery_orders');
      
      if (!tableInfo.departed_from_spbu_at) {
        // Add the departed_from_spbu_at column
        await queryInterface.addColumn('delivery_orders', 'departed_from_spbu_at', {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Timestamp when driver departed from SPBU/gas station'
        }, { transaction });
        
        console.log('✅ Successfully added departed_from_spbu_at column');
        
        // Migrate existing data: set departed_from_spbu_at for completed orders
        // Use created_at as fallback for orders that don't have proper timestamp data
        await queryInterface.sequelize.query(`
          UPDATE delivery_orders 
          SET departed_from_spbu_at = COALESCE(
            departed_to_load_location_at,
            arrived_at_load_location_at, 
            created_at
          )
          WHERE departed_from_spbu_at IS NULL 
          AND status IN ('otw_to_unload_location', 'at_unload_location', 'completed');
        `, { transaction });
        
        console.log('✅ Migrated existing timestamp data');
      } else {
        console.log('ℹ️ Column departed_from_spbu_at already exists, skipping...');
      }
      
      await transaction.commit();
      console.log('✅ Migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Removing departed_from_spbu_at column from delivery_orders table...');
      
      // Check if column exists before trying to remove it
      const tableInfo = await queryInterface.describeTable('delivery_orders');
      
      if (tableInfo.departed_from_spbu_at) {
        await queryInterface.removeColumn('delivery_orders', 'departed_from_spbu_at', { transaction });
        console.log('✅ Successfully removed departed_from_spbu_at column');
      } else {
        console.log('ℹ️ Column departed_from_spbu_at does not exist, nothing to remove');
      }
      
      await transaction.commit();
      console.log('✅ Rollback completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
