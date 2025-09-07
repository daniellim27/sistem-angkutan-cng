// src/models/infrastructureCategory.model.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InfrastructureCategory = sequelize.define(
    "InfrastructureCategory",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: "Category name cannot be empty",
          },
        },
      },
      description: {
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
      tableName: "infrastructure_categories",
      timestamps: false,
      hooks: {
        beforeUpdate: (category) => {
          category.updated_at = new Date();
        },
      },
    }
  );

  return InfrastructureCategory;
};
