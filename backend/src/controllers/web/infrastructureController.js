// src/controllers/web/infrastructureController.js
const db = require("../../models");
const {
  InfrastructureItem,
  InfrastructureCategory,
  InfrastructureLocation,
  InfrastructureTransaction,
  InfrastructureBatch,
  sequelize,
} = db;
const { Op } = require("sequelize");
const infrastructureCashIntegration = require("../../services/infrastructureCashIntegration");

// Helper function to generate batch number
const generateBatchNumber = async (itemId, itemCode) => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `${itemCode || "INF"}-${today}`;

  const lastBatch = await InfrastructureBatch.findOne({
    where: {
      item_id: itemId,
      batch_number: {
        [Op.like]: `${prefix}-%`,
      },
    },
    order: [["batch_number", "DESC"]],
  });

  let sequence = 1;
  if (lastBatch) {
    const lastSequence = parseInt(lastBatch.batch_number.split("-").pop()) || 0;
    sequence = lastSequence + 1;
  }

  return `${prefix}-${sequence.toString().padStart(3, "0")}`;
};

// Helper function to calculate current quantity from batches
const calculateCurrentQuantity = async (itemId) => {
  const result = await InfrastructureBatch.findOne({
    where: { item_id: itemId },
    attributes: [
      [sequelize.fn("SUM", sequelize.col("quantity")), "total_quantity"],
      [
        sequelize.fn("SUM", sequelize.literal("quantity * unit_price")),
        "total_value",
      ],
    ],
  });

  const totalQuantity = parseFloat(result?.dataValues?.total_quantity) || 0;
  const totalValue = parseFloat(result?.dataValues?.total_value) || 0;
  const averagePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;

  return { totalQuantity, totalValue, averagePrice };
};

// Get all infrastructure items with calculated current quantity
const getAllInfrastructureItems = async (req, res, next) => {
  try {
    const {
      category_id,
      location_id,
      low_quantity,
      search,
      page = 1,
      limit = 10,
      startDate,
      endDate,
      expired_soon,
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (category_id) whereClause.category_id = category_id;
    if (location_id) whereClause.location_id = location_id;
    if (search) {
      whereClause[Op.or] = [
        { item_name: { [Op.iLike]: `%${search}%` } },
        { item_code: { [Op.iLike]: `%${search}%` } },
        { supplier: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const result = await InfrastructureItem.findAndCountAll({
      where: whereClause,
      include: [
        { model: InfrastructureCategory, as: "category", required: false },
        { model: InfrastructureLocation, as: "location", required: false },
        {
          model: InfrastructureBatch,
          as: "batches",
          attributes: [
            "id",
            "batch_number",
            "quantity",
            "unit_price",
            "purchase_date",
            "expired_date",
          ],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: offset,
    });

    const enhancedItems = await Promise.all(
      result.rows.map(async (item) => {
        const itemData = item.toJSON();
        itemData.batches = (itemData.batches || []).filter(
          (batch) => batch.quantity > 0
        );
        const { totalQuantity, totalValue, averagePrice } =
          await calculateCurrentQuantity(item.id);

        // Check if item is expired or expiring soon
        const today = new Date();
        const isExpired = itemData.expired_date && new Date(itemData.expired_date) < today;
        const isExpiringSoon = itemData.expired_date && 
          new Date(itemData.expired_date) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) &&
          new Date(itemData.expired_date) > today;

        return {
          ...itemData,
          current_quantity: totalQuantity,
          total_value: totalValue,
          average_unit_price: averagePrice,
          is_low_quantity: totalQuantity <= parseFloat(item.min_quantity),
          quantity_status:
            totalQuantity <= 0
              ? "out_of_stock"
              : totalQuantity <= parseFloat(item.min_quantity)
              ? "low_quantity"
              : "adequate",
          is_expired: isExpired,
          is_expiring_soon: isExpiringSoon,
        };
      })
    );

    let filteredItems = enhancedItems;

    // Apply additional filters
    if (low_quantity === "true") {
      filteredItems = filteredItems.filter((item) => item.is_low_quantity);
    }

    if (expired_soon === "true") {
      filteredItems = filteredItems.filter((item) => item.is_expiring_soon);
    }

    res.json({
      data: filteredItems,
      pagination: {
        totalItems: low_quantity === "true" || expired_soon === "true" ? filteredItems.length : result.count,
        totalPages: Math.ceil(
          (low_quantity === "true" || expired_soon === "true" ? filteredItems.length : result.count) / limit
        ),
        currentPage: parseInt(page),
      },
    });
  } catch (err) {
    console.error("Error in getAllInfrastructureItems:", err);
    next(err);
  }
};

// Create new infrastructure item with initial batch
const createInfrastructureItem = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      category_id,
      location_id,
      item_code,
      item_name,
      supplier,
      unit,
      min_quantity,
      unit_price,
      initial_quantity,
      expired_date,
      notes,
    } = req.body;

    const infrastructureItem = await InfrastructureItem.create({
      category_id: category_id || null,
      location_id: location_id || null,
      item_code,
      item_name,
      supplier,
      unit: unit || "Pcs",
      min_quantity: parseFloat(min_quantity) || 0,
      expired_date: expired_date || null,
      notes,
    }, { transaction });

    if (initial_quantity && parseFloat(initial_quantity) > 0) {
      const batchNumber = await generateBatchNumber(infrastructureItem.id, item_code);
      const quantity = parseFloat(initial_quantity);
      const price = parseFloat(unit_price) || 0;

      const initialBatch = await InfrastructureBatch.create({
        item_id: infrastructureItem.id,
        batch_number: batchNumber,
        quantity: quantity,
        original_quantity: quantity,
        unit_price: price,
        supplier,
        expired_date: expired_date || null,
        notes: "Initial infrastructure batch",
      }, { transaction });

      const infrastructureTransaction = await InfrastructureTransaction.create({
        item_id: infrastructureItem.id,
        batch_id: initialBatch.id,
        transaction_type: "in",
        quantity: quantity,
        unit_price: price,
        total_amount: quantity * price,
        reference_type: "initial_infrastructure",
        notes: `Initial infrastructure creation (Batch: ${batchNumber})`,
      }, { transaction });

      // Create cash book entry for infrastructure transaction
      if (infrastructureItem.location_id) {
        await infrastructureCashIntegration.createInfrastructureCashEntry({
          infrastructureItemId: infrastructureItem.id,
          locationId: infrastructureItem.location_id,
          transactionType: "in",
          quantity: quantity,
          unitPrice: price,
          totalAmount: quantity * price,
          description: `Initial infrastructure: ${infrastructureItem.item_name} (${quantity} ${infrastructureItem.unit})`,
          referenceNumber: `INF-INIT-${infrastructureItem.id}-${Date.now()}`,
          transactionDate: new Date(),
        }, transaction);
      }

      await infrastructureItem.update({
        average_unit_price: price,
        total_value: quantity * price,
      }, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Infrastructure item created successfully",
      data: infrastructureItem,
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Error in createInfrastructureItem:", err);
    next(err);
  }
};

// Get infrastructure item by ID
const getInfrastructureItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid infrastructure item ID. Must be a number.",
      });
    }

    const infrastructureItem = await InfrastructureItem.findByPk(parseInt(id), {
      include: [
        { model: InfrastructureCategory, as: "category", required: false },
        { model: InfrastructureLocation, as: "location", required: false },
        {
          model: InfrastructureBatch,
          as: "batches",
          where: { quantity: { [Op.gt]: 0 } },
          required: false,
          order: [["purchase_date", "ASC"]],
        },
      ],
    });

    if (!infrastructureItem) {
      return res.status(404).json({
        success: false,
        message: "Infrastructure item not found",
      });
    }

    const { totalQuantity, totalValue, averagePrice } =
      await calculateCurrentQuantity(id);

    res.json({
      success: true,
      data: {
        ...infrastructureItem.toJSON(),
        current_quantity: totalQuantity,
        total_value: totalValue,
        average_unit_price: averagePrice,
        is_low_quantity: totalQuantity <= parseFloat(infrastructureItem.min_quantity),
      },
    });
  } catch (err) {
    console.error("Error in getInfrastructureItemById:", err);
    next(err);
  }
};

// Update infrastructure item
const updateInfrastructureItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const infrastructureItem = await InfrastructureItem.findByPk(id);

    if (!infrastructureItem) {
      return res.status(404).json({
        success: false,
        message: "Infrastructure item not found",
      });
    }

    await infrastructureItem.update(req.body);
    res.json({
      success: true,
      message: "Infrastructure item updated successfully",
      data: infrastructureItem,
    });
  } catch (err) {
    console.error("Error in updateInfrastructureItem:", err);
    next(err);
  }
};

// FIFO Infrastructure Adjustment
const adjustInfrastructure = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      itemId,
      adjustmentType,
      quantity,
      unit_price,
      supplier,
      notes,
      create_new_batch,
      expired_date,
    } = req.body;

    if (!itemId || !adjustmentType || !quantity || parseFloat(quantity) <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Item ID, adjustment type, and positive quantity are required",
      });
    }

    const infrastructureItem = await InfrastructureItem.findByPk(itemId, { transaction });
    if (!infrastructureItem) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Infrastructure item not found",
      });
    }

    const adjustmentQuantity = parseFloat(quantity);
    const price = parseFloat(unit_price) || 0;

    if (adjustmentType === "add") {
      let shouldCreateNewBatch = create_new_batch;
      let targetBatch = null;

      if (!shouldCreateNewBatch && price > 0) {
        const existingBatch = await InfrastructureBatch.findOne({
          where: {
            item_id: itemId,
            unit_price: price,
            expired_date: expired_date || null,
          },
          order: [["created_at", "DESC"]],
          transaction,
        });

        shouldCreateNewBatch = !existingBatch;
        targetBatch = existingBatch;
      }

      if (shouldCreateNewBatch) {
        const batchNumber = await generateBatchNumber(
          itemId,
          infrastructureItem.item_code
        );

        const newBatch = await InfrastructureBatch.create({
          item_id: itemId,
          batch_number: batchNumber,
          quantity: adjustmentQuantity,
          original_quantity: adjustmentQuantity,
          unit_price: price,
          supplier,
          expired_date: expired_date || null,
          notes,
        }, { transaction });

        const infrastructureTransaction = await InfrastructureTransaction.create({
          item_id: itemId,
          batch_id: newBatch.id,
          transaction_type: "in",
          quantity: adjustmentQuantity,
          unit_price: price,
          total_amount: adjustmentQuantity * price,
          reference_type: "adjustment",
          notes: notes || `Infrastructure adjustment - increase (New batch: ${batchNumber})`,
        }, { transaction });

        // Create cash book entry for infrastructure adjustment
        if (infrastructureItem.location_id) {
          await infrastructureCashIntegration.createInfrastructureCashEntry({
            infrastructureItemId: itemId,
            locationId: infrastructureItem.location_id,
            transactionType: "in",
            quantity: adjustmentQuantity,
            unitPrice: price,
            totalAmount: adjustmentQuantity * price,
            description: `Infrastructure adjustment: ${infrastructureItem.item_name} +${adjustmentQuantity} ${infrastructureItem.unit}`,
            referenceNumber: `INF-ADJ-${itemId}-${Date.now()}`,
            transactionDate: new Date(),
          }, transaction);
        }

      } else {
        if (targetBatch) {
          await targetBatch.update({
            quantity: parseFloat(targetBatch.quantity) + adjustmentQuantity,
            original_quantity: parseFloat(targetBatch.original_quantity) + adjustmentQuantity,
          }, { transaction });

          const infrastructureTransaction = await InfrastructureTransaction.create({
            item_id: itemId,
            batch_id: targetBatch.id,
            transaction_type: "in",
            quantity: adjustmentQuantity,
            unit_price: price,
            total_amount: adjustmentQuantity * price,
            reference_type: "adjustment",
            notes: notes || `Infrastructure adjustment - increase (Added to batch: ${targetBatch.batch_number})`,
          }, { transaction });

          // Create cash book entry for infrastructure adjustment
          if (infrastructureItem.location_id) {
            await infrastructureCashIntegration.createInfrastructureCashEntry({
              infrastructureItemId: itemId,
              locationId: infrastructureItem.location_id,
              transactionType: "in",
              quantity: adjustmentQuantity,
              unitPrice: price,
              totalAmount: adjustmentQuantity * price,
              description: `Infrastructure adjustment: ${infrastructureItem.item_name} +${adjustmentQuantity} ${infrastructureItem.unit}`,
              referenceNumber: `INF-ADJ-${itemId}-${Date.now()}`,
              transactionDate: new Date(),
            }, transaction);
          }
        }
      }

    } else if (adjustmentType === "deduct") {
      let remainingToDeduct = adjustmentQuantity;

      const batches = await InfrastructureBatch.findAll({
        where: {
          item_id: itemId,
          quantity: { [Op.gt]: 0 },
        },
        order: [
          ["purchase_date", "ASC"],
          ["created_at", "ASC"],
        ],
        transaction,
      });

      const totalAvailable = batches.reduce(
        (sum, batch) => sum + parseFloat(batch.quantity),
        0
      );

      if (remainingToDeduct > totalAvailable) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity. Available: ${totalAvailable}, Requested: ${remainingToDeduct}`,
        });
      }

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;

        const batchQuantity = parseFloat(batch.quantity);
        const deductFromBatch = Math.min(remainingToDeduct, batchQuantity);

        await batch.update({
          quantity: batchQuantity - deductFromBatch,
        }, { transaction });

        const infrastructureTransaction = await InfrastructureTransaction.create({
          item_id: itemId,
          batch_id: batch.id,
          transaction_type: "out",
          quantity: deductFromBatch,
          unit_price: batch.unit_price,
          total_amount: deductFromBatch * batch.unit_price,
          reference_type: "adjustment",
          notes: notes || `Infrastructure adjustment - decrease from batch ${batch.batch_number}`,
        }, { transaction });

        // Create cash book entry for infrastructure deduction
        if (infrastructureItem.location_id) {
          await infrastructureCashIntegration.createInfrastructureCashEntry({
            infrastructureItemId: itemId,
            locationId: infrastructureItem.location_id,
            transactionType: "out",
            quantity: deductFromBatch,
            unitPrice: batch.unit_price,
            totalAmount: deductFromBatch * batch.unit_price,
            description: `Infrastructure adjustment: ${infrastructureItem.item_name} -${deductFromBatch} ${infrastructureItem.unit}`,
            referenceNumber: `INF-ADJ-${itemId}-${Date.now()}`,
            transactionDate: new Date(),
          }, transaction);
        }

        remainingToDeduct -= deductFromBatch;
      }
    }

    // Update infrastructure item averages
    const { totalQuantity, totalValue, averagePrice } = await calculateCurrentQuantity(itemId);
    await infrastructureItem.update({
      average_unit_price: averagePrice,
      total_value: totalValue,
      updated_at: new Date(),
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Infrastructure adjusted successfully",
      data: {
        item_id: itemId,
        adjustment_type: adjustmentType,
        quantity: adjustmentQuantity,
        new_total_quantity: totalQuantity,
      },
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Error in adjustInfrastructure:", err);
    next(err);
  }
};

// Get infrastructure item batches
const getInfrastructureBatches = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeEmpty = false } = req.query;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid infrastructure item ID"
      });
    }

    let whereClause = { item_id: parseInt(id) };
    
    if (includeEmpty !== 'true') {
      whereClause.quantity = { [Op.gt]: 0 };
    }

    const batches = await InfrastructureBatch.findAll({
      where: whereClause,
      order: [
        ["purchase_date", "ASC"],
        ["created_at", "ASC"]
      ]
    });

    const enhancedBatches = batches.map(batch => {
      const usedQuantity = batch.original_quantity - batch.quantity;
      const usagePercentage = (usedQuantity / batch.original_quantity) * 100;
      
      return {
        ...batch.toJSON(),
        used_quantity: usedQuantity,
        remaining_percentage: (100 - usagePercentage).toFixed(2),
        current_value: batch.quantity * batch.unit_price,
        status: batch.quantity === 0 ? 'exhausted' : 
                batch.quantity === batch.original_quantity ? 'unused' : 'partial'
      };
    });

    res.json({
      success: true,
      data: enhancedBatches
    });
  } catch (err) {
    console.error("Error in getInfrastructureBatches:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};

// Delete infrastructure item
const deleteInfrastructureItem = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid infrastructure item ID. Must be a number.",
      });
    }

    const infrastructureItem = await InfrastructureItem.findByPk(parseInt(id), { transaction });
    if (!infrastructureItem) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Infrastructure item not found",
      });
    }

    await InfrastructureBatch.destroy({
      where: { item_id: id },
      transaction,
    });

    await infrastructureItem.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Infrastructure item deleted successfully",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error in deleteInfrastructureItem:", err);
    next(err);
  }
};

// Get infrastructure categories
const getInfrastructureCategories = async (req, res, next) => {
  try {
    const categories = await InfrastructureCategory.findAll({
      order: [["category_name", "ASC"]],
    });
    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("Error in getInfrastructureCategories:", err);
    next(err);
  }
};

// Get infrastructure locations
const getInfrastructureLocations = async (req, res, next) => {
  try {
    const locations = await InfrastructureLocation.findAll({
      where: { is_active: true },
      order: [["location_name", "ASC"]],
    });
    res.json({
      success: true,
      data: locations,
    });
  } catch (err) {
    console.error("Error in getInfrastructureLocations:", err);
    next(err);
  }
};

// Get infrastructure item history
const getInfrastructureItemHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { search, page = 1, limit = 10, startDate, endDate, batchId } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = { item_id: id };

    if (batchId) {
      whereClause.batch_id = batchId;
    }

    if (search) {
      whereClause.notes = { [Op.iLike]: `%${search}%` };
    }

    if (startDate && endDate) {
      whereClause.transaction_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const result = await InfrastructureTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: InfrastructureBatch,
          as: "batch",
          attributes: ["batch_number", "unit_price", "supplier", "purchase_date", "expired_date"],
          required: false
        }
      ],
      order: [
        ["transaction_date", "DESC"],
        ["created_at", "DESC"]
      ],
      limit: parseInt(limit),
      offset: offset
    });

    let batchInfo = null;
    if (batchId) {
      batchInfo = await InfrastructureBatch.findByPk(batchId, {
        include: [
          {
            model: InfrastructureItem,
            as: 'infrastructureItem',
            attributes: ['item_name', 'item_code', 'unit']
          }
        ]
      });
    }

    res.json({
      success: true,
      data: result.rows,
      batch_info: batchInfo,
      pagination: {
        totalItems: result.count,
        totalPages: Math.ceil(result.count / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (err) {
    console.error("Error in getInfrastructureItemHistory:", err);
    next(err);
  }
};

// Get infrastructure cash summary by location
const getInfrastructureCashSummary = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    
    if (!locationId || isNaN(parseInt(locationId))) {
      return res.status(400).json({
        success: false,
        message: "Valid location ID is required"
      });
    }

    const summary = await infrastructureCashIntegration.getInfrastructureCashSummary(parseInt(locationId));
    
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error("Error in getInfrastructureCashSummary:", err);
    next(err);
  }
};

// Get infrastructure cash transactions by location
const getInfrastructureCashTransactions = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    if (!locationId || isNaN(parseInt(locationId))) {
      return res.status(400).json({
        success: false,
        message: "Valid location ID is required"
      });
    }

    const offset = (page - 1) * limit;
    const transactions = await infrastructureCashIntegration.getInfrastructureCashTransactions(
      parseInt(locationId),
      {
        limit: parseInt(limit),
        offset: offset
      }
    );
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (err) {
    console.error("Error in getInfrastructureCashTransactions:", err);
    next(err);
  }
};

module.exports = {
  getAllInfrastructureItems,
  createInfrastructureItem,
  getInfrastructureItemById,
  updateInfrastructureItem,
  adjustInfrastructure,
  getInfrastructureBatches,
  deleteInfrastructureItem,
  getInfrastructureCategories,
  getInfrastructureLocations,
  getInfrastructureItemHistory,
  getInfrastructureCashSummary,
  getInfrastructureCashTransactions,
};
