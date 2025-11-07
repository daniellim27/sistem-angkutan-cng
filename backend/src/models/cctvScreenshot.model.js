const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CCTVScreenshot = sequelize.define('CCTVScreenshot', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cctv_sessions',
        key: 'id'
      },
      comment: 'Foreign key to cctv_sessions table'
    },
    screenshot_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'URL to screenshot image (Cloudinary or local storage)'
    },
    cloudinary_public_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Cloudinary public ID for image management'
    },
    captured_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when the screenshot was captured'
    },
    sequence_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Sequential number within the session (1, 2, 3, ...)'
    },
    ocr_status: {
      type: DataTypes.ENUM('pending', 'processing', 'success', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status of OCR processing'
    },
    ocr_result: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'OCR extracted data: meter_reading, pressure, temperature, flow_rate, etc.'
    },
    ocr_raw_response: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Full raw OCR API response for debugging'
    },
    ocr_confidence_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'OCR confidence score (0-1), higher is better'
    },
    ocr_processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when OCR processing completed'
    },
    ocr_error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if OCR processing failed'
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of OCR retry attempts'
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Soft delete flag'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about this screenshot'
    }
  }, {
    tableName: 'cctv_screenshots',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_cctv_screenshots_session_sequence',
        fields: ['session_id', 'sequence_number']
      },
      {
        name: 'idx_cctv_screenshots_captured_at',
        fields: ['captured_at']
      },
      {
        name: 'idx_cctv_screenshots_ocr_status',
        fields: ['ocr_status']
      },
      {
        name: 'idx_cctv_screenshots_session_id',
        fields: ['session_id']
      }
    ],
    // Don't return soft-deleted records by default
    defaultScope: {
      where: {
        is_deleted: false
      }
    },
    scopes: {
      // Include deleted records
      withDeleted: {
        where: {}
      }
    }
  });

  // Virtual field for checking if OCR needs retry
  CCTVScreenshot.prototype.needsOcrRetry = function() {
    return (
      this.ocr_status === 'failed' ||
      (this.ocr_status === 'success' && this.ocr_confidence_score < 0.7)
    );
  };

  // Virtual field for OCR status display
  CCTVScreenshot.prototype.getOcrStatusDisplay = function() {
    const statusMap = {
      pending: 'Pending',
      processing: 'Processing...',
      success: 'Success',
      failed: 'Failed'
    };
    
    let status = statusMap[this.ocr_status] || this.ocr_status;
    
    if (this.ocr_status === 'success' && this.ocr_confidence_score) {
      status += ` (${Math.round(this.ocr_confidence_score * 100)}%)`;
    }
    
    return status;
  };

  return CCTVScreenshot;
};
