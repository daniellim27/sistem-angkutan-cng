'use strict';

const { Sequelize, QueryInterface } = require('sequelize');

/**
 * Migration: Add foreign key constraint for created_nota_kecil_id in cctv_sessions
 * This migration runs after nota_kecils table is created
 */
module.exports = {
  /**
   * Run the migration
   * @param {QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  up: async (queryInterface, Sequelize) => {
    console.log('Adding foreign key constraint for created_nota_kecil_id...');

    // Add foreign key constraint to created_nota_kecil_id column
    await queryInterface.addConstraint('cctv_sessions', {
      fields: ['created_nota_kecil_id'],
      type: 'foreign key',
      name: 'fk_cctv_sessions_created_nota_kecil_id',
      references: {
        table: 'nota_kecils',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    console.log('✓ Foreign key constraint added for created_nota_kecil_id');
  },

  /**
   * Revert the migration
   * @param {QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  down: async (queryInterface, Sequelize) => {
    console.log('Removing foreign key constraint for created_nota_kecil_id...');

    await queryInterface.removeConstraint('cctv_sessions', 'fk_cctv_sessions_created_nota_kecil_id');

    console.log('✓ Foreign key constraint removed');
  }
};

