const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5435,
  database: process.env.DB_NAME || 'angkutan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'getsuga39',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function cleanupSPBGColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Cleaning up SPBG-related columns from nota_besars...');
    
    // First, verify that all nota_besars have customer_id
    const unmappedCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM nota_besars 
      WHERE customer_id IS NULL
    `);
    
    const unmapped = parseInt(unmappedCount.rows[0].count);
    
    if (unmapped > 0) {
      console.log(`\n⚠️  WARNING: ${unmapped} nota_besars still have NULL customer_id`);
      console.log('Please run the data migration script first!');
      console.log('Aborting cleanup...');
      return;
    }
    
    console.log('✅ All nota_besars have customer_id assigned');
    
    // Drop SPBG-related indexes
    console.log('\nDropping SPBG-related indexes...');
    await client.query(`
      DROP INDEX IF EXISTS idx_nota_besars_spbg_group_id
    `);
    await client.query(`
      DROP INDEX IF EXISTS idx_nota_besars_applied_to_spbg
    `);
    
    // Drop SPBG-related columns
    console.log('Dropping SPBG-related columns...');
    await client.query(`
      ALTER TABLE nota_besars
      DROP COLUMN IF EXISTS spbg_group_id,
      DROP COLUMN IF EXISTS applied_to_spbg,
      DROP COLUMN IF EXISTS applied_to_spbg_at
    `);
    
    console.log('✅ SPBG columns removed successfully');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function runCleanup() {
  try {
    console.log('🚀 Starting SPBG Cleanup...\n');
    
    await cleanupSPBGColumns();
    
    console.log('\n✅ Cleanup completed successfully');
    console.log('\n📝 Nota Besar is now fully migrated to customer-based system');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  runCleanup();
}

module.exports = {
  cleanupSPBGColumns,
  runCleanup
};


