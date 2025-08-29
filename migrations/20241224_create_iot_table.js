'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('iot_raw_data', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      delivery_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'delivery_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to delivery order'
      },
      pressure_in: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Input pressure reading from sensor'
      },
      pressure_out: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Output pressure reading from sensor'
      },
      temperature: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Temperature reading from sensor'
      },
      meter_pulse: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Meter pulse count from sensor'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('iot_raw_data', ['delivery_order_id'], {
      name: 'idx_iot_raw_data_delivery_order_id'
    });

    await queryInterface.addIndex('iot_raw_data', ['created_at'], {
      name: 'idx_iot_raw_data_created_at'
    });

    // Add foreign key constraint
    await queryInterface.addConstraint('iot_raw_data', {
      fields: ['delivery_order_id'],
      type: 'foreign key',
      name: 'fk_iot_raw_data_delivery_order_id',
      references: {
        table: 'delivery_orders',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('iot_raw_data');
  }
};
