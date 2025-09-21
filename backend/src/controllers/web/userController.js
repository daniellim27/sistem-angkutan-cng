// src/controllers/web/userController.js
const { User, DriverProfile } = require("../../models");
const { Op } = require("sequelize");

// Get users with role filtering for web interface
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    let profileWhereClause = {};

    // Filter by role
    if (role) {
      whereClause.role = role;
    }

    // Filter by search term
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Special handling for drivers
    if (role === "driver") {
      // Filter by driver status if provided
      if (status) {
        profileWhereClause.status = status;
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: DriverProfile,
            as: "driverProfile",
            where: Object.keys(profileWhereClause).length > 0 ? profileWhereClause : undefined,
            required: true, // Only include users who have driver profiles
            attributes: ["full_name", "phone", "status", "sim_number", "license_type"]
          }
        ],
        order: [["driverProfile", "full_name", "ASC"]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Format response for frontend
      const formattedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.driverProfile?.full_name,
        phone: user.driverProfile?.phone,
        status: user.driverProfile?.status,
        sim_number: user.driverProfile?.sim_number,
        license_type: user.driverProfile?.license_type,
        created_at: user.created_at,
        updated_at: user.updated_at
      }));

      return res.json({
        success: true,
        data: formattedUsers,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    }

    // For non-driver users or all users
    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: DriverProfile,
          as: "driverProfile",
          required: false,
          attributes: ["full_name", "phone", "status"]
        }
      ],
      order: [["username", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch users", 
      error: err.message 
    });
    next(err);
  }
};

// Get available drivers (not assigned to any active delivery)
exports.getAvailableDrivers = async (req, res, next) => {
  try {
    const { DeliveryOrder, BigDeliveryOrder } = require("../../models");
    
    // Find drivers who are not currently assigned to active deliveries
    const activeDeliveries = await DeliveryOrder.findAll({
      where: {
        status: {
          [Op.in]: [
            "at_spbu",
            "otw_to_unload_location",
            "at_unload_location"
          ]
        }
      },
      attributes: ["driver_id"],
      raw: true
    });

    const activeBigDeliveries = await BigDeliveryOrder.findAll({
      where: {
        status: {
          [Op.in]: ["at_spbu", "in_progress"]
        }
      },
      attributes: ["driver_id"],
      raw: true
    });

    const busyDriverIds = [
      ...activeDeliveries.map(d => d.driver_id),
      ...activeBigDeliveries.map(d => d.driver_id)
    ].filter(Boolean);

    let driverWhereClause = { role: "driver" };
    if (busyDriverIds.length > 0) {
      driverWhereClause.id = { [Op.notIn]: busyDriverIds };
    }

    const availableDrivers = await User.findAll({
      where: driverWhereClause,
      include: [
        {
          model: DriverProfile,
          as: "driverProfile",
          where: { status: "available" },
          required: true,
          attributes: ["full_name", "phone", "status", "license_number"]
        }
      ],
      order: [["driverProfile", "full_name", "ASC"]]
    });

    const formattedDrivers = availableDrivers.map(driver => ({
      id: driver.id,
      username: driver.username,
      full_name: driver.driverProfile.full_name,
      phone: driver.driverProfile.phone,
      status: driver.driverProfile.status,
      license_number: driver.driverProfile.license_number
    }));

    res.json({
      success: true,
      data: formattedDrivers,
      total: formattedDrivers.length
    });

  } catch (err) {
    console.error("Error fetching available drivers:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch available drivers", 
      error: err.message 
    });
    next(err);
  }
};

// Get user profile
exports.getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [
        {
          model: DriverProfile,
          as: "driverProfile",
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch user profile", 
      error: err.message 
    });
    next(err);
  }
};
