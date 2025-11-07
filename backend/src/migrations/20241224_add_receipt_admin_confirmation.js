const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5435,
  database: process.env.DB_NAME || 'angkutan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'getsuga39',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function addAdminConfirmationFields() {
  const client = await pool.connect();
  
  try {
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
    
  } catch (error) {
    console.error('❌ Error adding admin confirmation fields:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigration() {
  try {
    console.log('🚀 Starting receipt admin confirmation migration...');
    
    await addAdminConfirmationFields();
    
    console.log('✅ Receipt admin confirmation migration completed successfully');
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
  addAdminConfirmationFields,
  runMigration
};




