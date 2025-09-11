const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BudgetRequest = sequelize.define('BudgetRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    delivery_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'delivery_orders',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    requested_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Requested amount must be a valid decimal number'
        },
        min: {
          args: 1,
          msg: 'Requested amount must be greater than 0'
        },
        max: {
          args: 99999999999.99,
          msg: 'Requested amount exceeds maximum allowed value'
        }
      }
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Reason for additional budget request is required'
        },
        len: {
          args: [3, 1000],
          msg: 'Reason must be between 3 and 1000 characters'
        }
      }
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'approved', // ✅ DEFAULT TO APPROVED FOR INSTANT APPROVAL
      validate: {
        isIn: {
          args: [['pending', 'approved', 'rejected']],
          msg: 'Status must be one of: pending, approved, rejected'
        }
      }
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    evidence_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'budget_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['delivery_order_id']
      },
      {
        fields: ['driver_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  return BudgetRequest;
};
