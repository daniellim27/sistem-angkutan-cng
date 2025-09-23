'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('nota_kecils', 'pressure_bar_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Google Drive URLs for pressure bar photos'
    });

    await queryInterface.addColumn('nota_kecils', 'temperature_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Google Drive URLs for temperature photos'
    });

    await queryInterface.addColumn('nota_kecils', 'stan_awal_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Google Drive URLs for stan awal photos'
    });

    await queryInterface.addColumn('nota_kecils', 'stan_akhir_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Google Drive URLs for stan akhir photos'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('nota_kecils', 'pressure_bar_photos_urls');
    await queryInterface.removeColumn('nota_kecils', 'temperature_photos_urls');
    await queryInterface.removeColumn('nota_kecils', 'stan_awal_photos_urls');
    await queryInterface.removeColumn('nota_kecils', 'stan_akhir_photos_urls');
  }
};

