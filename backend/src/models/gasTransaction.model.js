// backend/src/models/gasTransaction.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GasTransaction = sequelize.define(
    'GasTransaction',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      deposit_group_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'deposit_groups',
          key: 'id',
        },
      },
      delivery_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'delivery_orders',
          key: 'id',
        },
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      vehicle_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'vehicles',
          key: 'id',
        },
      },
      volume_m3: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      calculation_method: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      rate_per_m3: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      jisdor_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      total_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      surat_jalan_photo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Path to surat jalan (delivery note) photo - NOT used for OCR'
      },
      nota_photo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Path to nota (receipt) photo - THIS is used for OCR extraction'
      },
      biaya_lain_photo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Path to biaya lain (other expenses) photo'
      },
      biaya_lain_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Amount for other expenses'
      },
      biaya_lain_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Description of other expenses'
      },
      nota_ocr_data: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'OCR extracted data from nota photo (stan_awal, current_stan, pressure, temperature, etc.)'
      },
    },
    {
      tableName: 'gas_transactions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  GasTransaction.associate = (models) => {
    GasTransaction.belongsTo(models.DepositGroup, {
      foreignKey: 'deposit_group_id',
      as: 'depositGroup',
    });
    GasTransaction.belongsTo(models.DeliveryOrder, {
      foreignKey: 'delivery_order_id',
      as: 'deliveryOrder',
    });
    GasTransaction.belongsTo(models.User, {
      foreignKey: 'driver_id',
      as: 'driver',
    });
    GasTransaction.belongsTo(models.Vehicle, {
      foreignKey: 'vehicle_id',
      as: 'vehicle',
    });
  };

  return GasTransaction;
};


