'use strict';

/**
 * Migration: Add photo and biaya_lain fields to gas_transactions
 * This fixes runtime errors when the model expects these columns but the DB table
 * does not have them yet (error: column GasTransaction.surat_jalan_photo_url does not exist).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = 'gas_transactions';

    const tableDesc = await queryInterface.describeTable(table).catch(() => ({}));

    if (!tableDesc.surat_jalan_photo_url) {
      await queryInterface.addColumn(table, 'surat_jalan_photo_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Path to surat jalan (delivery note) photo - NOT used for OCR'
      });
    }

    if (!tableDesc.nota_photo_url) {
      await queryInterface.addColumn(table, 'nota_photo_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Path to nota (receipt) photo - used for OCR'
      });
    }

    if (!tableDesc.biaya_lain_photo_url) {
      await queryInterface.addColumn(table, 'biaya_lain_photo_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Path to biaya lain (other expenses) photo'
      });
    }

    if (!tableDesc.biaya_lain_amount) {
      await queryInterface.addColumn(table, 'biaya_lain_amount', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Amount for other expenses'
      });
    }

    if (!tableDesc.biaya_lain_description) {
      await queryInterface.addColumn(table, 'biaya_lain_description', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description of other expenses'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = 'gas_transactions';
    const tableDesc = await queryInterface.describeTable(table).catch(() => ({}));

    if (tableDesc.biaya_lain_description) {
      await queryInterface.removeColumn(table, 'biaya_lain_description');
    }
    if (tableDesc.biaya_lain_amount) {
      await queryInterface.removeColumn(table, 'biaya_lain_amount');
    }
    if (tableDesc.biaya_lain_photo_url) {
      await queryInterface.removeColumn(table, 'biaya_lain_photo_url');
    }
    if (tableDesc.nota_photo_url) {
      await queryInterface.removeColumn(table, 'nota_photo_url');
    }
    if (tableDesc.surat_jalan_photo_url) {
      await queryInterface.removeColumn(table, 'surat_jalan_photo_url');
    }
  }
};
