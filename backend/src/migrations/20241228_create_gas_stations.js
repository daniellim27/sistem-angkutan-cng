'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('gas_stations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Name of the gas station'
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false,
        comment: 'GPS latitude coordinate'
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false,
        comment: 'GPS longitude coordinate'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Full address of the gas station'
      },
      station_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'CNG',
        comment: 'Type of fuel station'
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Contact phone number'
      },
      operating_hours: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Operating hours (e.g., "24/7" or "06:00 - 22:00")'
      },
      fuel_types: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Available fuel types and prices'
      },
      amenities: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Available amenities (e.g., ["ATM", "RestRoom", "WiFi"])'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the gas station is currently active/operational'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes or special instructions'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User who created this gas station marker'
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: 'User who last updated this gas station marker'
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

    // Create indexes for performance (only if they don't exist)
    try {
      await queryInterface.addIndex('gas_stations', ['latitude', 'longitude'], {
        name: 'idx_gas_stations_coordinates'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('gas_stations', ['station_type'], {
        name: 'idx_gas_stations_type'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('gas_stations', ['is_active'], {
        name: 'idx_gas_stations_active'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('gas_stations', ['created_by'], {
        name: 'idx_gas_stations_created_by'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    // First, ensure there's an admin user
    const [users] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE role = \'admin\' LIMIT 1'
    );
    
    let adminUserId = 1;
    if (users.length === 0) {
      // Create admin user if none exists
      await queryInterface.bulkInsert('users', [{
        username: 'admin',
        password_hash: '$2b$10$rQZ8K9vL8mN7pQ6rS5tT.uVwXyZ1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P',
        role: 'admin',
        created_at: new Date()
      }]);
      adminUserId = 1;
    } else {
      adminUserId = users[0].id;
    }

    // Insert sample gas stations for testing
    await queryInterface.bulkInsert('gas_stations', [
      {
        name: 'CNG Station Jakarta Pusat',
        latitude: -6.2088,
        longitude: 106.8456,
        address: 'Jl. MH Thamrin No. 1, Jakarta Pusat',
        station_type: 'CNG',
        phone: '021-12345678',
        operating_hours: '24/7',
        fuel_types: JSON.stringify([
          { type: 'CNG', price_per_liter: 3500 }
        ]),
        amenities: JSON.stringify(['ATM', 'RestRoom', 'WiFi']),
        is_active: true,
        notes: 'Main CNG station in central Jakarta',
        created_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'SPBG Pertamina Sudirman',
        latitude: -6.2275,
        longitude: 106.8066,
        address: 'Jl. Jend. Sudirman No. 45, Jakarta Selatan',
        station_type: 'Mixed',
        phone: '021-87654321',
        operating_hours: '05:00 - 23:00',
        fuel_types: JSON.stringify([
          { type: 'CNG', price_per_liter: 3500 },
          { type: 'Pertamax', price_per_liter: 12400 },
          { type: 'Pertalite', price_per_liter: 10000 }
        ]),
        amenities: JSON.stringify(['ATM', 'RestRoom', 'Minimarket']),
        is_active: true,
        notes: 'Full service station with multiple fuel types',
        created_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('gas_stations');
  }
};
