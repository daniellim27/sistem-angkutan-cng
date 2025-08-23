const { Pool } = require('pg');
require('dotenv').config();

async function fixMigrations() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('🔧 Fixing migration tracking...');

    // Create migration tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum TEXT
      );
    `);

    // Check if users table exists (indicating init.sql was run)
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ Users table exists - marking init.sql as completed');
      
      // Mark init.sql as completed
      await pool.query(`
        INSERT INTO schema_migrations (filename, checksum) 
        VALUES ('init.sql', 'manually-marked') 
        ON CONFLICT (filename) DO NOTHING
      `);
      
      console.log('✅ Migration tracking fixed');
    } else {
      console.log('❌ Users table does not exist - run fresh migration instead');
    }

  } catch (error) {
    console.error('❌ Error fixing migrations:', error.message);
  } finally {
    await pool.end();
  }
}

fixMigrations(); 