// src/controllers/customer.controller.js
const { Customer } = require("../models");
const { Op } = require("sequelize");

// GET /api/customers - Get all customers with pagination and search
const getCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereConditions = {};
    if (search) {
      whereConditions[Op.or] = [
        { customer_name: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Validate sort fields
    const allowedSortFields = ["customer_name", "location", "nota_besar", "nota_kecil", "created_at"];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
    const validSortOrder = ["ASC", "DESC"].includes(sortOrder.toUpperCase()) 
      ? sortOrder.toUpperCase() 
      : "DESC";

    const { rows: customers, count: total } = await Customer.findAndCountAll({
      where: whereConditions,
      order: [[validSortBy, validSortOrder]],
      limit: parseInt(limit),
      offset: offset,
    });

    // Calculate totals for summary
    const totalNotaBesar = customers.reduce((sum, customer) => sum + parseFloat(customer.nota_besar || 0), 0);
    const totalNotaKecil = customers.reduce((sum, customer) => sum + parseFloat(customer.nota_kecil || 0), 0);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit)),
        },
        summary: {
          total_customers: total,
          total_nota_besar: totalNotaBesar,
          total_nota_kecil: totalNotaKecil,
          grand_total: totalNotaBesar + totalNotaKecil,
        }
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

// GET /api/customers/:id - Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

// POST /api/customers - Create new customer
const createCustomer = async (req, res) => {
  try {
    const { customer_name, location, nota_besar = 0, nota_kecil = 0 } = req.body;

    // Validation
    if (!customer_name || !location) {
      return res.status(400).json({
        success: false,
        message: "Customer name and location are required",
        errors: {
          customer_name: !customer_name,
          location: !location,
        },
      });
    }

    // Check if customer with same name already exists
    const existingCustomer = await Customer.findOne({
      where: {
        customer_name: {
          [Op.iLike]: customer_name.trim()
        }
      }
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Customer with this name already exists",
      });
    }

    // Validate nota amounts
    const parsedNotaBesar = parseFloat(nota_besar) || 0;
    const parsedNotaKecil = parseFloat(nota_kecil) || 0;

    if (parsedNotaBesar < 0 || parsedNotaKecil < 0) {
      return res.status(400).json({
        success: false,
        message: "Nota amounts cannot be negative",
      });
    }

    const customer = await Customer.create({
      customer_name: customer_name.trim(),
      location: location.trim(),
      nota_besar: parsedNotaBesar,
      nota_kecil: parsedNotaKecil,
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    
    // Handle validation errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

// PUT /api/customers/:id - Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, location, nota_besar, nota_kecil } = req.body;

    const customer = await Customer.findByPk(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Validation
    if (!customer_name || !location) {
      return res.status(400).json({
        success: false,
        message: "Customer name and location are required",
        errors: {
          customer_name: !customer_name,
          location: !location,
        },
      });
    }

    // Check if another customer with same name already exists
    const existingCustomer = await Customer.findOne({
      where: {
        customer_name: {
          [Op.iLike]: customer_name.trim()
        },
        id: { [Op.ne]: id } // Exclude current customer
      }
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Another customer with this name already exists",
      });
    }

    // Validate nota amounts
    const parsedNotaBesar = parseFloat(nota_besar) || 0;
    const parsedNotaKecil = parseFloat(nota_kecil) || 0;

    if (parsedNotaBesar < 0 || parsedNotaKecil < 0) {
      return res.status(400).json({
        success: false,
        message: "Nota amounts cannot be negative",
      });
    }

    // Update customer
    await customer.update({
      customer_name: customer_name.trim(),
      location: location.trim(),
      nota_besar: parsedNotaBesar,
      nota_kecil: parsedNotaKecil,
    });

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    
    // Handle validation errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update customer",
      error: error.message,
    });
  }
};

// DELETE /api/customers/:id - Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findByPk(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    await customer.destroy();

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: error.message,
    });
  }
};

// GET /api/customers/search - Search customers by name
const searchCustomers = async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const customers = await Customer.findByName(query);

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Error searching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search customers",
      error: error.message,
    });
  }
};

// GET /api/customers/locations - Get customer locations for dropdown
const getCustomerLocations = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      attributes: ['id', 'customer_name', 'location'],
      order: [['customer_name', 'ASC']]
    });

    const locations = customers.map(customer => ({
      id: customer.id,
      customer_name: customer.customer_name,
      location: customer.location,
      display_name: `${customer.customer_name} - ${customer.location}`
    }));

    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("Error fetching customer locations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer locations",
      error: error.message,
    });
  }
};

// GET /api/customers/summary - Get customer summary statistics
const getCustomerSummary = async (req, res) => {
  try {
    const totalCustomers = await Customer.count();
    
    const notaSums = await Customer.findAll({
      attributes: [
        [Customer.sequelize.fn('SUM', Customer.sequelize.col('nota_besar')), 'total_nota_besar'],
        [Customer.sequelize.fn('SUM', Customer.sequelize.col('nota_kecil')), 'total_nota_kecil'],
        [Customer.sequelize.fn('AVG', Customer.sequelize.col('nota_besar')), 'avg_nota_besar'],
        [Customer.sequelize.fn('AVG', Customer.sequelize.col('nota_kecil')), 'avg_nota_kecil'],
      ],
      raw: true
    });

    const summary = {
      total_customers: totalCustomers,
      total_nota_besar: parseFloat(notaSums[0]?.total_nota_besar || 0),
      total_nota_kecil: parseFloat(notaSums[0]?.total_nota_kecil || 0),
      avg_nota_besar: parseFloat(notaSums[0]?.avg_nota_besar || 0),
      avg_nota_kecil: parseFloat(notaSums[0]?.avg_nota_kecil || 0),
    };

    summary.grand_total = summary.total_nota_besar + summary.total_nota_kecil;

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching customer summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer summary",
      error: error.message,
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerLocations,
  getCustomerSummary,
};
