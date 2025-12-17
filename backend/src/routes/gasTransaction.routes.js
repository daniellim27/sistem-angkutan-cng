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

module.exports = router;

