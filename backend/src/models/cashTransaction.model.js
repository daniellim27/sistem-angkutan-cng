const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CashTransaction = sequelize.define('CashTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    transaction_type: {
      type: DataTypes.ENUM('debit', 'kredit', 'debit_tempo', 'kredit_tempo'), // Added new types
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'cash_categories',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    reference_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    account: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    transaction_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    attachment_urls: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    no_nota: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    // === SPBG FIELDS ===
    spbg_location: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'SPBG (Stasiun Pengisian Bahan Bakar Gas) location'
    },
    gas_volume_m3: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Gas volume in cubic meters',
      validate: { min: 0 }
    },
    calculation_method: {
      type: DataTypes.ENUM('jisdor', 'fixed'),
      allowNull: true,
      defaultValue: 'jisdor',
      comment: 'Method used for gas filling cost calculation'
    },
    jisdor_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'JISDOR rate for gas filling cost calculation',
      validate: { min: 0 }
    },
    gas_filling_cost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Calculated gas filling cost',
      validate: { min: 0 }
    }
  }, {
    tableName: 'cash_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return CashTransaction;
};
