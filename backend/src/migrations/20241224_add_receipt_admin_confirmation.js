const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🚀 Starting receipt admin confirmation migration...');
      console.log('Adding admin confirmation fields to receipt_ocr table...');
      
      // Check which columns already exist
      const tableInfo = await queryInterface.describeTable('receipt_ocr', { transaction });
      
      // Add admin confirmation fields
      if (!tableInfo.admin_confirmed) {
        await queryInterface.addColumn('receipt_ocr', 'admin_confirmed', {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false
        }, { transaction });
      }
      
      if (!tableInfo.confirmed_by) {
        await queryInterface.addColumn('receipt_ocr', 'confirmed_by', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        }, { transaction });
      }
      
      if (!tableInfo.confirmed_at) {
        await queryInterface.addColumn('receipt_ocr', 'confirmed_at', {
          type: DataTypes.DATE,
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.pricing_method) {
        await queryInterface.addColumn('receipt_ocr', 'pricing_method', {
          type: DataTypes.STRING(20),
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.jisdor_rate) {
        await queryInterface.addColumn('receipt_ocr', 'jisdor_rate', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.fixed_rate_per_m3) {
        await queryInterface.addColumn('receipt_ocr', 'fixed_rate_per_m3', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.calculated_cost) {
        await queryInterface.addColumn('receipt_ocr', 'calculated_cost', {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.applied_to_spbg) {
        await queryInterface.addColumn('receipt_ocr', 'applied_to_spbg', {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false
        }, { transaction });
      }
      
      if (!tableInfo.applied_to_spbg_at) {
        await queryInterface.addColumn('receipt_ocr', 'applied_to_spbg_at', {
          type: DataTypes.DATE,
          allowNull: true
        }, { transaction });
      }
      
      if (!tableInfo.admin_notes) {
        await queryInterface.addColumn('receipt_ocr', 'admin_notes', {
          type: DataTypes.TEXT,
          allowNull: true
        }, { transaction });
      }

      // Add constraint for pricing_method
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'receipt_ocr_pricing_method_check'
          ) THEN
            ALTER TABLE receipt_ocr
            ADD CONSTRAINT receipt_ocr_pricing_method_check 
            CHECK (pricing_method IS NULL OR pricing_method IN ('jisdor', 'fixed'));
          END IF;
        END $$;
      `, { transaction });

      // Create indexes for faster queries
      const indexes = await queryInterface.sequelize.query(`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'receipt_ocr' 
        AND indexname = 'idx_receipt_ocr_admin_confirmed'
      `, { transaction });
      
      if (indexes[0].length === 0) {
        await queryInterface.addIndex('receipt_ocr', ['admin_confirmed'], {
          name: 'idx_receipt_ocr_admin_confirmed',
          transaction
        });
      }
      
      const indexes2 = await queryInterface.sequelize.query(`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'receipt_ocr' 
        AND indexname = 'idx_receipt_ocr_applied_to_spbg'
      `, { transaction });
      
      if (indexes2[0].length === 0) {
        await queryInterface.addIndex('receipt_ocr', ['applied_to_spbg'], {
          name: 'idx_receipt_ocr_applied_to_spbg',
          transaction
        });
      }

      console.log('✅ Admin confirmation fields added successfully');
      
      await transaction.commit();
      console.log('✅ Receipt admin confirmation migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Rolling back receipt admin confirmation migration...');
      
      const tableInfo = await queryInterface.describeTable('receipt_ocr', { transaction });
      
      // Remove columns if they exist
      const columnsToRemove = [
        'admin_confirmed',
        'confirmed_by',
        'confirmed_at',
        'pricing_method',
        'jisdor_rate',
        'fixed_rate_per_m3',
        'calculated_cost',
        'applied_to_spbg',
        'applied_to_spbg_at',
        'admin_notes'
      ];
      
      for (const column of columnsToRemove) {
        if (tableInfo[column]) {
          await queryInterface.removeColumn('receipt_ocr', column, { transaction });
        }
      }
      
      // Remove constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE receipt_ocr 
        DROP CONSTRAINT IF EXISTS receipt_ocr_pricing_method_check
      `, { transaction });
      
      // Remove indexes
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_receipt_ocr_admin_confirmed
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_receipt_ocr_applied_to_spbg
      `, { transaction });
      
      console.log('✅ Rollback completed successfully');
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
// Legacy helpers (kept for direct-run support), but migration runner uses queryInterface in up()
async function addAdminConfirmationFieldsWithClient(client) {
    console.log('Adding admin confirmation fields to receipt_ocr table...');
    
    // Add admin confirmation fields
    await client.query(`
      ALTER TABLE receipt_ocr
      ADD COLUMN IF NOT EXISTS admin_confirmed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS pricing_method VARCHAR(20),
      ADD COLUMN IF NOT EXISTS jisdor_rate DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS fixed_rate_per_m3 DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS calculated_cost DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS applied_to_spbg BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS applied_to_spbg_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS admin_notes TEXT
    `);

    // Add constraint for pricing_method
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'receipt_ocr_pricing_method_check'
        ) THEN
          ALTER TABLE receipt_ocr
          ADD CONSTRAINT receipt_ocr_pricing_method_check 
          CHECK (pricing_method IS NULL OR pricing_method IN ('jisdor', 'fixed'));
        END IF;
      END $$;
    `);

    // Create index for admin_confirmed for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_admin_confirmed 
      ON receipt_ocr(admin_confirmed)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_applied_to_spbg 
      ON receipt_ocr(applied_to_spbg)
    `);

    console.log('✅ Admin confirmation fields added successfully');
}

async function runMigration() {
  // Direct-run path uses its own Pool (legacy)
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5435,
    database: process.env.DB_NAME || 'angkutan_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'getsuga39',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    console.log('🚀 Starting receipt admin confirmation migration...');
    
    await addAdminConfirmationFieldsWithClient(client);
    
    console.log('✅ Receipt admin confirmation migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  addAdminConfirmationFields: addAdminConfirmationFieldsWithClient,
  runMigration,
  // Add `up` so our migration runner can execute this file
  up: async (queryInterface /*, Sequelize */) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE receipt_ocr
      ADD COLUMN IF NOT EXISTS admin_confirmed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS pricing_method VARCHAR(20),
      ADD COLUMN IF NOT EXISTS jisdor_rate DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS fixed_rate_per_m3 DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS calculated_cost DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS applied_to_spbg BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS applied_to_spbg_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS admin_notes TEXT
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'receipt_ocr_pricing_method_check'
        ) THEN
          ALTER TABLE receipt_ocr
          ADD CONSTRAINT receipt_ocr_pricing_method_check 
          CHECK (pricing_method IS NULL OR pricing_method IN ('jisdor', 'fixed'));
        END IF;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_admin_confirmed 
      ON receipt_ocr(admin_confirmed)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_applied_to_spbg 
      ON receipt_ocr(applied_to_spbg)
    `);
  }
};
