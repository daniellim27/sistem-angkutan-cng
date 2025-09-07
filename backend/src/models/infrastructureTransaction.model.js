// src/models/infrastructureTransaction.model.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InfrastructureTransaction = sequelize.define(
    "InfrastructureTransaction",
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
      batch_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "infrastructure_batches",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      transaction_type: {
        type: DataTypes.ENUM("in", "out", "adjustment"),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      unit_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      total_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      reference_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      reference_id: {
        type: DataTypes.INTEGER,
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
      transaction_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "infrastructure_transactions",
      timestamps: false,
    }
  );

  return InfrastructureTransaction;
};
