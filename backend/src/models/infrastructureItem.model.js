// src/models/infrastructureItem.model.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InfrastructureItem = sequelize.define(
    "InfrastructureItem",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "infrastructure_categories",
          key: "id",
        },
      },
      location_id: {
        type: DataTypes.INTEGER,
        references: {
          model: "infrastructure_locations",
          key: "id",
        },
      },
      item_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: true,
      },
      item_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Item name cannot be empty",
          },
        },
      },
      supplier: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "Pcs",
      },
      min_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      average_unit_price: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      total_value: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      expired_date: {
        type: DataTypes.DATEONLY,
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
      tableName: "infrastructure_items",
      timestamps: false,
      hooks: {
        beforeUpdate: (item) => {
          item.updated_at = new Date();
        },
      },
    }
  );

  return InfrastructureItem;
};
