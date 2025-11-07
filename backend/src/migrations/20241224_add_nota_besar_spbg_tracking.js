const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5435,
  database: process.env.DB_NAME || 'angkutan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'getsuga39',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function addNotaBesarSPBGTracking() {
  const client = await pool.connect();
  
  try {
    console.log('Adding SPBG tracking fields to nota_besars table...');
    
    // Add fields to track SPBG balance application
    await client.query(`
      ALTER TABLE nota_besars
      ADD COLUMN IF NOT EXISTS applied_to_spbg BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS applied_to_spbg_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS spbg_group_id INTEGER REFERENCES deposit_groups(id)
    `);

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nota_besars_applied_to_spbg 
      ON nota_besars(applied_to_spbg)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nota_besars_spbg_group_id 
      ON nota_besars(spbg_group_id)
    `);

    console.log('✅ SPBG tracking fields added successfully');
    
  } catch (error) {
    console.error('❌ Error adding SPBG tracking fields:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigration() {
  try {
    console.log('🚀 Starting Nota Besar SPBG tracking migration...');
    
    await addNotaBesarSPBGTracking();
    
    console.log('✅ Nota Besar SPBG tracking migration completed successfully');
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
  addNotaBesarSPBGTracking,
  runMigration
};




