// backend/src/controllers/web/vehicleExpenseController.js
const db = require('../../models');
const { CashTransaction, CashCategory, Vehicle } = db;
const { Op } = require('sequelize');

// Get all vehicle expense transactions with summary
exports.getAllVehicleExpenseTransactions = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      transaction_type, 
      category_id, 
      date_from, 
      date_to,
      search,
      account,
      vehicle_id
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = {
      // Only vehicle expense transactions (tempo and regular)
      transaction_type: {
        [Op.in]: ['debit', 'kredit', 'debit_tempo', 'kredit_tempo']
      },
      // Filter by vehicle-specific categories or add vehicle_id filter
      [Op.or]: [
        { category_id: { [Op.in]: await getVehicleExpenseCategoryIds() } },
        { vehicle_id: { [Op.ne]: null } }
      ]
    };

    // Filter by transaction type
    if (transaction_type && ['debit', 'kredit', 'debit_tempo', 'kredit_tempo'].includes(transaction_type)) {
      whereClause.transaction_type = transaction_type;
    }

    // Filter by category
    if (category_id) {
      whereClause.category_id = category_id;
    }

    // Filter by vehicle
    if (vehicle_id) {
      whereClause.vehicle_id = vehicle_id;
    }

    // Filter by date range
    if (date_from || date_to) {
      whereClause.transaction_date = {};
      if (date_from) {
        whereClause.transaction_date[Op.gte] = date_from;
      }
      if (date_to) {
        whereClause.transaction_date[Op.lte] = date_to;
      }
    }

    // Search in description, reference number, or nota number
    if (search) {
      whereClause[Op.or] = [
        { description: { [Op.iLike]: `%${search}%` } },
        { reference_number: { [Op.iLike]: `%${search}%` } },
        { no_nota: { [Op.contains]: [search] } }
      ];
    }

    if (account && account !== 'All') {
      whereClause.account = account;
    }

    // Get transactions with pagination
    const result = await CashTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: CashCategory,
          as: 'category',
          required: false
        },
        {
          model: Vehicle,
          as: 'vehicle',
          required: false,
          attributes: ['id', 'license_plate', 'type', 'capacity', 'status']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Calculate summary
    const summaryResults = await CashTransaction.findAll({
      where: whereClause,
      attributes: [
        'transaction_type',
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
      ],
      group: ['transaction_type'],
      raw: true
    });

    const totalDebit = summaryResults.find(s => s.transaction_type === 'debit')?.total || 0;
    const totalKredit = summaryResults.find(s => s.transaction_type === 'kredit')?.total || 0;
    const totalDebitTempo = summaryResults.find(s => s.transaction_type === 'debit_tempo')?.total || 0;
    const totalKreditTempo = summaryResults.find(s => s.transaction_type === 'kredit_tempo')?.total || 0;
    
    const saldo = (parseFloat(totalDebit) + parseFloat(totalDebitTempo)) - (parseFloat(totalKredit) + parseFloat(totalKreditTempo));

    // Calculate running balance
    const allFilteredTransactions = await CashTransaction.findAll({
      where: whereClause,
      order: [['created_at', 'ASC']],
      attributes: ['id', 'transaction_type', 'amount', 'created_at']
    });

    const balanceLookup = {};
    let runningBalance = 0;

    allFilteredTransactions.forEach(transaction => {
      if (transaction.transaction_type === 'debit' || transaction.transaction_type === 'debit_tempo') {
        runningBalance += parseFloat(transaction.amount);
      } else {
        runningBalance -= parseFloat(transaction.amount);
      }
      balanceLookup[transaction.id] = runningBalance;
    });

    // Add running balance to paginated results
    const enhancedTransactions = result.rows.map(transaction => {
      const transactionData = transaction.toJSON();
      return {
        ...transactionData,
        running_balance: balanceLookup[transaction.id] || 0,
        no_nota: transactionData.no_nota || []
      };
    });

    res.json({
      success: true,
      data: enhancedTransactions,
      summary: {
        total_debit: parseFloat(totalDebit),
        total_kredit: parseFloat(totalKredit),
        total_debit_tempo: parseFloat(totalDebitTempo),
        total_kredit_tempo: parseFloat(totalKreditTempo),
        saldo: saldo
      },
      pagination: {
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit)
      }
    });
  } catch (err) {
    console.error('Error in getAllVehicleExpenseTransactions:', err);
    next(err);
  }
};

// Get vehicle expense categories
const getVehicleExpenseCategoryIds = async () => {
  try {
    const categories = await CashCategory.findAll({
      where: {
        category_name: {
          [Op.in]: [
            'Bahan Bakar',
            'Servis Kendaraan',
            'Perbaikan',
            'Asuransi Kendaraan',
            'Parkir',
            'Tol',
            'Pajak Kendaraan',
            'STNK',
            'Ban',
            'Oli',
            'Spare Part',
            'Cuci Kendaraan',
            'Maintenance'
          ]
        }
      },
      attributes: ['id']
    });
    return categories.map(cat => cat.id);
  } catch (err) {
    console.error('Error getting vehicle expense categories:', err);
    return [];
  }
};

// Create new vehicle expense transaction
exports.createVehicleExpenseTransaction = async (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: 'Invalid request format' });
  }
  const transaction = await db.sequelize.transaction();
  
  try {
    const {
      transaction_type,
      category_id,
      amount,
      description,
      reference_number,
      transaction_date,
      account,
      vehicle_id,
      nota_number
    } = req.body;

    // Handle multiple file uploads
    let attachment_urls = [];
    if (req.files && req.files.length > 0) {
      attachment_urls = req.files.map(file => `uploads/receipts/${file.filename}`);
    }

    // Parse no_nota from JSON string to array
    let no_nota = [];
    if (nota_number) {
      no_nota = [nota_number];
    } else if (typeof req.body.no_nota === 'string') {
      try {
        no_nota = JSON.parse(req.body.no_nota);
      } catch (error) {
        no_nota = [];
      }
    } else if (Array.isArray(req.body.no_nota)) {
      no_nota = req.body.no_nota;
    }

    // Validation
    if (!transaction_type || !['debit', 'kredit', 'debit_tempo', 'kredit_tempo'].includes(transaction_type)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }
    if (!amount || parseFloat(amount) <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }
    if (!description || description.trim() === '') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    const cashTransaction = await CashTransaction.create({
      transaction_type,
      category_id: category_id || null,
      amount: parseFloat(amount),
      description: description.trim(),
      reference_number: reference_number || null,
      transaction_date: transaction_date || new Date(),
      account,
      vehicle_id: vehicle_id || null,
      attachment_urls: attachment_urls.length > 0 ? attachment_urls : null,
      no_nota: no_nota.length > 0 ? no_nota : null,
    }, { transaction });

    const createdTransaction = await CashTransaction.findByPk(cashTransaction.id, {
      include: [
        { model: CashCategory, as: 'category', required: false },
        { model: Vehicle, as: 'vehicle', required: false, attributes: ['id', 'license_plate', 'type', 'capacity', 'status'] }
      ],
      transaction
    });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Vehicle expense transaction created successfully',
      data: {
        ...createdTransaction.toJSON(),
        attachment_urls: createdTransaction.attachment_urls || []
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Error in createVehicleExpenseTransaction:', err);
    next(err);
  }
};

// Update vehicle expense transaction (including lunasi functionality)
exports.updateVehicleExpenseTransaction = async (req, res) => {
  const { id } = req.params;
  const {
    transaction_type,
    category_id,
    amount,
    description,
    reference_number,
    transaction_date,
    account,
    vehicle_id,
    nota_number
  } = req.body;

  let updatedNoNota = [];
  if (nota_number) {
    updatedNoNota = [nota_number];
  } else if (typeof req.body.no_nota === 'string') {
    try {
      updatedNoNota = JSON.parse(req.body.no_nota);
    } catch (error) {
      updatedNoNota = [];
    }
  } else if (Array.isArray(req.body.no_nota)) {
    updatedNoNota = req.body.no_nota;
  }

  try {
    const cashTransaction = await CashTransaction.findByPk(id);
    if (!cashTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const categoryId = category_id !== undefined ? (category_id || null) : cashTransaction.category_id;

    const existingUrls = cashTransaction.attachment_urls || [];
    const newUrls = req.files?.map(file => `uploads/receipts/${file.filename}`) || [];
    cashTransaction.attachment_urls = [...existingUrls, ...newUrls];

    const existingNoNota = cashTransaction.no_nota || [];
    const newNoNota = updatedNoNota.length > 0 ? updatedNoNota : existingNoNota;
    cashTransaction.no_nota = newNoNota;

    await cashTransaction.update({
      transaction_type: transaction_type || cashTransaction.transaction_type,
      category_id: categoryId,
      amount: amount ? parseFloat(amount) : cashTransaction.amount,
      description: description ? description.trim() : cashTransaction.description,
      reference_number: reference_number !== undefined ? reference_number : cashTransaction.reference_number,
      transaction_date: transaction_date || cashTransaction.transaction_date,
      account: account || cashTransaction.account,
      vehicle_id: vehicle_id || cashTransaction.vehicle_id,
      no_nota: newNoNota,
      attachment_urls: cashTransaction.attachment_urls
    });

    return res.status(200).json({ 
      success: true,
      message: 'Vehicle expense transaction updated successfully', 
      data: cashTransaction 
    });
  } catch (error) {
    console.error('Error in updateVehicleExpenseTransaction:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to update transaction', 
      error: error.message 
    });
  }
};

// Delete vehicle expense transaction
exports.deleteVehicleExpenseTransaction = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    if (isNaN(parseInt(id))) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID. Must be a number.'
      });
    }
    
    const cashTransaction = await CashTransaction.findByPk(parseInt(id), {
      transaction
    });
    
    if (!cashTransaction) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Vehicle expense transaction not found'
      });
    }

    await cashTransaction.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: 'Vehicle expense transaction deleted successfully'
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Error in deleteVehicleExpenseTransaction:', err);
    next(err);
  }
};

// Get vehicle expense categories
exports.getVehicleExpenseCategories = async (req, res, next) => {
  try {
    const categories = await CashCategory.findAll({
      where: {
        category_name: {
          [Op.in]: [
            'Bahan Bakar',
            'Servis Kendaraan',
            'Perbaikan',
            'Asuransi Kendaraan',
            'Parkir',
            'Tol',
            'Pajak Kendaraan',
            'STNK',
            'Ban',
            'Oli',
            'Spare Part',
            'Cuci Kendaraan',
            'Maintenance'
          ]
        }
      },
      order: [['category_name', 'ASC']]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    console.error('Error in getVehicleExpenseCategories:', err);
    next(err);
  }
};

// Get all vehicles for dropdown
exports.getAllVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.findAll({
      attributes: ['id', 'license_plate', 'type', 'capacity', 'status'],
      order: [['license_plate', 'ASC']]
    });

    res.json({
      success: true,
      data: vehicles
    });
  } catch (err) {
    console.error('Error in getAllVehicles:', err);
    next(err);
  }
};
