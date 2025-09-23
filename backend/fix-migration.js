require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixMigration() {
  try {
    console.log('🔧 Creating migration tracking table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migration_tracking (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'completed'
      );
    `);
    
    console.log('✅ Migration tracking table created');
    
    console.log('🔧 Manually marking problematic migration as completed...');
    
    await pool.query(`
      INSERT INTO migration_tracking (migration_name, executed_at, status)
      VALUES ('20241225_add_vehicle_id_to_cash_transactions.js', NOW(), 'completed')
      ON CONFLICT (migration_name) DO UPDATE SET status = 'completed';
    `);
    
    console.log('✅ Migration marked as completed');
    
    await pool.end();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

fixMigration();
