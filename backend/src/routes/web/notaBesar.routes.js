const express = require("express");
const router = express.Router();
const notaBesarController = require("../../controllers/notaBesar.controller");
const { verifyToken, checkRole } = require("../../middlewares/auth.middleware");

// Apply authentication to all routes
router.use(verifyToken);

// Get all nota besars
router.get(
  '/nota-besars',
  checkRole(['admin', 'owner', 'driver']),
  notaBesarController.getAllNotaBesars
);

// Get specific nota besar detail
router.get(
  '/nota-besars/:id',
  checkRole(['admin', 'owner', 'driver']),
  notaBesarController.getNotaBesarDetail
);

// Calculate and create nota besar from selected nota kecils
router.post(
  '/delivery-orders/:id/nota-besar/calculate',
  checkRole(['admin', 'owner']), // Only admin and owner can create nota besar
  notaBesarController.calculateNotaBesar
);

// Get all nota besars for a delivery order
router.get(
  '/delivery-orders/:id/nota-besars',
  checkRole(['admin', 'owner', 'driver']),
  notaBesarController.getNotaBesars
);

// Update nota besar status
router.put(
  '/nota-besars/:id/status',
  checkRole(['admin', 'owner']), // Only admin and owner can update status
  notaBesarController.updateNotaBesarStatus
);

// Delete nota besar (only if draft)
router.delete(
  '/nota-besars/:id',
  checkRole(['admin', 'owner']), // Only admin and owner can delete
  notaBesarController.deleteNotaBesar
);

module.exports = router;

