// backend/src/migrations/20241225_add_vehicle_id_to_cash_transactions.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('cash_transactions', 'vehicle_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'vehicles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('cash_transactions', 'vehicle_id');
  }
};
