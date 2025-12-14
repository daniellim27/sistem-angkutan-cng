'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Making delivery_order_id nullable in nota_kecils...');
    
    // Explicitly DROP NOT NULL first (safer across environments)
    await queryInterface.sequelize.query(
      'ALTER TABLE nota_kecils ALTER COLUMN delivery_order_id DROP NOT NULL;'
    );

    // Then make delivery_order_id nullable & adjust FK behavior
    await queryInterface.changeColumn('nota_kecils', 'delivery_order_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Now nullable
      references: {
        model: 'delivery_orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL' // Set to null if DO is deleted
    });
    
    console.log('✅ delivery_order_id is now nullable in nota_kecils');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting delivery_order_id to NOT NULL in nota_kecils...');
    
    // First, set all null values to a default (or delete those notas)
    // For safety, we'll delete notas with null delivery_order_id
    await queryInterface.sequelize.query(
      `DELETE FROM nota_kecils WHERE delivery_order_id IS NULL`
    );
    
    // Then make it NOT NULL again
    await queryInterface.changeColumn('nota_kecils', 'delivery_order_id', {
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

