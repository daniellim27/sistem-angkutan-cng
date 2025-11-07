const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NotaBesar = sequelize.define("NotaBesar", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    delivery_order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'delivery_orders',
        key: 'id'
      },
      comment: 'Reference to delivery order'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Admin user who created this nota besar'
    },
    total_volume: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Total volume in m³ calculated from selected nota kecils'
    },
    total_price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Total price calculated from total volume and gas price'
    },
    gas_price_per_m3: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Gas price per m³ used for calculation'
    },
    status: {
      type: DataTypes.ENUM('draft', 'confirmed', 'billed', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Status of the nota besar'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional notes for this nota besar'
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'customers',
        key: 'id'
      },
      comment: 'Reference to customer who owns this nota besar'
    },
    applied_to_customer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this nota besar has been applied to customer balance'
    },
    applied_to_customer_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when this nota besar was applied to customer balance'
    }
  }, {
    tableName: "nota_besars",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["delivery_order_id"]
      },
      {
        fields: ["created_by"]
      },
      {
        fields: ["status"]
      },
      {
        fields: ["created_at"]
      },
      {
        fields: ["customer_id"]
      },
      {
        fields: ["applied_to_customer"]
      }
    ]
  });

  // Instance methods
  NotaBesar.prototype.canEdit = function() {
    return ['draft'].includes(this.status);
  };

  NotaBesar.prototype.canConfirm = function() {
    return ['draft'].includes(this.status);
  };

  NotaBesar.prototype.canCancel = function() {
    return ['draft', 'confirmed'].includes(this.status);
  };

  NotaBesar.prototype.canBill = function() {
    return ['confirmed'].includes(this.status);
  };

  NotaBesar.prototype.getStatusText = function() {
    const statusMap = {
      draft: 'Draft',
      confirmed: 'Confirmed',
      billed: 'Billed',
      cancelled: 'Cancelled'
    };
    return statusMap[this.status] || this.status;
  };

  return NotaBesar;
};
