const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');

// All notification routes require authentication and admin/owner role
router.use(verifyToken);
router.use(checkRole(['admin', 'owner']));

/**
 * GET /api/notifications
 * Get all notifications (with pagination and filters)
 */
router.get('/', notificationController.getNotifications);

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * GET /api/notifications/idle-summary
 * Get idle vehicle notifications grouped by vehicle
 */
router.get('/idle-summary', notificationController.getIdleSummary);

/**
 * GET /api/notifications/vehicle/:vehicleId
 * Get all notifications for a specific vehicle
 */
router.get('/vehicle/:vehicleId', notificationController.getVehicleNotifications);

/**
 * PATCH /api/notifications/vehicle/:vehicleId/read
 * Mark all notifications for a specific vehicle as read
 */
router.patch('/vehicle/:vehicleId/read', notificationController.markVehicleAsRead);

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.patch('/mark-all-read', notificationController.markAllAsRead);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;

