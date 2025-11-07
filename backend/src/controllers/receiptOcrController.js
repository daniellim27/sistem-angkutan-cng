const receiptOcrService = require('../services/receiptOcrService');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5435,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'angkutan_ewaldo',
});

// Database helper functions

async function saveReceiptToDatabase(doId, receiptData) {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO receipt_ocr (
        do_id, filling_station_name, customer_name, filling_date,
        filling_time_start, filling_time_end, initial_pressure,
        final_pressure, total_volume, customer_signatory,
        provider_signatory, receipt_photo_url, ocr_confidence_score,
        driver_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const values = [
      doId,
      receiptData.filling_station_name,
      receiptData.customer_name,
      receiptData.filling_date,
      receiptData.filling_time_start,
      receiptData.filling_time_end,
      receiptData.initial_pressure,
      receiptData.final_pressure,
      receiptData.total_volume,
      receiptData.customer_signatory,
      receiptData.provider_signatory,
      receiptData.receipt_photo_url,
      receiptData.ocr_confidence_score || 0.8,
      receiptData.driver_notes || null
    ];

    const result = await client.query(query, values);
    return result.rows[0].id;

  } finally {
    client.release();
  }
}

async function getReceiptsFromDatabase(doId) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT r.*, u.username as verified_by_name
      FROM receipt_ocr r
      LEFT JOIN users u ON r.verified_by = u.id
      WHERE r.do_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await client.query(query, [doId]);
    return result.rows;

  } finally {
    client.release();
  }
}

async function getReceiptFromDatabase(receiptId) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT r.*, u.username as verified_by_name
      FROM receipt_ocr r
      LEFT JOIN users u ON r.verified_by = u.id
      WHERE r.id = $1
    `;

    const result = await client.query(query, [receiptId]);
    return result.rows[0];

  } finally {
    client.release();
  }
}

async function updateReceiptInDatabase(receiptId, updatedData) {
  const client = await pool.connect();
  
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.keys(updatedData).forEach(key => {
      if (updatedData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updatedData[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(receiptId);
    const query = `
      UPDATE receipt_ocr 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);
    return result.rows[0];

  } finally {
    client.release();
  }
}

async function updateReceiptVerification(receiptId, verificationData) {
  const client = await pool.connect();
  
  try {
    const query = `
      UPDATE receipt_ocr 
      SET is_verified = $1, verified_by = $2, verified_at = $3, verification_notes = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const values = [
      verificationData.is_verified,
      verificationData.verified_by,
      verificationData.verified_at,
      verificationData.verification_notes,
      receiptId
    ];

    const result = await client.query(query, values);
    return result.rows[0];

  } finally {
    client.release();
  }
}

async function deleteReceiptFromDatabase(receiptId) {
  const client = await pool.connect();
  
  try {
    const query = 'DELETE FROM receipt_ocr WHERE id = $1 RETURNING id';
    const result = await client.query(query, [receiptId]);
    return result.rows.length > 0;

  } finally {
    client.release();
  }
}

// Controller functions

/**
 * Upload receipt photo and process with OCR
 */
exports.uploadReceipt = async (req, res) => {
  try {
    console.log('Receipt OCR upload request received');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No receipt photo provided'
      });
    }

    const { do_id } = req.body;
    if (!do_id) {
      return res.status(400).json({
        success: false,
        message: 'Delivery order ID is required'
      });
    }

    // Process receipt image with OCR
    const ocrResult = await receiptOcrService.processReceiptImage(req.file);
    
    if (!ocrResult.success) {
      return res.status(500).json({
        success: false,
        message: ocrResult.message,
        error: ocrResult.error
      });
    }

    const extractedData = ocrResult.data;
    
    // Validate extracted data
    const validation = receiptOcrService.validateExtractedData(extractedData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt data extracted',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    // Save receipt data to database
    const receiptId = await saveReceiptToDatabase(do_id, extractedData);

    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: {
        receipt_id: receiptId,
        ...extractedData,
        validation: validation
      }
    });

  } catch (error) {
    console.error('Error in uploadReceipt:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Confirm receipt data after review
 */
exports.confirmReceipt = async (req, res) => {
  try {
    console.log('confirmReceipt called with body:', req.body);
    
    const { delivery_order_id, ...receiptData } = req.body;
    
    if (!delivery_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Delivery order ID is required'
      });
    }

    // Validate receipt data
    const validation = receiptOcrService.validateExtractedData(receiptData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt data',
        errors: validation.errors
      });
    }

    // Save confirmed receipt to database
    const receiptId = await saveReceiptToDatabase(delivery_order_id, receiptData);

    res.json({
      success: true,
      message: 'Receipt confirmed and saved successfully',
      data: {
        receipt_id: receiptId,
        ...receiptData
      }
    });

  } catch (error) {
    console.error('Error in confirmReceipt:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get all receipts for a delivery order
 */
exports.getReceiptsByDo = async (req, res) => {
  try {
    const { doId } = req.params;
    
    if (!doId) {
      return res.status(400).json({
        success: false,
        message: 'Delivery order ID is required'
      });
    }

    const receipts = await getReceiptsFromDatabase(doId);

    res.json({
      success: true,
      message: 'Receipts retrieved successfully',
      data: receipts
    });

  } catch (error) {
    console.error('Error in getReceiptsByDo:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get specific receipt details with suggested rates
 */
exports.getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const receipt = await getReceiptFromDatabase(id);
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Get suggested rates from exchange_rates table (JISDOR)
    let suggestedJisdorRate = 15000; // Default fallback
    let suggestedFixedRate = 14500; // Default fallback
    
    try {
      const rateQuery = `
        SELECT usd_to_idr FROM exchange_rates 
        ORDER BY rate_date DESC 
        LIMIT 1
      `;
      const client = await pool.connect();
      const rateResult = await client.query(rateQuery);
      client.release();
      
      if (rateResult.rows.length > 0) {
        // JISDOR rate (latest exchange rate)
        suggestedJisdorRate = parseFloat(rateResult.rows[0].usd_to_idr);
        // Fixed rate could be a bit lower or same
        suggestedFixedRate = suggestedJisdorRate * 0.97; // 3% discount for fixed
      }
    } catch (rateError) {
      console.warn('Could not fetch exchange rates, using defaults:', rateError.message);
    }

    res.json({
      success: true,
      message: 'Receipt retrieved successfully',
      data: {
        ...receipt,
        suggested_jisdor_rate: suggestedJisdorRate,
        suggested_fixed_rate: suggestedFixedRate
      }
    });

  } catch (error) {
    console.error('Error in getReceiptById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Edit receipt data
 */
exports.editReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    // Validate updated data
    const validation = receiptOcrService.validateExtractedData(updatedData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt data',
        errors: validation.errors
      });
    }

    // Update receipt in database
    const updatedReceipt = await updateReceiptInDatabase(id, updatedData);

    if (!updatedReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      message: 'Receipt updated successfully',
      data: updatedReceipt
    });

  } catch (error) {
    console.error('Error in editReceipt:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Verify receipt (admin action)
 */
exports.verifyReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified, verification_notes } = req.body;
    const verified_by = req.user?.id; // Assuming user is available from auth middleware

    if (typeof is_verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_verified must be a boolean value'
      });
    }

    // Update verification status in database
    const updatedReceipt = await updateReceiptVerification(id, {
      is_verified,
      verified_by,
      verification_notes,
      verified_at: new Date()
    });

    if (!updatedReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      message: `Receipt ${is_verified ? 'verified' : 'rejected'} successfully`,
      data: updatedReceipt
    });

  } catch (error) {
    console.error('Error in verifyReceipt:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Delete receipt
 */
exports.deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await deleteReceiptFromDatabase(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteReceipt:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Admin confirms receipt and applies cost to SPBG balance
 */
exports.confirmReceiptAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { pricing_method, rate_per_m3, admin_notes } = req.body;
    const confirmed_by = req.user?.id; // Assuming user is available from auth middleware

    // Validate pricing method
    if (!pricing_method || !['jisdor', 'fixed'].includes(pricing_method)) {
      return res.status(400).json({
        success: false,
        message: 'pricing_method must be either "jisdor" or "fixed"'
      });
    }

    // Validate rate
    if (!rate_per_m3 || parseFloat(rate_per_m3) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'rate_per_m3 must be a positive number'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get receipt details
      const receiptQuery = 'SELECT * FROM receipt_ocr WHERE id = $1';
      const receiptResult = await client.query(receiptQuery, [id]);
      
      if (receiptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Receipt not found'
        });
      }

      const receipt = receiptResult.rows[0];
      
      // Check if already confirmed
      if (receipt.admin_confirmed) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Receipt already confirmed'
        });
      }

      // Calculate cost
      const totalVolume = parseFloat(receipt.total_volume) || 0;
      const rateValue = parseFloat(rate_per_m3);
      const calculatedCost = totalVolume * rateValue;

      // Update receipt with confirmation data
      const updateReceiptQuery = `
        UPDATE receipt_ocr 
        SET 
          admin_confirmed = TRUE,
          confirmed_by = $1,
          confirmed_at = CURRENT_TIMESTAMP,
          pricing_method = $2,
          ${pricing_method === 'jisdor' ? 'jisdor_rate' : 'fixed_rate_per_m3'} = $3,
          calculated_cost = $4,
          admin_notes = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `;
      
      const updateValues = [
        confirmed_by,
        pricing_method,
        rateValue,
        calculatedCost,
        admin_notes || null,
        id
      ];

      const updatedReceiptResult = await client.query(updateReceiptQuery, updateValues);
      const updatedReceipt = updatedReceiptResult.rows[0];

      // Get the delivery order to find the SPBG (deposit group)
      const doQuery = `
        SELECT d.id, d.do_number, dgm.group_id, dg.spbg_location, dg.balance
        FROM delivery_orders d
        JOIN deposit_group_members dgm ON d.id = dgm.delivery_order_id
        JOIN deposit_groups dg ON dgm.group_id = dg.id
        WHERE d.id = $1
      `;
      const doResult = await client.query(doQuery, [receipt.do_id]);

      let spbgBalanceUpdated = false;
      let spbgInfo = null;

      if (doResult.rows.length > 0) {
        const doData = doResult.rows[0];
        spbgInfo = {
          group_id: doData.group_id,
          spbg_location: doData.spbg_location,
          previous_balance: parseFloat(doData.balance)
        };

        // Reduce SPBG balance by the calculated cost
        const newBalance = Math.max(0, spbgInfo.previous_balance - calculatedCost);
        
        const updateBalanceQuery = `
          UPDATE deposit_groups 
          SET 
            balance = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `;
        
        await client.query(updateBalanceQuery, [newBalance, spbgInfo.group_id]);
        
        // Mark receipt as applied to SPBG
        await client.query(
          'UPDATE receipt_ocr SET applied_to_spbg = TRUE, applied_to_spbg_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id]
        );
        
        spbgBalanceUpdated = true;
        spbgInfo.new_balance = newBalance;
        spbgInfo.cost_applied = calculatedCost;

        console.log(`✅ Receipt #${id} confirmed: Rp ${calculatedCost.toLocaleString('id-ID')} deducted from ${spbgInfo.spbg_location}`);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Receipt confirmed successfully',
        data: {
          receipt: {
            id: updatedReceipt.id,
            admin_confirmed: true,
            confirmed_at: updatedReceipt.confirmed_at,
            pricing_method: updatedReceipt.pricing_method,
            rate_per_m3: rateValue,
            total_volume: totalVolume,
            calculated_cost: calculatedCost,
            applied_to_spbg: updatedReceipt.applied_to_spbg
          },
          spbg_balance: spbgBalanceUpdated ? spbgInfo : null
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error in confirmReceiptAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
