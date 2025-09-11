// src/routes/web/user.routes.js
const express = require('express');
const router = express.Router();
const webUserController = require('../../controllers/web/userController');
const { verifyToken, checkRole } = require('../../middlewares/auth.middleware');

// All routes are protected
router.use(verifyToken);

// Get users with filtering (role, status, search)
router.get('/', checkRole(['admin', 'owner']), webUserController.getUsers);

// Get available drivers (not assigned to active deliveries)
router.get('/drivers/available', checkRole(['admin', 'owner']), webUserController.getAvailableDrivers);

// Get user profile by ID
router.get('/:id', checkRole(['admin', 'owner']), webUserController.getUserProfile);

module.exports = router;
