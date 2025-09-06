const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns already exist before adding them
    const tableDescription = await queryInterface.describeTable('driver_expenses');
    
    if (!tableDescription.status) {
      await queryInterface.addColumn('driver_expenses', 'status', {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'approved'
      });
    }

    if (!tableDescription.approved_by) {
      await queryInterface.addColumn('driver_expenses', 'approved_by', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      });
    }

    if (!tableDescription.approved_at) {
      await queryInterface.addColumn('driver_expenses', 'approved_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
    }

    if (!tableDescription.rejection_reason) {
      await queryInterface.addColumn('driver_expenses', 'rejection_reason', {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }

    // Add index for status column for better query performance (with error handling)
    try {
      await queryInterface.addIndex('driver_expenses', ['status']);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('driver_expenses', ['status']);
    await queryInterface.removeColumn('driver_expenses', 'rejection_reason');
    await queryInterface.removeColumn('driver_expenses', 'approved_at');
    await queryInterface.removeColumn('driver_expenses', 'approved_by');
    await queryInterface.removeColumn('driver_expenses', 'status');
  }
};
