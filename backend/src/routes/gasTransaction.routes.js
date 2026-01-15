// backend/src/routes/gasTransaction.routes.js
const express = require('express');
const router = express.Router();
const gasTransactionController = require('../controllers/gasTransactionController');
const { verifyToken, checkRole } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

/**
 * GET /api/gas-transactions/by-deposit-group/:deposit_group_id
 * Get gas transactions by deposit group (for SPBG tagihan)
 * Admin/Owner only
 */
router.get(
  '/by-deposit-group/:deposit_group_id',
  verifyToken,
  // Allow drivers to see SPBG transactions (driver UX needs history when near SPBG)
  checkRole(['admin', 'owner', 'driver']),
  gasTransactionController.getGasTransactionsByDepositGroup
);

/**
 * POST /api/gas-transactions
 * Create a gas transaction (fire-and-forget)
 * Driver only
 */
router.post(
  '/',
  verifyToken,
  checkRole(['driver']),
  upload.fields([
    { name: 'surat_jalan_photo', maxCount: 1 },
    { name: 'nota_photo', maxCount: 1 },
    { name: 'biaya_lain_photo', maxCount: 1 }
  ]),
  gasTransactionController.createGasTransaction
);

/**
 * POST /api/gas-transactions/process-nota-ocr
 * Process nota photo with OCR and return extracted data
 * Driver only
 */
router.post(
  '/process-nota-ocr',
  verifyToken,
  checkRole(['driver']),
  upload.single('nota_photo'),
  gasTransactionController.processNotaOCR
);

/**
 * GET /api/gas-transactions/by-driver
 * Get gas transactions by driver (for mobile history)
 * Driver only
 */
router.get(
  '/by-driver',
  verifyToken,
  checkRole(['driver']),
  gasTransactionController.getGasTransactionsByDriver
);

/**
 * GET /api/gas-transactions/driver-extra-expenses
 * Get all gas transactions that contain driver "biaya lain" (extra expenses)
 * Admin/Owner only (web)
 */
router.get(
  '/driver-extra-expenses',
  verifyToken,
  checkRole(['admin', 'owner']),
  gasTransactionController.getDriverExtraExpensesForAdmin
);

/**
 * POST /api/gas-transactions/:id/pay
 * Mark gas transaction as paid using SPBG balance (admin/owner only)
 * IMPORTANT: This must be defined BEFORE /:id route to avoid route matching conflicts
 */
router.post(
  '/:id/pay',
  verifyToken,
  checkRole(['admin', 'owner']),
  gasTransactionController.payGasTransaction
);

/**
 * PATCH /api/gas-transactions/:id
 * Update a gas transaction (admin/owner only)
 */
router.patch(
  '/:id',
  verifyToken,
  checkRole(['admin', 'owner']),
  gasTransactionController.updateGasTransaction
);

module.exports = router;

