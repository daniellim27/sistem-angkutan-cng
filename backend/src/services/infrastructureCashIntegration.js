// src/services/infrastructureCashIntegration.js
const db = require("../models");
const { CashTransaction, InfrastructureLocation } = db;

/**
 * Creates a cash book entry for infrastructure inventory transactions
 * This integrates infrastructure locations with the cash book system
 */
const createInfrastructureCashEntry = async (transactionData, transaction) => {
  try {
    const {
      infrastructureItemId,
      locationId,
      transactionType, // 'in' or 'out'
      quantity,
      unitPrice,
      totalAmount,
      description,
      referenceNumber,
      transactionDate = new Date(),
    } = transactionData;

    // Get the infrastructure location to use as account
    const location = await InfrastructureLocation.findByPk(locationId, { transaction });
    if (!location) {
      throw new Error(`Infrastructure location with ID ${locationId} not found`);
    }

    // Determine cash transaction type based on infrastructure transaction
    const cashTransactionType = transactionType === 'in' ? 'debit' : 'kredit';
    
    // Create account name from location
    const account = `Infrastructure - ${location.location_name}`;

    // Create cash book entry
    const cashEntry = await CashTransaction.create({
      transaction_type: cashTransactionType,
      category_id: null, // Infrastructure transactions don't need categories
      amount: Math.abs(totalAmount), // Always positive amount
      description: description || `Infrastructure ${transactionType}: ${quantity} units at ${unitPrice} per unit`,
      reference_number: referenceNumber || `INF-${infrastructureItemId}-${Date.now()}`,
      account: account,
      transaction_date: transactionDate,
      attachment_urls: null,
      no_nota: null,
    }, { transaction });

    return cashEntry;
  } catch (error) {
    console.error('Error creating infrastructure cash entry:', error);
    throw error;
  }
};

/**
 * Updates cash book entry when infrastructure transaction is modified
 */
const updateInfrastructureCashEntry = async (originalTransaction, updatedData, transaction) => {
  try {
    // Find the original cash entry
    const cashEntry = await CashTransaction.findOne({
      where: {
        reference_number: originalTransaction.reference_number,
        account: { [db.Sequelize.Op.like]: 'Infrastructure - %' }
      },
      transaction
    });

    if (!cashEntry) {
      console.warn('No cash entry found for infrastructure transaction:', originalTransaction.reference_number);
      return null;
    }

    // Update the cash entry
    await cashEntry.update({
      amount: Math.abs(updatedData.totalAmount),
      description: updatedData.description || cashEntry.description,
      transaction_date: updatedData.transactionDate || cashEntry.transaction_date,
    }, { transaction });

    return cashEntry;
  } catch (error) {
    console.error('Error updating infrastructure cash entry:', error);
    throw error;
  }
};

/**
 * Deletes cash book entry when infrastructure transaction is deleted
 */
const deleteInfrastructureCashEntry = async (referenceNumber, transaction) => {
  try {
    const cashEntry = await CashTransaction.findOne({
      where: {
        reference_number: referenceNumber,
        account: { [db.Sequelize.Op.like]: 'Infrastructure - %' }
      },
      transaction
    });

    if (cashEntry) {
      await cashEntry.destroy({ transaction });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting infrastructure cash entry:', error);
    throw error;
  }
};

/**
 * Gets infrastructure-related cash transactions for a specific location
 */
const getInfrastructureCashTransactions = async (locationId, options = {}) => {
  try {
    const location = await InfrastructureLocation.findByPk(locationId);
    if (!location) {
      throw new Error(`Infrastructure location with ID ${locationId} not found`);
    }

    const account = `Infrastructure - ${location.location_name}`;
    
    const whereClause = {
      account: account,
      ...options.where
    };

    const transactions = await CashTransaction.findAll({
      where: whereClause,
      order: [['transaction_date', 'DESC'], ['created_at', 'DESC']],
      limit: options.limit || 50,
      offset: options.offset || 0,
    });

    return transactions;
  } catch (error) {
    console.error('Error getting infrastructure cash transactions:', error);
    throw error;
  }
};

/**
 * Gets summary of infrastructure cash transactions by location
 */
const getInfrastructureCashSummary = async (locationId) => {
  try {
    const location = await InfrastructureLocation.findByPk(locationId);
    if (!location) {
      throw new Error(`Infrastructure location with ID ${locationId} not found`);
    }

    const account = `Infrastructure - ${location.location_name}`;
    
    const summary = await CashTransaction.findAll({
      where: {
        account: account
      },
      attributes: [
        'transaction_type',
        [db.Sequelize.fn('SUM', db.Sequelize.col('amount')), 'total']
      ],
      group: ['transaction_type'],
      raw: true
    });

    const totalDebit = summary.find(s => s.transaction_type === 'debit')?.total || 0;
    const totalKredit = summary.find(s => s.transaction_type === 'kredit')?.total || 0;
    const balance = parseFloat(totalDebit) - parseFloat(totalKredit);

    return {
      location: location,
      totalDebit: parseFloat(totalDebit),
      totalKredit: parseFloat(totalKredit),
      balance: balance,
      transactionCount: summary.reduce((sum, s) => sum + parseFloat(s.total), 0)
    };
  } catch (error) {
    console.error('Error getting infrastructure cash summary:', error);
    throw error;
  }
};

module.exports = {
  createInfrastructureCashEntry,
  updateInfrastructureCashEntry,
  deleteInfrastructureCashEntry,
  getInfrastructureCashTransactions,
  getInfrastructureCashSummary,
};
