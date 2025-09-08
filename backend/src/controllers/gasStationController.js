const { GasStation, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all active gas stations
 */
exports.getAllGasStations = async (req, res, next) => {
  try {
    const gasStations = await GasStation.findAll({
      where: { is_active: true },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: gasStations,
      count: gasStations.length
    });

  } catch (error) {
    console.error('Error getting gas stations:', error);
    next(error);
  }
};

/**
 * Get a specific gas station by ID
 */
exports.getGasStationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const gasStation = await GasStation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username']
        }
      ]
    });

    if (!gasStation) {
      return res.status(404).json({
        success: false,
        message: 'Gas station not found'
      });
    }

    res.json({
      success: true,
      data: gasStation
    });

  } catch (error) {
    console.error('Error getting gas station:', error);
    next(error);
  }
};

/**
 * Create a new gas station
 */
exports.createGasStation = async (req, res, next) => {
  try {
    const {
      name,
      latitude,
      longitude,
      address,
      station_type,
      phone,
      operating_hours,
      fuel_types,
      amenities,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Name, latitude, and longitude are required'
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180'
      });
    }

    const gasStation = await GasStation.create({
      name,
      latitude,
      longitude,
      address,
      station_type: station_type || 'CNG',
      phone,
      operating_hours,
      fuel_types,
      amenities,
      notes,
      created_by: req.user.id,
      is_active: true
    });

    // Fetch the created gas station with associations
    const createdGasStation = await GasStation.findByPk(gasStation.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Gas station created successfully',
      data: createdGasStation
    });

  } catch (error) {
    console.error('Error creating gas station:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    next(error);
  }
};

/**
 * Update a gas station
 */
exports.updateGasStation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      latitude,
      longitude,
      address,
      station_type,
      phone,
      operating_hours,
      fuel_types,
      amenities,
      notes,
      is_active
    } = req.body;

    const gasStation = await GasStation.findByPk(id);

    if (!gasStation) {
      return res.status(404).json({
        success: false,
        message: 'Gas station not found'
      });
    }

    // Validate coordinate ranges if provided
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90'
      });
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180'
      });
    }

    await gasStation.update({
      name: name !== undefined ? name : gasStation.name,
      latitude: latitude !== undefined ? latitude : gasStation.latitude,
      longitude: longitude !== undefined ? longitude : gasStation.longitude,
      address: address !== undefined ? address : gasStation.address,
      station_type: station_type !== undefined ? station_type : gasStation.station_type,
      phone: phone !== undefined ? phone : gasStation.phone,
      operating_hours: operating_hours !== undefined ? operating_hours : gasStation.operating_hours,
      fuel_types: fuel_types !== undefined ? fuel_types : gasStation.fuel_types,
      amenities: amenities !== undefined ? amenities : gasStation.amenities,
      notes: notes !== undefined ? notes : gasStation.notes,
      is_active: is_active !== undefined ? is_active : gasStation.is_active,
      updated_by: req.user.id
    });

    // Fetch the updated gas station with associations
    const updatedGasStation = await GasStation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Gas station updated successfully',
      data: updatedGasStation
    });

  } catch (error) {
    console.error('Error updating gas station:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    next(error);
  }
};

/**
 * Delete a gas station (soft delete by setting is_active to false)
 */
exports.deleteGasStation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const gasStation = await GasStation.findByPk(id);

    if (!gasStation) {
      return res.status(404).json({
        success: false,
        message: 'Gas station not found'
      });
    }

    await gasStation.update({
      is_active: false,
      updated_by: req.user.id
    });

    res.json({
      success: true,
      message: 'Gas station deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting gas station:', error);
    next(error);
  }
};

/**
 * Search gas stations
 */
exports.searchGasStations = async (req, res, next) => {
  try {
    const { q, type, lat, lng, radius } = req.query;

    let whereClause = { is_active: true };
    let gasStations = [];

    if (lat && lng && radius) {
      // Search within radius
      const radiusKm = parseFloat(radius) || 50;
      gasStations = await GasStation.getStationsWithinRadius(
        parseFloat(lat),
        parseFloat(lng),
        radiusKm
      );
    } else {
      // Build search conditions
      if (q) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${q}%` } },
          { address: { [Op.iLike]: `%${q}%` } }
        ];
      }

      if (type) {
        whereClause.station_type = type;
      }

      gasStations = await GasStation.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username']
          }
        ],
        order: [['name', 'ASC']]
      });
    }

    res.json({
      success: true,
      data: gasStations,
      count: gasStations.length,
      search_params: { q, type, lat, lng, radius }
    });

  } catch (error) {
    console.error('Error searching gas stations:', error);
    next(error);
  }
};

/**
 * Get gas stations by type
 */
exports.getGasStationsByType = async (req, res, next) => {
  try {
    const { type } = req.params;

    const gasStations = await GasStation.getStationsByType(type);

    res.json({
      success: true,
      data: gasStations,
      count: gasStations.length,
      station_type: type
    });

  } catch (error) {
    console.error('Error getting gas stations by type:', error);
    next(error);
  }
};

/**
 * Get gas station statistics
 */
exports.getGasStationStats = async (req, res, next) => {
  try {
    const totalStations = await GasStation.count({ where: { is_active: true } });
    
    const stationsByType = await GasStation.findAll({
      where: { is_active: true },
      attributes: [
        'station_type',
        [GasStation.sequelize.fn('COUNT', GasStation.sequelize.col('id')), 'count']
      ],
      group: ['station_type'],
      raw: true
    });

    const recentStations = await GasStation.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']],
      limit: 5,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        total_stations: totalStations,
        stations_by_type: stationsByType,
        recent_stations: recentStations
      }
    });

  } catch (error) {
    console.error('Error getting gas station stats:', error);
    next(error);
  }
};
