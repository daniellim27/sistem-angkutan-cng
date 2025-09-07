// backend/src/routes/vehicleExpenseRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getAllVehicleExpenseTransactions,
  createVehicleExpenseTransaction,
  updateVehicleExpenseTransaction,
  deleteVehicleExpenseTransaction,
  getVehicleExpenseCategories,
  getAllVehicles
} = require('../controllers/web/vehicleExpenseController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});

// GET /vehicle-expense-cash - Get all vehicle expense transactions
router.get('/', getAllVehicleExpenseTransactions);

// POST /vehicle-expense-cash - Create new vehicle expense transaction
router.post('/', upload.array('attachments', 5), createVehicleExpenseTransaction);

// PUT /vehicle-expense-cash/:id - Update vehicle expense transaction
router.put('/:id', upload.array('attachments', 5), updateVehicleExpenseTransaction);

// DELETE /vehicle-expense-cash/:id - Delete vehicle expense transaction
router.delete('/:id', deleteVehicleExpenseTransaction);

// GET /vehicle-expense-cash/categories - Get vehicle expense categories
router.get('/categories', getVehicleExpenseCategories);

// GET /vehicle-expense-cash/vehicles - Get all vehicles
router.get('/vehicles', getAllVehicles);

module.exports = router;
