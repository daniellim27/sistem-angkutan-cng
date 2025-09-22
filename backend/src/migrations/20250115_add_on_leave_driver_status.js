'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'on_leave' to the driver_status enum
    await queryInterface.sequelize.query(`
      ALTER TYPE driver_status ADD VALUE 'on_leave';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type and updating all references
    // For now, we'll leave the enum value in place
    console.log('Warning: Cannot remove enum value "on_leave" from driver_status type');
  }
};
