const path = require('path');
const { sequelize } = require('../models');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cctv_sessions' 
      AND column_name = 'meter_type'
    `);

    if (results.length > 0) {
      console.log('✅ meter_type column already exists');
      await sequelize.close();
      process.exit(0);
    }

    console.log('📝 Running migration to add meter_type column...');
    const migration = require('../migrations/20250117_add_meter_type_to_cctv_sessions.js');
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ Migration completed successfully');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();

