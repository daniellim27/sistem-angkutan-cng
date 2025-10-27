const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5435,
  database: process.env.DB_NAME || 'angkutan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'getsuga39',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function createReceiptOcrTable() {
  const client = await pool.connect();
  
  try {
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
    
  } catch (error) {
    console.error('❌ Error creating receipt_ocr table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function removeOldScalerPhotoTables() {
  const client = await pool.connect();
  
  try {
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
    
  } catch (error) {
    console.error('❌ Error removing old scaler photo functionality:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigration() {
  try {
    console.log('🚀 Starting receipt OCR migration...');
    
    await createReceiptOcrTable();
    await removeOldScalerPhotoTables();
    
    console.log('✅ Receipt OCR migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  createReceiptOcrTable,
  removeOldScalerPhotoTables,
  runMigration
};
