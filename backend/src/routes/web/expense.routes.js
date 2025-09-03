const express = require('express');
const router = express.Router();
const driverExpenseController = require('../../controllers/driverExpenseController');
const { verifyToken, checkRole } = require('../../middlewares/auth.middleware');

/**
 * @route   GET /api/web/expenses
 * @desc    Get all driver expenses for admin view
 * @access  Private (Admin only)
 */
router.get('/', verifyToken, checkRole(['admin']), driverExpenseController.getAllExpenses);

/**
 * @route   GET /api/web/expenses/pending
 * @desc    Get all pending expenses for admin review
 * @access  Private (Admin only)
 */
router.get('/pending', verifyToken, checkRole(['admin']), driverExpenseController.getPendingExpenses);

/**
 * @route   PUT /api/web/expenses/:id/approve
 * @desc    Approve a pending expense
 * @access  Private (Admin only)
 */
router.put('/:id/approve', verifyToken, checkRole(['admin']), driverExpenseController.approveExpense);

/**
 * @route   PUT /api/web/expenses/:id/reject
 * @desc    Reject a pending expense
 * @access  Private (Admin only)
 */
router.put('/:id/reject', verifyToken, checkRole(['admin']), driverExpenseController.rejectExpense);

module.exports = router;
