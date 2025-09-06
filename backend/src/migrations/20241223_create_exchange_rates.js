'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table exists first
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('exchange_rates')
    );

    if (!tableExists) {
      await queryInterface.createTable('exchange_rates', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        currency_code: {
          type: Sequelize.STRING(3),
          allowNull: false,
          comment: 'Currency code (e.g., USD)'
        },
        rate: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Exchange rate value'
        },
        source: {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: 'Bank Indonesia',
          comment: 'Source of the exchange rate'
        },
        scraped_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          comment: 'Timestamp when rate was scraped'
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      });
    }

    // Create indexes for performance (with IF NOT EXISTS)
    try {
      await queryInterface.addIndex('exchange_rates', ['currency_code'], {
        name: 'idx_exchange_rates_currency'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('exchange_rates', ['scraped_at'], {
        name: 'idx_exchange_rates_scraped_at'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    // Insert initial USD rate only if it doesn't exist
    const existingRate = await queryInterface.sequelize.query(
      'SELECT id FROM exchange_rates WHERE currency_code = ? LIMIT 1',
      {
        replacements: ['USD'],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (existingRate.length === 0) {
      await queryInterface.bulkInsert('exchange_rates', [{
        currency_code: 'USD',
        rate: 16364.42,
        source: 'Bank Indonesia',
        scraped_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('exchange_rates');
  }
};
