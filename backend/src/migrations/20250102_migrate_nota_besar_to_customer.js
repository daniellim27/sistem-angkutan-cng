const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'angkutan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function migrateNotaBesarToCustomer() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting Nota Besar to Customer migration...');
    
    // Step 1: Add customer_id column to nota_besars
    console.log('Adding customer_id column to nota_besars...');
    await client.query(`
      ALTER TABLE nota_besars
      ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id),
      ADD COLUMN IF NOT EXISTS applied_to_customer BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS applied_to_customer_at TIMESTAMP
    `);

    // Step 2: Create index for customer_id
    console.log('Creating index on customer_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nota_besars_customer_id 
      ON nota_besars(customer_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nota_besars_applied_to_customer 
      ON nota_besars(applied_to_customer)
    `);

    console.log('✅ Schema changes completed');

    // Step 3: Drop SPBG-related columns (will do this after data migration)
    console.log('⚠️  SPBG columns will be removed after data migration is complete');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigration() {
  try {
    console.log('🚀 Starting Nota Besar Customer migration...');
    
    await migrateNotaBesarToCustomer();
    
    console.log('✅ Migration completed successfully');
    console.log('📝 Next step: Run data migration script to populate customer_id');
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
  migrateNotaBesarToCustomer,
  runMigration
};


