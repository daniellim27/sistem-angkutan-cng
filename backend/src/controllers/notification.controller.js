const { Notification, Vehicle, User } = require('../models');
const { Op } = require('sequelize');

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

