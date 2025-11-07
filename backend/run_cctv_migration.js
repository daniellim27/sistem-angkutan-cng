/**
 * Script to run CCTV monitoring migration
 * 
 * Usage:
 *   node run_cctv_migration.js up    # Create tables
 *   node run_cctv_migration.js down  # Drop tables
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const migration = require('./src/migrations/20250101_create_cctv_monitoring');

// Initialize database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  String(process.env.DB_PASSWORD),
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

async function runMigration() {
  const command = process.argv[2] || 'up';
  
  console.log('==========================================');
  console.log('CCTV Monitoring Migration');
  console.log('==========================================\n');
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');
    
    // Run migration
    if (command === 'up') {
      console.log('Running migration UP (creating tables)...\n');
      await migration.up(sequelize.getQueryInterface(), Sequelize);
      console.log('\n✅ Migration completed successfully!');
      console.log('\nYou can now use the CCTV monitoring tables:');
      console.log('  - cctv_sessions');
      console.log('  - cctv_screenshots');
    } else if (command === 'down') {
      console.log('Running migration DOWN (dropping tables)...\n');
      await migration.down(sequelize.getQueryInterface(), Sequelize);
      console.log('\n✅ Migration rollback completed successfully!');
    } else {
      console.error('Invalid command. Use "up" or "down"');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
runMigration();

