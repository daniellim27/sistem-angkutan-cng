// backend/src/routes/web/cash-coordinator.routes.js
const express = require('express');
const router = express.Router();
const cashCoordinatorController = require('../../controllers/web/cashCoordinatorController');
const { verifyToken } = require('../../middlewares/auth.middleware'); // CHANGE: Use destructuring
const upload = require('../../middlewares/upload.middleware'); // Import the upload middleware

// Apply auth middleware to all routes
router.use(verifyToken); // CHANGE: Use verifyToken instead of authMiddleware

// Cash categories route MUST come BEFORE the /:id route
router.get('/categories', cashCoordinatorController.getCashCategories);

// Cash coordinator transactions routes
router.get('/transactions', cashCoordinatorController.getAllCashCoordinatorTransactions);
router.get('/tempo-transactions', cashCoordinatorController.getAllTempoTransactions);
// router.post('/transactions', upload.single('attachment'), cashCoordinatorController.createCashCoordinatorTransaction);
router.get('/transactions/:id', cashCoordinatorController.getCashCoordinatorTransactionById);
// router.put('/transactions/:id', cashCoordinatorController.updateCashCoordinatorTransaction);
router.delete('/transactions/:id', cashCoordinatorController.deleteCashCoordinatorTransaction);

router.post(
  '/transactions', 
  upload.array('attachments', 5), // Matches frontend field name
  cashCoordinatorController.createCashCoordinatorTransaction
);
router.put('/transactions/:id', upload.array('attachments', 5), cashCoordinatorController.updateCashCoordinatorTransaction);
router.get('/accounts', cashCoordinatorController.getUniqueAccounts);

module.exports = router;
