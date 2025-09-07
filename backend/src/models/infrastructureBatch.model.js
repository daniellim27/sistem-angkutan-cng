// src/models/infrastructureBatch.model.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InfrastructureBatch = sequelize.define(
    "InfrastructureBatch",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "infrastructure_items",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      batch_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      original_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      unit_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      purchase_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      expired_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      supplier: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "infrastructure_batches",
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ["item_id", "batch_number"],
        },
      ],
      hooks: {
        beforeUpdate: (batch) => {
          batch.updated_at = new Date();
        },
      },
    }
  );

  return InfrastructureBatch;
};
