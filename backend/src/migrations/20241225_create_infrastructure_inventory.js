module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Infrastructure Categories Table
    await queryInterface.createTable('infrastructure_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Infrastructure Locations Table
    await queryInterface.createTable('infrastructure_locations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      location_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      location_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Infrastructure Items Table
    await queryInterface.createTable('infrastructure_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'infrastructure_categories',
          key: 'id',
        },
      },
      location_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'infrastructure_locations',
          key: 'id',
        },
      },
      item_code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: true,
      },
      item_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      supplier: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'Pcs',
      },
      min_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      average_unit_price: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_value: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      expired_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Infrastructure Batches Table
    await queryInterface.createTable('infrastructure_batches', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'infrastructure_items',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      batch_number: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      original_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      unit_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      purchase_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      expired_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      supplier: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Infrastructure Transactions Table
    await queryInterface.createTable('infrastructure_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'infrastructure_items',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      batch_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'infrastructure_batches',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      transaction_type: {
        type: Sequelize.ENUM('in', 'out', 'adjustment'),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      unit_price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      total_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      reference_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      reference_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      supplier: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      transaction_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for batch_number and item_id
    await queryInterface.addConstraint('infrastructure_batches', {
      fields: ['item_id', 'batch_number'],
      type: 'unique',
      name: 'infrastructure_batches_item_batch_unique'
    });

    // Insert default infrastructure categories
    await queryInterface.bulkInsert('infrastructure_categories', [
      { category_name: 'Tools & Equipment', description: 'Tools and equipment for maintenance and operations' },
      { category_name: 'Safety Equipment', description: 'Safety gear and protective equipment' },
      { category_name: 'Office Supplies', description: 'Office materials and supplies' },
      { category_name: 'IT Equipment', description: 'Computers, printers, and IT infrastructure' },
      { category_name: 'Vehicle Parts', description: 'Spare parts and components for vehicles' },
      { category_name: 'Building Materials', description: 'Construction and building materials' },
      { category_name: 'Electrical', description: 'Electrical components and supplies' },
      { category_name: 'Other', description: 'Other infrastructure items' }
    ]);

    // Insert default infrastructure locations
    await queryInterface.bulkInsert('infrastructure_locations', [
      { location_name: 'Main Warehouse', location_code: 'WH001', description: 'Primary storage warehouse' },
      { location_name: 'Office', location_code: 'OFF001', description: 'Office storage area' },
      { location_name: 'Workshop', location_code: 'WS001', description: 'Workshop and maintenance area' },
      { location_name: 'Garage', location_code: 'GAR001', description: 'Vehicle garage storage' },
      { location_name: 'IT Room', location_code: 'IT001', description: 'IT equipment storage room' },
      { location_name: 'Safety Storage', location_code: 'SAF001', description: 'Safety equipment storage area' }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('infrastructure_transactions');
    await queryInterface.dropTable('infrastructure_batches');
    await queryInterface.dropTable('infrastructure_items');
    await queryInterface.dropTable('infrastructure_locations');
    await queryInterface.dropTable('infrastructure_categories');
  }
};
