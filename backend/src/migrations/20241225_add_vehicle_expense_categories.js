// backend/src/migrations/20241225_add_vehicle_expense_categories.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const vehicleExpenseCategories = [
      {
        category_name: 'Bahan Bakar',
        category_type: 'expense',
        description: 'Pengeluaran untuk bahan bakar kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Servis Kendaraan',
        category_type: 'expense',
        description: 'Biaya servis dan maintenance kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Perbaikan',
        category_type: 'expense',
        description: 'Biaya perbaikan kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Asuransi Kendaraan',
        category_type: 'expense',
        description: 'Premi asuransi kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Parkir',
        category_type: 'expense',
        description: 'Biaya parkir kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Tol',
        category_type: 'expense',
        description: 'Biaya tol kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Pajak Kendaraan',
        category_type: 'expense',
        description: 'Pajak kendaraan bermotor',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'STNK',
        category_type: 'expense',
        description: 'Biaya STNK kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Ban',
        category_type: 'expense',
        description: 'Penggantian dan perawatan ban',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Oli',
        category_type: 'expense',
        description: 'Penggantian oli kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Spare Part',
        category_type: 'expense',
        description: 'Penggantian spare part kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Cuci Kendaraan',
        category_type: 'expense',
        description: 'Biaya cuci kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_name: 'Maintenance',
        category_type: 'expense',
        description: 'Biaya maintenance rutin kendaraan',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('cash_categories', vehicleExpenseCategories, {
      ignoreDuplicates: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('cash_categories', {
      category_name: [
        'Bahan Bakar',
        'Servis Kendaraan',
        'Perbaikan',
        'Asuransi Kendaraan',
        'Parkir',
        'Tol',
        'Pajak Kendaraan',
        'STNK',
        'Ban',
        'Oli',
        'Spare Part',
        'Cuci Kendaraan',
        'Maintenance'
      ]
    });
  }
};
