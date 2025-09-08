const { DataTypes, Sequelize } = require('sequelize');

module.exports = (sequelize) => {
  const GasStation = sequelize.define(
    'GasStation',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Gas station name cannot be empty',
          },
          len: {
            args: [2, 255],
            msg: 'Gas station name must be between 2 and 255 characters',
          },
        },
        comment: 'Name of the gas station',
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
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Full address of the gas station',
      },
      station_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'CNG',
        validate: {
          isIn: {
            args: [['CNG', 'Petrol', 'Diesel', 'LPG', 'Mixed']],
            msg: 'Station type must be one of: CNG, Petrol, Diesel, LPG, Mixed',
          },
        },
        comment: 'Type of fuel station',
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
          len: {
            args: [0, 20],
            msg: 'Phone number must not exceed 20 characters',
          },
        },
        comment: 'Contact phone number',
      },
      operating_hours: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          len: {
            args: [0, 100],
            msg: 'Operating hours must not exceed 100 characters',
          },
        },
        comment: 'Operating hours (e.g., "24/7" or "06:00 - 22:00")',
      },
      fuel_types: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Available fuel types and prices',
      },
      amenities: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Available amenities (e.g., ["ATM", "RestRoom", "WiFi"])',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the gas station is currently active/operational',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes or special instructions',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User who created this gas station marker',
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User who last updated this gas station marker',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      tableName: 'gas_stations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['latitude', 'longitude'],
          name: 'idx_gas_stations_coordinates',
        },
        {
          fields: ['station_type'],
          name: 'idx_gas_stations_type',
        },
        {
          fields: ['is_active'],
          name: 'idx_gas_stations_active',
        },
        {
          fields: ['created_by'],
          name: 'idx_gas_stations_created_by',
        },
      ],
    }
  );

  // === ASSOCIATIONS ===
  GasStation.associate = (models) => {
    // Association with User (Creator)
    GasStation.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
      onDelete: 'RESTRICT',
    });

    // Association with User (Updater)
    GasStation.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater',
      onDelete: 'SET NULL',
    });
  };

  // === INSTANCE METHODS ===
  GasStation.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    
    return {
      id: values.id,
      name: values.name,
      latitude: parseFloat(values.latitude),
      longitude: parseFloat(values.longitude),
      address: values.address,
      station_type: values.station_type,
      phone: values.phone,
      operating_hours: values.operating_hours,
      fuel_types: values.fuel_types,
      amenities: values.amenities,
      is_active: values.is_active,
      notes: values.notes,
      created_by: values.created_by,
      updated_by: values.updated_by,
      created_at: values.created_at,
      updated_at: values.updated_at,
    };
  };

  // === CLASS METHODS ===
  
  /**
   * Get all active gas stations
   */
  GasStation.getActiveStations = async function() {
    return await this.findAll({
      where: { is_active: true },
      include: [
        { 
          model: sequelize.models.User, 
          as: 'creator', 
          attributes: ['id', 'username'] 
        },
      ],
      order: [['name', 'ASC']],
    });
  };

  /**
   * Get gas stations within a radius (in kilometers) from a point
   */
  GasStation.getStationsWithinRadius = async function(latitude, longitude, radiusKm = 50) {
    // Using Haversine formula for distance calculation
    const query = `
      SELECT *,
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
        sin(radians(latitude)))) AS distance
      FROM gas_stations
      WHERE is_active = true
      HAVING distance < ?
      ORDER BY distance;
    `;
    
    return await sequelize.query(query, {
      replacements: [latitude, longitude, latitude, radiusKm],
      type: sequelize.QueryTypes.SELECT,
    });
  };

  /**
   * Search gas stations by name or type
   */
  GasStation.searchStations = async function(searchTerm) {
    return await this.findAll({
      where: {
        is_active: true,
        [sequelize.Sequelize.Op.or]: [
          { name: { [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%` } },
          { station_type: { [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%` } },
          { address: { [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%` } },
        ],
      },
      include: [
        { 
          model: sequelize.models.User, 
          as: 'creator', 
          attributes: ['id', 'username'] 
        },
      ],
      order: [['name', 'ASC']],
    });
  };

  /**
   * Get stations by type
   */
  GasStation.getStationsByType = async function(stationType) {
    return await this.findAll({
      where: { 
        is_active: true,
        station_type: stationType 
      },
      include: [
        { 
          model: sequelize.models.User, 
          as: 'creator', 
          attributes: ['id', 'username'] 
        },
      ],
      order: [['name', 'ASC']],
    });
  };

  return GasStation;
};
