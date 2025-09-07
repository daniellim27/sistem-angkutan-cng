// src/models/infrastructureLocation.model.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InfrastructureLocation = sequelize.define(
    "InfrastructureLocation",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      location_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: "Location name cannot be empty",
          },
        },
      },
      location_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: "infrastructure_locations",
      timestamps: false,
      hooks: {
        beforeUpdate: (location) => {
          location.updated_at = new Date();
        },
      },
    }
  );

  return InfrastructureLocation;
};
