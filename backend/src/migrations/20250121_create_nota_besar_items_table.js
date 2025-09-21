const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('nota_besar_items', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nota_besar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'nota_besars',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to nota besar'
      },
      nota_kecil_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'nota_kecils',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to nota kecil'
      },
      volume_m3: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        comment: 'Volume in m³ for this item (calculated using billing formula)'
      },
      price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Price for this item (volume_m3 * gas_price_per_m3)'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('nota_besar_items', ['nota_besar_id']);
    await queryInterface.addIndex('nota_besar_items', ['nota_kecil_id']);
    
    // Add unique constraint to prevent duplicate nota kecil in same nota besar
    await queryInterface.addConstraint('nota_besar_items', {
      fields: ['nota_besar_id', 'nota_kecil_id'],
      type: 'unique',
      name: 'unique_nota_besar_item'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('nota_besar_items');
  }
};
