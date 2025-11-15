'use strict';

const { Sequelize, QueryInterface } = require('sequelize');

/**
 * Migration: Add Nota Kecil Batch Tracking Fields
 * Adds fields to track capture batches (24 captures per nota kecil)
 */
module.exports = {
  /**
   * Run the migration
   * @param {QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  up: async (queryInterface, Sequelize) => {
    console.log('Adding nota kecil batch tracking fields to cctv_sessions...');

    await queryInterface.addColumn('cctv_sessions', 'nota_batch_start_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when current nota kecil batch started (first capture)'
    });

    await queryInterface.addColumn('cctv_sessions', 'nota_batch_start_sequence', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Sequence number of first capture in current batch'
    });

    await queryInterface.addColumn('cctv_sessions', 'nota_batch_capture_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of successful captures in current batch (0-24)'
    });

    await queryInterface.addColumn('cctv_sessions', 'nota_batch_end_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when current batch ended (when count reached 24)'
    });

    await queryInterface.addColumn('cctv_sessions', 'nota_batch_end_sequence', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Sequence number of last capture in current batch (when count reached 24)'
    });

    console.log('✅ Batch tracking fields added successfully');
  },

  /**
   * Rollback the migration
   * @param {QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  down: async (queryInterface, Sequelize) => {
    console.log('Removing nota kecil batch tracking fields from cctv_sessions...');

    await queryInterface.removeColumn('cctv_sessions', 'nota_batch_start_at');
    await queryInterface.removeColumn('cctv_sessions', 'nota_batch_start_sequence');
    await queryInterface.removeColumn('cctv_sessions', 'nota_batch_capture_count');
    await queryInterface.removeColumn('cctv_sessions', 'nota_batch_end_at');
    await queryInterface.removeColumn('cctv_sessions', 'nota_batch_end_sequence');

    console.log('✅ Batch tracking fields removed successfully');
  }
};

