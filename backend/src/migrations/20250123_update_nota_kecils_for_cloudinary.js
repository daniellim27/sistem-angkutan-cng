'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add a comment to the existing Google Drive columns to indicate they're being replaced
    await queryInterface.changeColumn('nota_kecils', 'pressure_bar_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Cloudinary URLs for pressure bar photos (replacing Google Drive)'
    });

    await queryInterface.changeColumn('nota_kecils', 'temperature_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Cloudinary URLs for temperature photos (replacing Google Drive)'
    });

    await queryInterface.changeColumn('nota_kecils', 'stan_awal_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Cloudinary URLs for stan awal photos (replacing Google Drive)'
    });

    await queryInterface.changeColumn('nota_kecils', 'stan_akhir_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Cloudinary URLs for stan akhir photos (replacing Google Drive)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the comments back to Google Drive
    await queryInterface.changeColumn('nota_kecils', 'pressure_bar_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Google Drive URLs for pressure bar photos with metadata'
    });

    await queryInterface.changeColumn('nota_kecils', 'temperature_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Google Drive URLs for temperature photos with metadata'
    });

    await queryInterface.changeColumn('nota_kecils', 'stan_awal_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Google Drive URLs for stan awal photos with metadata'
    });

    await queryInterface.changeColumn('nota_kecils', 'stan_akhir_photos_urls', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of Google Drive URLs for stan akhir photos with metadata'
    });
  }
};
