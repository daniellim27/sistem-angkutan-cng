const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🚀 Starting receipt OCR migration...');
      
      // Create receipt_ocr table
      console.log('Creating receipt_ocr table...');
      await queryInterface.createTable('receipt_ocr', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        do_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'delivery_orders',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        filling_station_name: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        customer_name: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        filling_date: {
          type: DataTypes.DATEONLY,
          allowNull: true
        },
        filling_time_start: {
          type: DataTypes.TIME,
          allowNull: true
        },
        filling_time_end: {
          type: DataTypes.TIME,
          allowNull: true
        },
        initial_pressure: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        },
        final_pressure: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        },
        total_volume: {
          type: DataTypes.DECIMAL(10, 3),
          allowNull: true
        },
        customer_signatory: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        provider_signatory: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        receipt_photo_url: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        ocr_confidence_score: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true
        },
        is_verified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false
        },
        verified_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        verified_at: {
          type: DataTypes.DATE,
          allowNull: true
        },
        verification_notes: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        driver_notes: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // Create indexes for better performance
      await queryInterface.addIndex('receipt_ocr', ['do_id'], {
        name: 'idx_receipt_ocr_do_id',
        transaction
      });
      
      await queryInterface.addIndex('receipt_ocr', ['filling_date'], {
        name: 'idx_receipt_ocr_filling_date',
        transaction
      });
      
      await queryInterface.addIndex('receipt_ocr', ['is_verified'], {
        name: 'idx_receipt_ocr_is_verified',
        transaction
      });

      // Create trigger to update updated_at timestamp
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION update_receipt_ocr_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `, { transaction });

      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trigger_update_receipt_ocr_updated_at ON receipt_ocr;
        CREATE TRIGGER trigger_update_receipt_ocr_updated_at
          BEFORE UPDATE ON receipt_ocr
          FOR EACH ROW
          EXECUTE FUNCTION update_receipt_ocr_updated_at()
      `, { transaction });

      console.log('✅ receipt_ocr table created successfully');
      
      // Remove old scaler photo functionality
      console.log('Removing old scaler photo functionality...');
      
      // Drop old scaler photo related tables if they exist
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS scaler_photos CASCADE
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS nota_kecil_photos CASCADE
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS nota_kecil CASCADE
      `, { transaction });

      // Remove scaler photo related columns from existing tables
      const tableInfo = await queryInterface.describeTable('delivery_orders', { transaction });
      
      if (tableInfo.scaler_photos_url) {
        await queryInterface.removeColumn('delivery_orders', 'scaler_photos_url', { transaction });
      }
      
      if (tableInfo.nota_kecil_url) {
        await queryInterface.removeColumn('delivery_orders', 'nota_kecil_url', { transaction });
      }

      console.log('✅ Old scaler photo functionality removed successfully');
      
      await transaction.commit();
      console.log('✅ Receipt OCR migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Rolling back receipt OCR migration...');
      
      // Drop trigger and function
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trigger_update_receipt_ocr_updated_at ON receipt_ocr;
        DROP FUNCTION IF EXISTS update_receipt_ocr_updated_at();
      `, { transaction });
      
      // Drop table
      await queryInterface.dropTable('receipt_ocr', { transaction });
      
      console.log('✅ Rollback completed successfully');
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
const { Pool } = require('pg');

// Legacy helpers (kept for direct-run support), but migration runner uses queryInterface in up()
async function createReceiptOcrTableWithClient(client) {
    console.log('Creating receipt_ocr table...');
    
    // Create receipt_ocr table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipt_ocr (
        id SERIAL PRIMARY KEY,
        do_id INTEGER REFERENCES delivery_orders(id) ON DELETE CASCADE,
        filling_station_name VARCHAR(255),
        customer_name VARCHAR(255),
        filling_date DATE,
        filling_time_start TIME,
        filling_time_end TIME,
        initial_pressure DECIMAL(10,2),
        final_pressure DECIMAL(10,2),
        total_volume DECIMAL(10,3),
        customer_signatory VARCHAR(255),
        provider_signatory VARCHAR(255),
        receipt_photo_url TEXT,
        ocr_confidence_score DECIMAL(5,2),
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by INTEGER REFERENCES users(id),
        verified_at TIMESTAMP,
        verification_notes TEXT,
        driver_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_do_id ON receipt_ocr(do_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_filling_date ON receipt_ocr(filling_date)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_is_verified ON receipt_ocr(is_verified)
    `);

    // Create trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_receipt_ocr_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_receipt_ocr_updated_at ON receipt_ocr;
      CREATE TRIGGER trigger_update_receipt_ocr_updated_at
        BEFORE UPDATE ON receipt_ocr
        FOR EACH ROW
        EXECUTE FUNCTION update_receipt_ocr_updated_at()
    `);

    console.log('✅ receipt_ocr table created successfully');
}

async function removeOldScalerPhotoTablesWithClient(client) {
    console.log('Removing old scaler photo functionality...');
    
    // Drop old scaler photo related tables if they exist
    await client.query(`
      DROP TABLE IF EXISTS scaler_photos CASCADE
    `);
    
    await client.query(`
      DROP TABLE IF EXISTS nota_kecil_photos CASCADE
    `);
    
    await client.query(`
      DROP TABLE IF EXISTS nota_kecil CASCADE
    `);

    // Remove scaler photo related columns from existing tables
    await client.query(`
      ALTER TABLE delivery_orders 
      DROP COLUMN IF EXISTS scaler_photos_url,
      DROP COLUMN IF EXISTS nota_kecil_url
    `);

    console.log('✅ Old scaler photo functionality removed successfully');
}

async function runMigration() {
  // Direct-run path uses its own Pool (legacy)
  const pool = new (require('pg').Pool)({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5435,
    database: process.env.DB_NAME || 'angkutan_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'getsuga39',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    console.log('🚀 Starting receipt OCR migration...');
    
    await createReceiptOcrTableWithClient(client);
    await removeOldScalerPhotoTablesWithClient(client);
    
    console.log('✅ Receipt OCR migration completed successfully');
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
  createReceiptOcrTable: createReceiptOcrTableWithClient,
  removeOldScalerPhotoTables: removeOldScalerPhotoTablesWithClient,
  runMigration,
  // Add `up` so our migration runner can execute this file
  up: async (queryInterface /*, Sequelize */) => {
    // Use the same DB connection as the migration runner
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS receipt_ocr (
        id SERIAL PRIMARY KEY,
        do_id INTEGER REFERENCES delivery_orders(id) ON DELETE CASCADE,
        filling_station_name VARCHAR(255),
        customer_name VARCHAR(255),
        filling_date DATE,
        filling_time_start TIME,
        filling_time_end TIME,
        initial_pressure DECIMAL(10,2),
        final_pressure DECIMAL(10,2),
        total_volume DECIMAL(10,3),
        customer_signatory VARCHAR(255),
        provider_signatory VARCHAR(255),
        receipt_photo_url TEXT,
        ocr_confidence_score DECIMAL(5,2),
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by INTEGER REFERENCES users(id),
        verified_at TIMESTAMP,
        verification_notes TEXT,
        driver_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_do_id ON receipt_ocr(do_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_filling_date ON receipt_ocr(filling_date)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_receipt_ocr_is_verified ON receipt_ocr(is_verified)
    `);

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_receipt_ocr_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trigger_update_receipt_ocr_updated_at ON receipt_ocr;
      CREATE TRIGGER trigger_update_receipt_ocr_updated_at
        BEFORE UPDATE ON receipt_ocr
        FOR EACH ROW
        EXECUTE FUNCTION update_receipt_ocr_updated_at()
    `);

    // Remove legacy tables/columns (safe if not present)
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS scaler_photos CASCADE`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS nota_kecil_photos CASCADE`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS nota_kecil CASCADE`);
    await queryInterface.sequelize.query(`
      ALTER TABLE delivery_orders 
      DROP COLUMN IF EXISTS scaler_photos_url,
      DROP COLUMN IF EXISTS nota_kecil_url
    `);
  }
};
