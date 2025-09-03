const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const { verifyToken, checkRole } = require("../middlewares/auth.middleware");
const budgetRequestController = require("../controllers/budgetRequestController");

// Driver routes
router.post(
  "/",
  verifyToken,
  checkRole(["driver"]),
  upload.single("evidence"), // Optional evidence file
  budgetRequestController.createBudgetRequest
);

router.get(
  "/",
  verifyToken,
  checkRole(["driver"]),
  budgetRequestController.getBudgetRequests
);

router.get(
  "/:id",
  verifyToken,
  checkRole(["driver", "admin", "owner"]),
  budgetRequestController.getBudgetRequestById
);

router.delete(
  "/:id",
  verifyToken,
  checkRole(["driver", "admin", "owner"]),
  budgetRequestController.deleteBudgetRequest
);

module.exports = router;
