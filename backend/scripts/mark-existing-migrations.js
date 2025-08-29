#!/usr/bin/env node

const MigrationRunner = require('../src/utils/migrationRunner');

async function markExistingMigrations() {
  const runner = new MigrationRunner();
  
  try {
    console.log('🔧 Marking existing migrations as completed...');
    
    // Create migration tracking table
    await runner.createMigrationTable();
    
    // Check which tables already exist
    const result = await runner.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const existingTables = result.rows.map(row => row.table_name);
    console.log(`📊 Found ${existingTables.length} existing tables`);
    
    // Check if core tables exist (indicating init.sql was already run)
    const coreTables = ['users', 'vehicles', 'delivery_orders', 'purchase_orders'];
    const hasCoreTables = coreTables.every(table => existingTables.includes(table));
    
    if (hasCoreTables) {
      console.log('✅ Core tables detected - marking init.sql as completed');
      const initContent = require('fs').readFileSync(
        require('path').join(runner.migrationsDir, 'init.sql'), 
        'utf8'
      );
      const checksum = await runner.getMigrationChecksum(initContent);
      
      await runner.pool.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
        ['init.sql', checksum]
      );
    }
    
    // Check if driver_locations table exists
    if (existingTables.includes('driver_locations')) {
      console.log('✅ GPS tracking tables detected - marking add_driver_locations_table.sql as completed');
      const gpsContent = require('fs').readFileSync(
        require('path').join(runner.migrationsDir, 'add_driver_locations_table.sql'), 
        'utf8'
      );
      const checksum = await runner.getMigrationChecksum(gpsContent);
      
      await runner.pool.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
        ['add_driver_locations_table.sql', checksum]
      );
    }
    
    // Show final status
    const executedMigrations = await runner.getExecutedMigrations();
    console.log('\n📊 Updated Migration Status:');
    runner.migrationOrder.forEach(filename => {
      const status = executedMigrations.includes(filename) ? '✅' : '❌';
      console.log(`${status} ${filename}`);
    });
    
    console.log('\n🎉 Migration status updated successfully!');
    console.log('💡 Run `npm run migrate` to execute any remaining pending migrations');
    
  } catch (error) {
    console.error('\n💥 Failed to mark existing migrations:', error.message);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

if (require.main === module) {
  markExistingMigrations();
}

module.exports = markExistingMigrations; 