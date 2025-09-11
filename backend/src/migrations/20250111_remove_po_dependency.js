// Migration to remove Purchase Order dependency from Delivery Orders
// This migration makes DOs standalone entities

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Removing Purchase Order dependency from Delivery Orders...');
      
      // 1. Remove foreign key constraint (if exists)
      try {
        await queryInterface.removeConstraint('delivery_orders', 'delivery_orders_purchase_order_id_fkey', { transaction });
        console.log('✅ Removed PO foreign key constraint');
      } catch (err) {
        console.log('⚠️ PO foreign key constraint may not exist, continuing...');
      }
      
      // 2. Remove index on purchase_order_id (if exists)
      try {
        await queryInterface.removeIndex('delivery_orders', 'delivery_orders_purchase_order_id', { transaction });
        console.log('✅ Removed PO index');
      } catch (err) {
        console.log('⚠️ PO index may not exist, continuing...');
      }
      
      // 3. Make item_name NOT NULL (since it's no longer inherited from PO)
      await queryInterface.changeColumn('delivery_orders', 'item_name', {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Item name now directly specified for each DO'
      }, { transaction });
      console.log('✅ Updated item_name to be NOT NULL');
      
      // 4. Update comment for unit field
      await queryInterface.changeColumn('delivery_orders', 'unit', {
        type: DataTypes.ENUM('kilogram', 'ton', 'kubik'),
        allowNull: false,
        defaultValue: 'ton',
        comment: 'Unit satuan barang'
      }, { transaction });
      console.log('✅ Updated unit field comment');
      
      // 5. Add a comment to purchase_order_id column indicating it's deprecated
      await queryInterface.changeColumn('delivery_orders', 'purchase_order_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'DEPRECATED: Legacy PO reference, will be removed in future migration'
      }, { transaction });
      console.log('✅ Marked purchase_order_id as deprecated');
      
      await transaction.commit();
      console.log('🎉 Successfully removed PO dependency from DOs');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Restoring Purchase Order dependency...');
      
      // 1. Restore foreign key constraint
      await queryInterface.addConstraint('delivery_orders', {
        fields: ['purchase_order_id'],
        type: 'foreign key',
        name: 'delivery_orders_purchase_order_id_fkey',
        references: {
          table: 'purchase_orders',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        transaction
      });
      
      // 2. Restore index
      await queryInterface.addIndex('delivery_orders', ['purchase_order_id'], {
        name: 'delivery_orders_purchase_order_id',
        transaction
      });
      
      // 3. Make item_name nullable again
      await queryInterface.changeColumn('delivery_orders', 'item_name', {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Item name diambil dari pilihan yang ada di PO'
      }, { transaction });
      
      // 4. Restore unit comment
      await queryInterface.changeColumn('delivery_orders', 'unit', {
        type: DataTypes.ENUM('kilogram', 'ton', 'kubik'),
        allowNull: false,
        defaultValue: 'ton',
        comment: 'Unit satuan barang (inherited from PO)'
      }, { transaction });
      
      // 5. Remove deprecated comment from purchase_order_id
      await queryInterface.changeColumn('delivery_orders', 'purchase_order_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: null
      }, { transaction });
      
      await transaction.commit();
      console.log('🎉 Successfully restored PO dependency');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
