// src/migrations/20250115_add_phone_to_customers.js
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('customers', 'phone', {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Customer phone number (optional)',
      validate: {
        isIndonesianPhone(value) {
          if (value && value.trim() !== '') {
            const cleanPhone = value.replace(/\s|-/g, '');
            const phoneRegex = /^(\+62|62|0)[0-9]{8,13}$/;
            if (!phoneRegex.test(cleanPhone)) {
              throw new Error('Invalid Indonesian phone number format');
            }
          }
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('customers', 'phone');
  }
};
