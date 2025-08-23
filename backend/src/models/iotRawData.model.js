// src/models/iotRawData.model.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const IotRawData = sequelize.define(
    "IotRawData",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      delivery_order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'delivery_orders',
          key: 'id'
        },
        comment: 'Reference to delivery order'
      },
      pressure_in: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Input pressure reading from sensor'
      },
      pressure_out: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Output pressure reading from sensor'
      },
      temperature: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Temperature reading from sensor'
      },
      meter_pulse: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Meter pulse count from sensor'
      }
    },
    {
      tableName: 'iot_raw_data',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          fields: ['delivery_order_id']
        },
        {
          fields: ['created_at']
        }
      ]
    }
  );

  // Define associations
  IotRawData.associate = (models) => {
    IotRawData.belongsTo(models.DeliveryOrder, {
      foreignKey: 'delivery_order_id',
      as: 'deliveryOrder'
    });
  };

  return IotRawData;
};
