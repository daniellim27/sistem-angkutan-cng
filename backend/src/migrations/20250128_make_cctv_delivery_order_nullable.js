'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Making delivery_order_id nullable in cctv_sessions...');
    
    // Make delivery_order_id nullable
    await queryInterface.changeColumn('cctv_sessions', 'delivery_order_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Now nullable
      references: {
        model: 'delivery_orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL' // Set to null if DO is deleted
    });
    
    console.log('✅ delivery_order_id is now nullable in cctv_sessions');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting delivery_order_id to NOT NULL in cctv_sessions...');
    
    // First, set all null values to a default (or delete those sessions)
    // For safety, we'll delete sessions with null delivery_order_id
    await queryInterface.sequelize.query(
      `DELETE FROM cctv_sessions WHERE delivery_order_id IS NULL`
    );
    
    // Then make it NOT NULL again
    await queryInterface.changeColumn('cctv_sessions', 'delivery_order_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'delivery_orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
    
    console.log('✅ delivery_order_id is now NOT NULL again');
  }
};

