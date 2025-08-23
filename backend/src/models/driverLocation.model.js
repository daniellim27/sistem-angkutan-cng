const { DataTypes, Sequelize } = require('sequelize');

module.exports = (sequelize) => {
  const DriverLocation = sequelize.define(
    'DriverLocation',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'Reference to driver user ID',
      },
      vehicle_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'vehicles',
          key: 'id',
        },
        comment: 'Reference to vehicle ID',
      },
      delivery_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'delivery_orders',
          key: 'id',
        },
        comment: 'Optional reference to active delivery order',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
        validate: {
          min: -90,
          max: 90,
        },
        comment: 'GPS latitude coordinate',
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
        validate: {
          min: -180,
          max: 180,
        },
        comment: 'GPS longitude coordinate',
      },
      altitude: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Altitude in meters (if available)',
      },
      speed: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
        comment: 'Speed in km/h',
      },
      heading: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 360,
        },
        comment: 'Direction in degrees (0-360)',
      },
      accuracy: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
        comment: 'GPS accuracy in meters',
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when GPS data was recorded',
      },
      device_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Inovatracks device identifier',
      },
      battery_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Device battery level percentage',
      },
      signal_strength: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'GPS signal strength',
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'active',
        comment: 'Device status (active, idle, offline, etc.)',
      },
      created_at: {
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: Sequelize.NOW,
      },
    },
    {
      tableName: 'driver_locations',
      timestamps: false,
      indexes: [
        {
          fields: ['timestamp'],
          order: [['timestamp', 'DESC']],
        },
        {
          fields: ['driver_id', 'timestamp'],
        },
        {
          fields: ['vehicle_id', 'timestamp'],
        },
        {
          fields: ['delivery_order_id'],
        },
        {
          fields: ['device_id'],
        },
      ],
    }
  );

  // === ASSOCIATIONS ===
  DriverLocation.associate = (models) => {
    // Association with User (Driver)
    DriverLocation.belongsTo(models.User, {
      foreignKey: 'driver_id',
      as: 'driver',
      onDelete: 'SET NULL',
    });

    // Association with Vehicle
    DriverLocation.belongsTo(models.Vehicle, {
      foreignKey: 'vehicle_id',
      as: 'vehicle',
      onDelete: 'SET NULL',
    });

    // Association with DeliveryOrder
    DriverLocation.belongsTo(models.DeliveryOrder, {
      foreignKey: 'delivery_order_id',
      as: 'deliveryOrder',
      onDelete: 'SET NULL',
    });
  };

  // === INSTANCE METHODS ===
  DriverLocation.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    
    return {
      id: values.id,
      driver_id: values.driver_id,
      vehicle_id: values.vehicle_id,
      delivery_order_id: values.delivery_order_id,
      latitude: parseFloat(values.latitude),
      longitude: parseFloat(values.longitude),
      altitude: values.altitude ? parseFloat(values.altitude) : null,
      speed: values.speed ? parseFloat(values.speed) : null,
      heading: values.heading ? parseFloat(values.heading) : null,
      accuracy: values.accuracy ? parseFloat(values.accuracy) : null,
      timestamp: values.timestamp,
      device_id: values.device_id,
      battery_level: values.battery_level,
      signal_strength: values.signal_strength,
      status: values.status,
      created_at: values.created_at,
    };
  };

  // === CLASS METHODS ===
  
  /**
   * Get latest location for a vehicle
   */
  DriverLocation.getLatestByVehicle = async function(vehicleId) {
    return await this.findOne({
      where: { vehicle_id: vehicleId },
      order: [['timestamp', 'DESC']],
      include: [
        { model: sequelize.models.User, as: 'driver', attributes: ['id', 'username'] },
        { model: sequelize.models.Vehicle, as: 'vehicle', attributes: ['id', 'license_plate'] },
      ],
    });
  };

  /**
   * Get latest location for a driver
   */
  DriverLocation.getLatestByDriver = async function(driverId) {
    return await this.findOne({
      where: { driver_id: driverId },
      order: [['timestamp', 'DESC']],
      include: [
        { model: sequelize.models.User, as: 'driver', attributes: ['id', 'username'] },
        { model: sequelize.models.Vehicle, as: 'vehicle', attributes: ['id', 'license_plate'] },
      ],
    });
  };

  /**
   * Get location history for a vehicle within a time range
   */
  DriverLocation.getHistoryByVehicle = async function(vehicleId, startDate, endDate, limit = 100) {
    const where = { vehicle_id: vehicleId };
    
    if (startDate && endDate) {
      where.timestamp = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      };
    }

    return await this.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit,
      include: [
        { model: sequelize.models.User, as: 'driver', attributes: ['id', 'username'] },
        { model: sequelize.models.Vehicle, as: 'vehicle', attributes: ['id', 'license_plate'] },
      ],
    });
  };

  /**
   * Get all active vehicle locations (last 30 minutes)
   */
  DriverLocation.getActiveVehicles = async function() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    return await this.findAll({
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.gte]: thirtyMinutesAgo,
        },
      },
      order: [['vehicle_id', 'ASC'], ['timestamp', 'DESC']],
      include: [
        { model: sequelize.models.User, as: 'driver', attributes: ['id', 'username'] },
        { model: sequelize.models.Vehicle, as: 'vehicle', attributes: ['id', 'license_plate', 'type'] },
        { model: sequelize.models.DeliveryOrder, as: 'deliveryOrder', attributes: ['id', 'do_number', 'status'] },
      ],
    });
  };

  /**
   * Clean up old location data (keep only last 30 days)
   */
  DriverLocation.cleanup = async function() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedCount = await this.destroy({
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.lt]: thirtyDaysAgo,
        },
      },
    });

    console.log(`🧹 Cleaned up ${deletedCount} old location records`);
    return deletedCount;
  };

  return DriverLocation;
}; 