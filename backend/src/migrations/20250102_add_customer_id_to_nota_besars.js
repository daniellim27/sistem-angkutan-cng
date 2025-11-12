const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('nota_besars');
    
    // Add customer_id column if it doesn't exist
    if (!tableDescription.customer_id) {
      await queryInterface.addColumn('nota_besars', 'customer_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'customers',
          key: 'id'
        },
        comment: 'Reference to customer who owns this nota besar'
      });
    }

    // Add applied_to_customer column if it doesn't exist
    if (!tableDescription.applied_to_customer) {
      await queryInterface.addColumn('nota_besars', 'applied_to_customer', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this nota besar has been applied to customer balance'
      });
    }

    // Add applied_to_customer_at column if it doesn't exist
    if (!tableDescription.applied_to_customer_at) {
      await queryInterface.addColumn('nota_besars', 'applied_to_customer_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
    }

    // Create indexes (will fail gracefully if they already exist)
    try {
      await queryInterface.addIndex('nota_besars', ['customer_id'], {
        name: 'idx_nota_besars_customer_id'
      });
    } catch (error) {
      // Index might already exist, ignore
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('nota_besars', ['applied_to_customer'], {
        name: 'idx_nota_besars_applied_to_customer'
      });
    } catch (error) {
      // Index might already exist, ignore
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('nota_besars', 'idx_nota_besars_customer_id');
    await queryInterface.removeIndex('nota_besars', 'idx_nota_besars_applied_to_customer');

    // Remove columns
    await queryInterface.removeColumn('nota_besars', 'applied_to_customer_at');
    await queryInterface.removeColumn('nota_besars', 'applied_to_customer');
    await queryInterface.removeColumn('nota_besars', 'customer_id');
  }
};

