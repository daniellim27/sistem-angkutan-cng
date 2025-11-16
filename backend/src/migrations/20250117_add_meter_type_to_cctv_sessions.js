'use strict';

/**
 * Migration: Add meter_type to cctv_sessions table
 * 
 * Adds a meter_type field to specify which type of meter is being captured
 * in each CCTV monitoring session (temperature, pressure, stan_awal, stan_akhir, other)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, create the ENUM type if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_cctv_sessions_meter_type" AS ENUM ('temperature', 'pressure', 'stan_awal', 'stan_akhir', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add the meter_type column
    await queryInterface.addColumn('cctv_sessions', 'meter_type', {
      type: Sequelize.ENUM('temperature', 'pressure', 'stan_awal', 'stan_akhir', 'other'),
      allowNull: true,
      comment: 'Type of meter being captured in this session'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the column
    await queryInterface.removeColumn('cctv_sessions', 'meter_type');
    
    // Drop the ENUM type (optional, as it might be used elsewhere)
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_cctv_sessions_meter_type";
    `);
  }
};

