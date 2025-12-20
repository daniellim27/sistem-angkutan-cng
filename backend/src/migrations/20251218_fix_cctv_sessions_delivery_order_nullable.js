'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔧 Fixing delivery_order_id NULL constraint on cctv_sessions...');

    // Explicitly drop NOT NULL on delivery_order_id in case previous migration body changed
    await queryInterface.sequelize.query(
      'ALTER TABLE cctv_sessions ALTER COLUMN delivery_order_id DROP NOT NULL;'
    );

    // Ensure column definition matches our desired nullable FK behavior
    await queryInterface.changeColumn('cctv_sessions', 'delivery_order_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'delivery_orders',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    console.log('✅ delivery_order_id is now nullable on cctv_sessions (fix migration)');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting fix for delivery_order_id NULL constraint on cctv_sessions...');

    await queryInterface.sequelize.query(
      'ALTER TABLE cctv_sessions ALTER COLUMN delivery_order_id SET NOT NULL;'
    );

    await queryInterface.changeColumn('cctv_sessions', 'delivery_order_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'delivery_orders',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    console.log('✅ delivery_order_id is now NOT NULL again on cctv_sessions (fix migration reverted)');
  },
};





