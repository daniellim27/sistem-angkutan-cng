// Migration to add surat jalan OCR result fields to delivery_orders table
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn('delivery_orders', 'surat_jalan_ocr_data', {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'OCR extracted data from surat jalan photos'
    });

    await queryInterface.addColumn('delivery_orders', 'surat_jalan_ocr_confidence', {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Overall confidence score of surat jalan OCR extraction (0-100)'
    });

    await queryInterface.addColumn('delivery_orders', 'surat_jalan_volume_extracted', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Total volume pengisian extracted from surat jalan via OCR'
    });

    await queryInterface.addColumn('delivery_orders', 'surat_jalan_ocr_confirmed', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether admin has confirmed the OCR extracted data'
    });

    await queryInterface.addColumn('delivery_orders', 'surat_jalan_confirmed_volume', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Admin-confirmed volume (may differ from OCR extracted volume)'
    });

    await queryInterface.addColumn('delivery_orders', 'surat_jalan_ocr_processed_at', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when OCR processing was completed'
    });

    await queryInterface.addColumn('delivery_orders', 'surat_jalan_confirmed_at', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when admin confirmed the OCR data'
    });

    await queryInterface.addColumn('delivery_orders', 'surat_jalan_confirmed_by', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User ID of admin who confirmed the OCR data'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('delivery_orders', 'surat_jalan_ocr_data');
    await queryInterface.removeColumn('delivery_orders', 'surat_jalan_ocr_confidence');
    await queryInterface.removeColumn('delivery_orders', 'surat_jalan_volume_extracted');
    await queryInterface.removeColumn('delivery_orders', 'surat_jalan_ocr_confirmed');
    await queryInterface.removeColumn('delivery_orders', 'surat_jalan_confirmed_volume');
    await queryInterface.removeColumn('delivery_orders', 'surat_jalan_ocr_processed_at');
    await queryInterface.removeColumn('delivery_orders', 'surat_jalan_confirmed_at');
    await queryInterface.removeColumn('delivery_orders', 'surat_jalan_confirmed_by');
  }
};

