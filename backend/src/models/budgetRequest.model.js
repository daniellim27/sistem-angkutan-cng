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
          args: [10, 1000],
          msg: 'Reason must be between 10 and 1000 characters'
        }
      }
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
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
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Rejection reason must not exceed 500 characters'
        }
      }
    },
    evidence_url: {
      type: DataTypes.TEXT,
      allowNull: true // Optional photo evidence
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'budget_requests',
    timestamps: false,
    indexes: [
      {
        fields: ['delivery_order_id']
      },
      {
        fields: ['driver_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      }
    ],
    hooks: {
      beforeValidate: (request) => {
        if (request.reason) {
          request.reason = request.reason.trim();
        }
        if (request.rejection_reason) {
          request.rejection_reason = request.rejection_reason.trim();
        }
      }
    }
  });

  // Instance methods
  BudgetRequest.prototype.getFormattedAmount = function() {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(this.requested_amount);
  };

  BudgetRequest.prototype.hasEvidence = function() {
    return !!this.evidence_url;
  };

  BudgetRequest.prototype.getStatusLabel = function() {
    const labels = {
      'pending': 'Menunggu Persetujuan',
      'approved': 'Disetujui',
      'rejected': 'Ditolak'
    };
    return labels[this.status] || this.status;
  };

  // Class methods
  BudgetRequest.findByDeliveryOrder = function(deliveryOrderId) {
    return this.findAll({
      where: { delivery_order_id: deliveryOrderId },
      include: [{
        association: 'driver',
        attributes: ['id', 'username'],
        include: [{
          association: 'profile',
          attributes: ['full_name']
        }]
      }],
      order: [['created_at', 'DESC']]
    });
  };

  BudgetRequest.findByDriver = function(driverId, options = {}) {
    const whereClause = { driver_id: driverId };
    
    if (options.deliveryOrderId) {
      whereClause.delivery_order_id = options.deliveryOrderId;
    }
    
    if (options.status) {
      whereClause.status = options.status;
    }

    return this.findAll({
      where: whereClause,
      include: [{
        association: 'deliveryOrder',
        attributes: ['do_number', 'customer_name', 'trip_allowance']
      }],
      order: [['created_at', 'DESC']]
    });
  };

  BudgetRequest.getPendingRequests = function() {
    return this.findAll({
      where: { status: 'pending' },
      include: [
        {
          association: 'driver',
          attributes: ['id', 'username'],
          include: [{
            association: 'driverProfile',
            attributes: ['full_name']
          }]
        },
        {
          association: 'deliveryOrder',
          attributes: ['id', 'do_number', 'customer_name', 'trip_allowance']
        }
      ],
      order: [['created_at', 'ASC']] // Oldest first for admin review
    });
  };

  BudgetRequest.getTotalApprovedByDeliveryOrder = function(deliveryOrderId) {
    return this.sum('requested_amount', {
      where: { 
        delivery_order_id: deliveryOrderId,
        status: 'approved'
      }
    });
  };

  BudgetRequest.associate = function(models) {
    // A budget request belongs to one DeliveryOrder
    BudgetRequest.belongsTo(models.DeliveryOrder, {
      foreignKey: 'delivery_order_id',
      as: 'deliveryOrder'
    });

    // A budget request belongs to one User (acting as a driver)
    BudgetRequest.belongsTo(models.User, {
      foreignKey: 'driver_id',
      as: 'driver'
    });

    // A budget request may be approved by an admin
    BudgetRequest.belongsTo(models.User, {
      foreignKey: 'approved_by',
      as: 'approver'
    });
  };

  return BudgetRequest;
};
