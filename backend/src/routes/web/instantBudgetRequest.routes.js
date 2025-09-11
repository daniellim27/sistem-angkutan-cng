// src/routes/web/instantBudgetRequest.routes.js
const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../../middlewares/auth.middleware");
const instantBudgetController = require("../../controllers/instantBudgetRequest.controller");

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * @route   GET /api/web/budget-requests/pending
 * @desc    Get pending budget requests (returns empty since all are auto-approved)
 * @access  Private (Admin only)
 */
router.get(
  "/pending",
  checkRole(["admin", "owner"]),
  instantBudgetController.getPendingBudgetRequests
);

/**
 * @route   GET /api/web/budget-requests
 * @desc    Get all budget requests (for admin view)
 * @access  Private (Admin only)
 */
router.get(
  "/",
  checkRole(["admin", "owner"]),
  instantBudgetController.getBudgetRequests
);

module.exports = router;
