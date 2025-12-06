// src/controllers/customer.controller.js
const { Customer, NotaBesar, NotaBesarItem, NotaKecil, DeliveryOrder, User } = require("../models");
const { Op } = require("sequelize");

const coordinateRegex = /^-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/;

const coordinateErrorMessages = {
  BOTH_COORDS_REQUIRED: "Both latitude and longitude must be provided when specifying coordinates.",
  INVALID_COORDS: "Invalid coordinate values. Use numeric latitude and longitude.",
  LAT_OUT_OF_RANGE: "Latitude must be between -90 and 90.",
  LNG_OUT_OF_RANGE: "Longitude must be between -180 and 180.",
};

const normalizeCoordinateValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  const parsed = parseFloat(String(value).trim());
  return Number.isNaN(parsed) ? null : parsed;
};

const extractCoordinates = (locationInput, latitudeInput, longitudeInput) => {
  const hasLatitudeInput =
    latitudeInput !== undefined && latitudeInput !== null && String(latitudeInput).trim() !== "";
  const hasLongitudeInput =
    longitudeInput !== undefined && longitudeInput !== null && String(longitudeInput).trim() !== "";

  if (hasLatitudeInput || hasLongitudeInput) {
    if (!hasLatitudeInput || !hasLongitudeInput) {
      return { error: "BOTH_COORDS_REQUIRED" };
    }

    const lat = normalizeCoordinateValue(latitudeInput);
    const lng = normalizeCoordinateValue(longitudeInput);

    if (lat === null || lng === null) {
      return { error: "INVALID_COORDS" };
    }
    if (lat < -90 || lat > 90) {
      return { error: "LAT_OUT_OF_RANGE" };
    }
    if (lng < -180 || lng > 180) {
      return { error: "LNG_OUT_OF_RANGE" };
    }

    return { latitude: lat, longitude: lng, source: "explicit" };
  }

  if (locationInput && typeof locationInput === "string") {
    const trimmed = locationInput.trim();
    if (coordinateRegex.test(trimmed)) {
      const [latStr, lngStr] = trimmed.split(",");
      const lat = normalizeCoordinateValue(latStr);
      const lng = normalizeCoordinateValue(lngStr);

      if (lat === null || lng === null) {
        return { error: "INVALID_COORDS" };
      }
      if (lat < -90 || lat > 90) {
        return { error: "LAT_OUT_OF_RANGE" };
      }
      if (lng < -180 || lng > 180) {
        return { error: "LNG_OUT_OF_RANGE" };
      }

      return { latitude: lat, longitude: lng, source: "location_field" };
    }
  }

  return { source: null };
};

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
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Validate sort fields
    const allowedSortFields = ["customer_name", "location", "phone", "nota_besar", "nota_kecil", "created_at"];
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
    const {
      customer_name,
      location,
      phone,
      nota_besar = 0,
      nota_kecil = 0,
      latitude,
      longitude,
    } = req.body;

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

    const coordinateResult = extractCoordinates(location, latitude, longitude);
    if (coordinateResult.error) {
      return res.status(400).json({
        success: false,
        message: coordinateErrorMessages[coordinateResult.error] || "Invalid coordinates provided",
      });
    }

    const customerPayload = {
      customer_name: customer_name.trim(),
      location: location.trim(),
      phone: phone ? phone.trim() : null,
      nota_besar: parsedNotaBesar,
      nota_kecil: parsedNotaKecil,
    };

    if (
      coordinateResult.latitude !== undefined &&
      coordinateResult.longitude !== undefined
    ) {
      customerPayload.latitude = coordinateResult.latitude;
      customerPayload.longitude = coordinateResult.longitude;
    } else {
      // Try to auto-geocode if coordinates not provided
      try {
        const { scrapeLocationCoordinates } = require('../utils/locationScraper');
        const coords = await scrapeLocationCoordinates(location.trim());
        if (coords && coords.lat && coords.lng) {
          customerPayload.latitude = coords.lat;
          customerPayload.longitude = coords.lng;
          console.log(`✅ Auto-geocoded customer location: ${location.trim()} -> ${coords.lat}, ${coords.lng}`);
        }
      } catch (geocodeError) {
        // Non-fatal: customer will be created without coordinates
        console.warn(`⚠️ Could not auto-geocode location "${location.trim()}":`, geocodeError.message);
      }
    }

    const customer = await Customer.create(customerPayload);

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
    const {
      customer_name,
      location,
      phone,
      nota_besar,
      nota_kecil,
      latitude,
      longitude,
    } = req.body;

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

    const coordinateResult = extractCoordinates(location, latitude, longitude);
    if (coordinateResult.error) {
      return res.status(400).json({
        success: false,
        message: coordinateErrorMessages[coordinateResult.error] || "Invalid coordinates provided",
      });
    }

    // Update customer
    const updatePayload = {
      customer_name: customer_name.trim(),
      location: location.trim(),
      phone: phone ? phone.trim() : null,
      nota_besar: parsedNotaBesar,
      nota_kecil: parsedNotaKecil,
    };

    if (
      coordinateResult.latitude !== undefined &&
      coordinateResult.longitude !== undefined
    ) {
      updatePayload.latitude = coordinateResult.latitude;
      updatePayload.longitude = coordinateResult.longitude;
    }

    await customer.update(updatePayload);

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

// GET /api/customers/locations-with-coords - Get customer locations with coordinates for map display
const getCustomerLocationsWithCoords = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      attributes: ['id', 'customer_name', 'location', 'latitude', 'longitude'],
      where: {
        latitude: { [Op.not]: null },
        longitude: { [Op.not]: null }
      },
      order: [['customer_name', 'ASC']]
    });

    const locations = customers.map(customer => ({
      id: customer.id,
      customer_name: customer.customer_name,
      location: customer.location,
      latitude: parseFloat(customer.latitude),
      longitude: parseFloat(customer.longitude),
      display_name: `${customer.customer_name} - ${customer.location}`
    }));

    res.json({
      success: true,
      data: locations,
      count: locations.length
    });
  } catch (error) {
    console.error("Error fetching customer locations with coordinates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer locations with coordinates",
      error: error.message,
    });
  }
};

// POST /api/customers/update-coordinates - Update customers without coordinates using geocoding
const updateCustomerCoordinates = async (req, res) => {
  try {
    const { updateCustomersWithCoordinates } = require('../../scripts/update_customer_coordinates');
    const result = await updateCustomersWithCoordinates();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          total: result.total,
          updated: result.updated,
          failed: result.failed
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to update customer coordinates",
        error: result.error
      });
    }
  } catch (error) {
    console.error("Error updating customer coordinates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer coordinates",
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

// GET /api/customers/:id/nota-besars - Get all nota besars for a customer
// GET /api/customers/:id/nota-besars - UPDATED FOR NEW SCHEMA
const getCustomerNotaBesars = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify customer exists
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Get all nota besars for this customer
    const notaBesars = await NotaBesar.findAll({
      where: { customer_id: id },
      include: [
        {
          model: DeliveryOrder,
          as: 'deliveryOrder',
          attributes: ['id', 'do_number', 'status']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'role']
        },
        {
          model: NotaBesarItem,
          as: 'items',
          include: [
            {
              model: NotaKecil,
              as: 'notaKecil',
              attributes: [
                'id', 
                'customer_name', 
                'customer_location_index', 
                'stan_awal', 
                'current_stan', 
                'stan_akhir', 
                'pressure_inlet', 
                'pressure_outlet', 
                'temperature',
                'Vt', 
                'k', 
                'V',
                'ocr_confidence_avg',
                'created_at'
              ]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate totals
    const confirmedNotaBesars = notaBesars.filter(nb => nb.status === 'confirmed');
    const totalPrice = confirmedNotaBesars.reduce((sum, nb) => sum + parseFloat(nb.total_price || 0), 0);
    const totalVolume = confirmedNotaBesars.reduce((sum, nb) => sum + parseFloat(nb.total_volume || 0), 0);

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          customer_name: customer.customer_name,
          location: customer.location,
          nota_besar: customer.nota_besar,
          nota_kecil: customer.nota_kecil
        },
        notaBesars,
        summary: {
          total_nota_besars: notaBesars.length,
          confirmed_nota_besars: confirmedNotaBesars.length,
          total_price: totalPrice,
          total_volume: totalVolume
        }
      },
    });
  } catch (error) {
    console.error("Error fetching customer nota besars:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer nota besars",
      error: error.message,
    });
  }
};

// GET /api/customers/:id/nota-kecils - Get all nota kecils from confirmed nota besars for a customer
const getCustomerNotaKecils = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify customer exists
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Get all nota kecils from confirmed nota besars for this customer
    const notaKecils = await NotaBesarItem.findAll({
      include: [
        {
          model: NotaBesar,
          as: 'notaBesar',
          where: { 
            customer_id: id,
            status: 'confirmed'
          },
          attributes: ['id', 'total_volume', 'total_price', 'gas_price_per_m3', 'status', 'created_at'],
          include: [
            {
              model: DeliveryOrder,
              as: 'deliveryOrder',
              attributes: ['id', 'do_number']
            }
          ]
        },
        {
          model: NotaKecil,
          as: 'notaKecil',
          attributes: [
            'id', 
            'customer_name', 
            'customer_address', 
            'customer_location_index',
            // ✅ NEW SCHEMA FIELDS
            'stan_awal', 
            'current_stan', 
            'stan_akhir', 
            'pressure_inlet', 
            'pressure_outlet', 
            'temperature',
            // Backward compatibility (still works)
            'tekanan_operasi',
            'temperatur_operasi',
            'Vt', 
            'k', 
            'V', 
            'volume_delta',
            'ocr_confidence_avg',
            'ocr_processing_status',
            'cctv_session_id',
            'screenshots_count',
            'ocr_success_count',
            'created_at'
          ]
        }
      ],
      order: [[{ model: NotaBesar, as: 'notaBesar' }, 'created_at', 'DESC']]
    });

    // Calculate totals
    const totalVolume = notaKecils.reduce((sum, item) => {
      return sum + parseFloat(item.volume_m3 || 0);
    }, 0);

    const totalPrice = notaKecils.reduce((sum, item) => {
      return sum + parseFloat(item.price || 0);
    }, 0);

    // Group by nota besar
    const groupedByNotaBesar = notaKecils.reduce((acc, item) => {
      const notaBesarId = item.notaBesar.id;
      if (!acc[notaBesarId]) {
        acc[notaBesarId] = {
          notaBesar: item.notaBesar,
          items: []
        };
      }
      acc[notaBesarId].items.push({
        id: item.id,
        volume_m3: item.volume_m3,
        price: item.price,
        notaKecil: {
          ...item.notaKecil.dataValues,
          // ✅ PRIORITIZE NEW FIELDS, fallback to old ones
          pressure: item.notaKecil.pressure_inlet || item.notaKecil.tekanan_operasi || null,
          temperature: item.notaKecil.temperature || item.notaKecil.temperatur_operasi || null,
          stan_final: item.notaKecil.current_stan || item.notaKecil.stan_akhir || null
        }
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          customer_name: customer.customer_name,
          location: customer.location,
          nota_besar: customer.nota_besar,
          nota_kecil: customer.nota_kecil
        },
        notaKecils: Object.values(groupedByNotaBesar),
        summary: {
          total_nota_kecils: notaKecils.length,
          total_volume: totalVolume,
          total_price: totalPrice,
          from_nota_besars: Object.keys(groupedByNotaBesar).length
        }
      },
    });
  } catch (error) {
    console.error("Error fetching customer nota kecils:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer nota kecils",
      error: error.message,
    });
  }
};

// POST /api/customers/recalculate-balances - Recalculate balances for all customers
const recalculateCustomerBalances = async (req, res) => {
  try {
    console.log('🔄 Starting customer balance recalculation...');

    // Get all customers with their confirmed nota besars
    const customers = await Customer.findAll({
      include: [
        {
          model: NotaBesar,
          as: 'notaBesars',
          where: { status: 'confirmed' },
          required: false,
          attributes: ['id', 'total_price', 'total_volume']
        }
      ]
    });

    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];

    for (const customer of customers) {
      // Calculate totals from confirmed nota besars
      const totalNotaBesar = customer.notaBesars.reduce((sum, nb) => {
        return sum + parseFloat(nb.total_price || 0);
      }, 0);

      const totalNotaKecil = customer.notaBesars.reduce((sum, nb) => {
        return sum + parseFloat(nb.total_volume || 0);
      }, 0);

      // Check if update is needed
      const currentNotaBesar = parseFloat(customer.nota_besar || 0);
      const currentNotaKecil = parseFloat(customer.nota_kecil || 0);

      if (currentNotaBesar !== totalNotaBesar || currentNotaKecil !== totalNotaKecil) {
        // Update customer balances
        await customer.update({
          nota_besar: totalNotaBesar,
          nota_kecil: totalNotaKecil,
          updated_at: new Date()
        });

        updatedCount++;
        updates.push({
          customer_id: customer.id,
          customer_name: customer.customer_name,
          old_nota_besar: currentNotaBesar,
          new_nota_besar: totalNotaBesar,
          old_nota_kecil: currentNotaKecil,
          new_nota_kecil: totalNotaKecil,
          confirmed_nota_besars: customer.notaBesars.length
        });

        console.log(`  ✅ Updated: ${customer.customer_name}`);
        console.log(`     Nota Besar: Rp ${currentNotaBesar.toLocaleString('id-ID')} → Rp ${totalNotaBesar.toLocaleString('id-ID')}`);
        console.log(`     Nota Kecil: ${currentNotaKecil.toFixed(2)} m³ → ${totalNotaKecil.toFixed(2)} m³`);
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Recalculation complete: ${updatedCount} updated, ${skippedCount} unchanged`);

    res.json({
      success: true,
      message: `Successfully recalculated balances for ${updatedCount} customers`,
      data: {
        total_customers: customers.length,
        updated: updatedCount,
        unchanged: skippedCount,
        updates: updates
      }
    });

  } catch (error) {
    console.error("Error recalculating customer balances:", error);
    res.status(500).json({
      success: false,
      message: "Failed to recalculate customer balances",
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
  getCustomerLocationsWithCoords,
  updateCustomerCoordinates,
  getCustomerSummary,
  getCustomerNotaBesars,
  getCustomerNotaKecils,
  recalculateCustomerBalances,
};
