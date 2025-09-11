// src/routes/instantBudgetRequest.routes.js
const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const instantBudgetController = require("../controllers/instantBudgetRequest.controller");

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * @route   POST /api/budget-requests
 * @desc    Create and instantly approve a budget request
 * @access  Private (Driver only)
 */
router.post(
  "/",
  checkRole(["driver"]), // Only drivers can create budget requests
  upload.single("evidence"), // Handle file upload for evidence
  instantBudgetController.createInstantBudgetRequest
);

/**
 * @route   GET /api/budget-requests
 * @desc    Get budget requests (filtered by user role)
 * @access  Private
 */
router.get(
  "/",
  instantBudgetController.getBudgetRequests
);

module.exports = router;
