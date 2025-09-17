const { DataTypes, Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const OCRResult = sequelize.define(
    "OCRResult",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      
      // Foreign key to delivery order
      delivery_order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'delivery_orders',
          key: 'id'
        },
        comment: 'Reference to the delivery order this OCR result belongs to'
      },
      
      // Image information
      image_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'URL or filename of the processed image'
      },
      image_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Full file path to the stored image'
      },
      
      // OCR processing data
      raw_ocr_text: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Raw OCR text output from the service'
      },
      extracted_data: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Structured extracted data from OCR processing'
      },
      confidence_scores: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Confidence scores for each extracted field'
      },
      
      // Processing status
      processing_status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of OCR processing'
      },
      processing_error: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if processing failed'
      },
      
      // Billing calculation data
      billing_calculation_data: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Calculated billing data based on OCR results'
      },
      calculated_gas_volume_m3: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Final calculated gas volume in cubic meters'
      },
      calculation_method: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'ocr',
        comment: 'Method used for calculation (ocr, manual, etc.)'
      },
      
      // Audit fields
      processed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User who triggered the OCR processing'
      },
      processed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the OCR processing was completed'
      },
      
      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        field: "created_at",
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        field: "updated_at",
        defaultValue: Sequelize.NOW,
        allowNull: false
      }
    },
    {
      tableName: "ocr_results",
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          fields: ['delivery_order_id']
        },
        {
          fields: ['processing_status']
        },
        {
          fields: ['created_at']
        }
      ]
    }
  );

  // Instance methods
  OCRResult.prototype.isProcessingComplete = function() {
    return this.processing_status === 'completed';
  };

  OCRResult.prototype.isProcessingFailed = function() {
    return this.processing_status === 'failed';
  };

  OCRResult.prototype.getOverallConfidence = function() {
    return this.confidence_scores?.overall || 0;
  };

  OCRResult.prototype.hasValidData = function() {
    if (!this.extracted_data) return false;
    
    const data = this.extracted_data;
    return !!(data.stan_awal && data.stan_akhir && 
              data.tekanan_operasi && data.temperatur_operasi);
  };

  OCRResult.prototype.getExtractedDataSummary = function() {
    if (!this.extracted_data) return null;
    
    const data = this.extracted_data;
    return {
      has_date_range: !!(data.tanggal_mulai && data.tanggal_selesai),
      has_meter_readings: !!(data.stan_awal && data.stan_akhir),
      has_operational_data: !!(data.tekanan_operasi && data.temperatur_operasi),
      has_pricing_data: !!(data.harga_satuan && data.total_harga),
      meter_difference: data.stan_akhir && data.stan_awal ? 
        data.stan_akhir - data.stan_awal : null,
      confidence: this.getOverallConfidence()
    };
  };

  OCRResult.prototype.getBillingSummary = function() {
    if (!this.billing_calculation_data) return null;
    
    return {
      calculated_volume: this.calculated_gas_volume_m3,
      calculation_method: this.calculation_method,
      has_calculation: !!this.calculated_gas_volume_m3
    };
  };

  // Class methods
  OCRResult.getByDeliveryOrder = function(deliveryOrderId) {
    return this.findAll({
      where: { delivery_order_id: deliveryOrderId },
      order: [['created_at', 'DESC']]
    });
  };

  OCRResult.getLatestByDeliveryOrder = function(deliveryOrderId) {
    return this.findOne({
      where: { delivery_order_id: deliveryOrderId },
      order: [['created_at', 'DESC']]
    });
  };

  OCRResult.getProcessingStats = function() {
    return this.findAll({
      attributes: [
        'processing_status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['processing_status'],
      raw: true
    });
  };

  return OCRResult;
};

