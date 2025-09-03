const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('driver_expenses', 'status', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'approved'
    });

    await queryInterface.addColumn('driver_expenses', 'approved_by', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('driver_expenses', 'approved_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('driver_expenses', 'rejection_reason', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    // Add index for status column for better query performance
    await queryInterface.addIndex('driver_expenses', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('driver_expenses', ['status']);
    await queryInterface.removeColumn('driver_expenses', 'rejection_reason');
    await queryInterface.removeColumn('driver_expenses', 'approved_at');
    await queryInterface.removeColumn('driver_expenses', 'approved_by');
    await queryInterface.removeColumn('driver_expenses', 'status');
  }
};
