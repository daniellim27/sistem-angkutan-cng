const { Notification, Vehicle, User, sequelize } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * GET /api/notifications
 * Get all notifications (with pagination and filters)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, is_read, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (is_read !== undefined) {
      where.is_read = is_read === 'true';
    }
    if (type) {
      where.type = type;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'device_id'],
          required: false
        },
        {
          model: User,
          as: 'driver',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const unreadCount = await Notification.count({
      where: { is_read: false }
    });

    res.json({
      success: true,
      notifications: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({
      where: { is_read: false }
    });

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.update({
      is_read: true,
      read_at: new Date()
    });

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    next(error);
  }
};

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const updated = await Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: { is_read: false }
      }
    );

    res.json({
      success: true,
      updatedCount: updated[0]
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    next(error);
  }
};

/**
 * GET /api/notifications/idle-summary
 * Get idle vehicle notifications grouped by vehicle
 */
exports.getIdleSummary = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, is_read, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const baseWhere = { type: 'idle_vehicle' };
    if (is_read !== undefined) {
      baseWhere.is_read = is_read === 'true';
    }

    const vehicleWhere = {};
    if (search) {
      vehicleWhere[Op.or] = [
        { license_plate: { [Op.iLike]: `%${search}%` } },
        { device_id: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const grouped = await Notification.findAll({
      attributes: [
        'vehicle_id',
        [fn('COUNT', col('Notification.id')), 'total_count'],
        [fn('SUM', literal("CASE WHEN is_read = false THEN 1 ELSE 0 END")), 'unread_count'],
        [fn('MAX', col('Notification.created_at')), 'latest_created_at'],
      ],
      where: baseWhere,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'license_plate', 'device_id'],
          required: true,
          where: Object.keys(vehicleWhere).length > 0 ? vehicleWhere : undefined,
        },
      ],
      group: ['vehicle_id', 'vehicle.id', 'vehicle.license_plate', 'vehicle.device_id'],
      order: [[fn('MAX', col('Notification.created_at')), 'DESC']],
      limit: parseInt(limit),
      offset,
      subQuery: false,
    });

    const totalGroups = await Notification.findAll({
      attributes: [[fn('DISTINCT', col('vehicle_id')), 'vehicle_id']],
      where: baseWhere,
      include: Object.keys(vehicleWhere).length > 0 ? [{
        model: Vehicle,
        as: 'vehicle',
        attributes: [],
        required: true,
        where: vehicleWhere,
      }] : [],
      raw: true,
    });

    const vehicleIds = grouped.map(g => g.vehicle_id);
    const latestNotifications = vehicleIds.length > 0
      ? await Notification.findAll({
          where: {
            type: 'idle_vehicle',
            vehicle_id: { [Op.in]: vehicleIds },
            created_at: { [Op.in]: grouped.map(g => g.get('latest_created_at')) },
          },
          include: [
            { model: Vehicle, as: 'vehicle', attributes: ['id', 'license_plate', 'device_id'], required: false },
            { model: User, as: 'driver', attributes: ['id', 'username'], required: false },
          ],
        })
      : [];

    const latestByVehicle = {};
    latestNotifications.forEach(n => {
      if (!latestByVehicle[n.vehicle_id] || new Date(n.created_at) > new Date(latestByVehicle[n.vehicle_id].created_at)) {
        latestByVehicle[n.vehicle_id] = n;
      }
    });

    const vehicles = grouped.map(g => {
      const plain = g.get({ plain: true });
      const latest = latestByVehicle[g.vehicle_id];
      return {
        vehicle_id: g.vehicle_id,
        license_plate: plain.vehicle?.license_plate || null,
        device_id: plain.vehicle?.device_id || null,
        driver: latest?.driver || null,
        latest_notification: latest || null,
        unread_count: parseInt(plain.unread_count) || 0,
        total_count: parseInt(plain.total_count) || 0,
        latest_idle_duration_hours: latest?.metadata?.idleDurationHours ? parseFloat(latest.metadata.idleDurationHours) : null,
        latest_latitude: latest?.latitude ? parseFloat(latest.latitude) : null,
        latest_longitude: latest?.longitude ? parseFloat(latest.longitude) : null,
        latest_created_at: plain.latest_created_at,
      };
    });

    const totalUnread = await Notification.count({ where: { type: 'idle_vehicle', is_read: false } });

    res.json({
      success: true,
      vehicles,
      pagination: {
        total: totalGroups.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalGroups.length / parseInt(limit)),
      },
      totalUnread,
    });
  } catch (error) {
    console.error('Error fetching idle summary:', error);
    next(error);
  }
};

/**
 * GET /api/notifications/vehicle/:vehicleId
 * Get all notifications for a specific vehicle
 */
exports.getVehicleNotifications = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Notification.findAndCountAll({
      where: { type: 'idle_vehicle', vehicle_id: vehicleId },
      include: [
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'license_plate', 'device_id'], required: false },
        { model: User, as: 'driver', attributes: ['id', 'username'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      notifications: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching vehicle notifications:', error);
    next(error);
  }
};

/**
 * PATCH /api/notifications/vehicle/:vehicleId/read
 * Mark all notifications for a specific vehicle as read
 */
exports.markVehicleAsRead = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const [updatedCount] = await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { vehicle_id: vehicleId, type: 'idle_vehicle', is_read: false } }
    );

    res.json({ success: true, updatedCount });
  } catch (error) {
    console.error('Error marking vehicle notifications as read:', error);
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    next(error);
  }
};

