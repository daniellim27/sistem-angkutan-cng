const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../../middlewares/auth.middleware");
const budgetRequestController = require("../../controllers/budgetRequestController");

// Admin only routes for budget request management
router.get(
  "/",
  verifyToken,
  checkRole(["admin", "owner"]),
  budgetRequestController.getBudgetRequests
);
router.get(
  "/pending",
  verifyToken,
  checkRole(["admin", "owner"]),
  budgetRequestController.getPendingBudgetRequests
);

router.put(
  "/:id/approve",
  verifyToken,
  checkRole(["admin", "owner"]),
  budgetRequestController.approveBudgetRequest
);

router.put(
  "/:id/reject",
  verifyToken,
  checkRole(["admin", "owner"]),
  budgetRequestController.rejectBudgetRequest
);

router.get(
  "/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  budgetRequestController.getBudgetRequestById
);

module.exports = router;
