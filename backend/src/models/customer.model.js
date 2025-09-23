// src/models/customer.model.js
const { DataTypes, Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const Customer = sequelize.define(
    "Customer",
    {
      id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
      },

      // === BASIC INFO ===
      customer_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "Customer name",
        validate: {
          notEmpty: true,
          len: [1, 255]
        }
      },
      
      location: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Customer location/address",
        validate: {
          notEmpty: true
        }
      },

      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: "Customer phone number (optional)",
        validate: {
          isIndonesianPhone(value) {
            if (value && value.trim() !== '') {
              const cleanPhone = value.replace(/\s|-/g, '');
              const phoneRegex = /^(\+62|62|0)[0-9]{8,13}$/;
              if (!phoneRegex.test(cleanPhone)) {
                throw new Error('Invalid Indonesian phone number format');
              }
            }
          }
        }
      },

      // === NOTA FIELDS ===
      nota_besar: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Nota Besar amount",
        validate: { 
          min: 0 
        }
      },
      
      nota_kecil: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Nota Kecil amount", 
        validate: { 
          min: 0 
        }
      },

      // === TIMESTAMPS ===
      created_at: {
        type: DataTypes.DATE,
        field: "created_at",
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        field: "updated_at",
        defaultValue: Sequelize.NOW,
      },
    },
    {
      tableName: "customers",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: false,
          fields: ["customer_name"]
        }
      ]
    }
  );

  // === INSTANCE METHODS ===
  Customer.prototype.getTotalNota = function () {
    const notaBesar = parseFloat(this.nota_besar) || 0;
    const notaKecil = parseFloat(this.nota_kecil) || 0;
    return notaBesar + notaKecil;
  };

  Customer.prototype.getFormattedNotaBesar = function () {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(this.nota_besar);
  };

  Customer.prototype.getFormattedNotaKecil = function () {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', 
      currency: 'IDR'
    }).format(this.nota_kecil);
  };

  Customer.prototype.getFormattedTotalNota = function () {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(this.getTotalNota());
  };

  Customer.prototype.getFormattedPhone = function () {
    if (!this.phone) return null;
    
    const phone = this.phone.replace(/\s|-/g, '');
    if (phone.startsWith('62')) {
      return '+' + phone;
    } else if (phone.startsWith('0')) {
      return '+62' + phone.substring(1);
    }
    return phone;
  };

  // === STATIC METHODS ===
  Customer.findByName = function(name) {
    return Customer.findAll({
      where: {
        customer_name: {
          [sequelize.Sequelize.Op.iLike]: `%${name}%`
        }
      },
      order: [['customer_name', 'ASC']]
    });
  };

  Customer.getTotalNotaByLocation = function(location) {
    return Customer.findAll({
      where: {
        location: {
          [sequelize.Sequelize.Op.iLike]: `%${location}%`
        }
      },
      attributes: [
        'location',
        [sequelize.fn('SUM', sequelize.col('nota_besar')), 'total_nota_besar'],
        [sequelize.fn('SUM', sequelize.col('nota_kecil')), 'total_nota_kecil'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'customer_count']
      ],
      group: ['location'],
      order: [['location', 'ASC']]
    });
  };

  return Customer;
};
