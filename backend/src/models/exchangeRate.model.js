'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExchangeRate = sequelize.define('ExchangeRate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    currency_code: {
      type: DataTypes.STRING(3),
      allowNull: false,
      comment: 'Currency code (e.g., USD)'
    },
    rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Exchange rate value'
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Bank Indonesia',
      comment: 'Source of the exchange rate'
    },
    scraped_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when rate was scraped'
    }
  }, {
    tableName: 'exchange_rates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return ExchangeRate;
};
