/**
 * Migration: Add OCR fields to delivery_orders table
 * This migration adds OCR-related fields to the existing delivery_orders table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add OCR-related fields to delivery_orders table
      await queryInterface.addColumn('delivery_orders', 'ocr_processed', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this delivery order has been processed with OCR'
      }, { transaction });

      await queryInterface.addColumn('delivery_orders', 'ocr_confidence_score', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Overall confidence score from OCR processing (0-100)'
      }, { transaction });

      await queryInterface.addColumn('delivery_orders', 'ocr_raw_data', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Raw OCR data from processing'
      }, { transaction });

      await queryInterface.addColumn('delivery_orders', 'ocr_extracted_data', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Structured extracted data from OCR processing'
      }, { transaction });

      await queryInterface.addColumn('delivery_orders', 'billing_calculation_data', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Calculated billing data based on OCR results'
      }, { transaction });

      await queryInterface.addColumn('delivery_orders', 'calculated_gas_volume_m3', {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Final calculated gas volume in cubic meters from OCR'
      }, { transaction });

      await queryInterface.addColumn('delivery_orders', 'calculation_method', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'manual',
        comment: 'Method used for calculation (ocr, manual, iot, etc.)'
      }, { transaction });

      await queryInterface.addColumn('delivery_orders', 'ocr_processed_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the OCR processing was completed'
      }, { transaction });

      await queryInterface.addColumn('delivery_orders', 'ocr_processed_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User who triggered the OCR processing'
      }, { transaction });

      // Create OCR results table
      await queryInterface.createTable('ocr_results', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        
        // Foreign key to delivery order
        delivery_order_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'delivery_orders',
            key: 'id'
          },
          onDelete: 'CASCADE',
          comment: 'Reference to the delivery order this OCR result belongs to'
        },
        
        // Image information
        image_url: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'URL or filename of the processed image'
        },
        image_path: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'Full file path to the stored image'
        },
        
        // OCR processing data
        raw_ocr_text: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Raw OCR text output from the service'
        },
        extracted_data: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Structured extracted data from OCR processing'
        },
        confidence_scores: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Confidence scores for each extracted field'
        },
        
        // Processing status
        processing_status: {
          type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
          allowNull: false,
          defaultValue: 'pending',
          comment: 'Current status of OCR processing'
        },
        processing_error: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Error message if processing failed'
        },
        
        // Billing calculation data
        billing_calculation_data: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Calculated billing data based on OCR results'
        },
        calculated_gas_volume_m3: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: true,
          comment: 'Final calculated gas volume in cubic meters'
        },
        calculation_method: {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: 'ocr',
          comment: 'Method used for calculation (ocr, manual, etc.)'
        },
        
        // Audit fields
        processed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          comment: 'User who triggered the OCR processing'
        },
        processed_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When the OCR processing was completed'
        },
        
        // Timestamps
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // Add indexes for better performance
      await queryInterface.addIndex('ocr_results', ['delivery_order_id'], {
        name: 'idx_ocr_results_delivery_order_id',
        transaction
      });

      await queryInterface.addIndex('ocr_results', ['processing_status'], {
        name: 'idx_ocr_results_processing_status',
        transaction
      });

      await queryInterface.addIndex('ocr_results', ['created_at'], {
        name: 'idx_ocr_results_created_at',
        transaction
      });

      await queryInterface.addIndex('delivery_orders', ['ocr_processed'], {
        name: 'idx_delivery_orders_ocr_processed',
        transaction
      });

      await queryInterface.addIndex('delivery_orders', ['calculation_method'], {
        name: 'idx_delivery_orders_calculation_method',
        transaction
      });

      await transaction.commit();
      console.log('✅ OCR fields migration completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ OCR fields migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop OCR results table
      await queryInterface.dropTable('ocr_results', { transaction });

      // Remove OCR fields from delivery_orders table
      await queryInterface.removeColumn('delivery_orders', 'ocr_processed', { transaction });
      await queryInterface.removeColumn('delivery_orders', 'ocr_confidence_score', { transaction });
      await queryInterface.removeColumn('delivery_orders', 'ocr_raw_data', { transaction });
      await queryInterface.removeColumn('delivery_orders', 'ocr_extracted_data', { transaction });
      await queryInterface.removeColumn('delivery_orders', 'billing_calculation_data', { transaction });
      await queryInterface.removeColumn('delivery_orders', 'calculated_gas_volume_m3', { transaction });
      await queryInterface.removeColumn('delivery_orders', 'calculation_method', { transaction });
      await queryInterface.removeColumn('delivery_orders', 'ocr_processed_at', { transaction });
      await queryInterface.removeColumn('delivery_orders', 'ocr_processed_by', { transaction });

      await transaction.commit();
      console.log('✅ OCR fields migration rolled back successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ OCR fields migration rollback failed:', error);
      throw error;
    }
  }
};

