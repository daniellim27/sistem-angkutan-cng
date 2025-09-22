// src/routes/customer.routes.js
const express = require("express");
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerLocations,
  getCustomerSummary,
} = require("../controllers/customer.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

// Apply authentication middleware to all routes
router.use(verifyToken);

// GET /api/customers/summary - Get customer summary statistics
router.get("/summary", getCustomerSummary);

// GET /api/customers/locations - Get customer locations for dropdown
router.get("/locations", getCustomerLocations);

// GET /api/customers/search - Search customers by name
router.get("/search", searchCustomers);

// GET /api/customers - Get all customers with pagination and search
router.get("/", getCustomers);

// GET /api/customers/:id - Get customer by ID
router.get("/:id", getCustomerById);

// POST /api/customers - Create new customer
router.post("/", createCustomer);

// PUT /api/customers/:id - Update customer
router.put("/:id", updateCustomer);

// DELETE /api/customers/:id - Delete customer
router.delete("/:id", deleteCustomer);

module.exports = router;
