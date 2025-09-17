const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { Sequelize } = require('sequelize');
require('dotenv').config();

class MigrationRunner {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      max: 5
    });
    
    // Initialize Sequelize for JS migrations
    this.sequelize = new Sequelize({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      dialect: 'postgres',
      logging: false
    });
    
    this.migrationsDir = path.join(__dirname, '../migrations');
    this.migrationOrder = [
      'init.sql',
      '20241223_create_exchange_rates.js',
      '20241224_create_iot_table.js',
      '20241225_add_expense_approval_fields.js',
      '20241226_create_budget_requests.js',
      'add_spbg_category.sql',
      'add_spbg_fields_to_existing.sql',
      '20241227_add_additional_unload_locations.js',
      'add_driver_locations_table.sql',
      '20241225_create_infrastructure_inventory.js',
      '20241225_add_cash_categories_unique_constraint.sql',
      '20241225_add_vehicle_id_to_cash_transactions.js',
      '20241228_create_gas_stations.js',
      '20250111_create_instant_budget_requests.js',
      '20250111_update_delivery_status_enum_simple.sql',
      '20250914_add_sim_expiry_date.js',
      '20250914_add_kir_expiry_date.js',
      '20250115_add_planned_route_distance.js',
      '20250117_add_nota_photo_url_to_delivery_orders.js'
    ];
  }

  async createMigrationTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum TEXT
      );
    `;
    await this.pool.query(query);
    console.log('✅ Migration tracking table ready');
  }

  async getMigrationChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async getExecutedMigrations() {
    try {
      const result = await this.pool.query('SELECT filename FROM schema_migrations ORDER BY id');
      return result.rows.map(row => row.filename);
    } catch (error) {
      // Table doesn't exist yet
      return [];
    }
  }

  async executeMigration(filename) {
    const filePath = path.join(this.migrationsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Migration file not found: ${filename}`);
      return false;
    }

    try {
      console.log(`🔄 Executing migration: ${filename}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const checksum = await this.getMigrationChecksum(content);
      
      // Execute the migration in a transaction
      await this.pool.query('BEGIN');
      
      if (filename.endsWith('.js')) {
        // Handle JavaScript/Sequelize migrations
        await this.executeJSMigration(filePath);
      } else {
        // Handle SQL migrations
        await this.pool.query(content);
      }
      
      // Record the migration
      await this.pool.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
        [filename, checksum]
      );
      
      await this.pool.query('COMMIT');
      console.log(`✅ Migration completed: ${filename}`);
      return true;
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`❌ Migration failed: ${filename}`, error.message);
      throw error;
    }
  }

  async executeJSMigration(filePath) {
    // Clear require cache to ensure fresh module load
    delete require.cache[require.resolve(filePath)];
    
    const migration = require(filePath);
    
    if (typeof migration.up !== 'function') {
      throw new Error('Migration must export an "up" function');
    }
    
    // Create queryInterface for Sequelize migrations
    const queryInterface = this.sequelize.getQueryInterface();
    
    // Execute the up migration
    await migration.up(queryInterface, this.sequelize.Sequelize);
  }

  async runMigrations() {
    try {
      console.log('🚀 Starting database migrations...');
      
      // Create migration tracking table
      await this.createMigrationTable();
      
      // Get already executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      console.log(`📊 Previously executed migrations: ${executedMigrations.length}`);
      
      // Run pending migrations
      let newMigrations = 0;
      for (const filename of this.migrationOrder) {
        if (!executedMigrations.includes(filename)) {
          await this.executeMigration(filename);
          newMigrations++;
        } else {
          console.log(`⏭️ Skipping already executed: ${filename}`);
        }
      }
      
      console.log(`✅ Migration check complete. ${newMigrations} new migrations executed.`);
      return true;
    } catch (error) {
      console.error('❌ Migration runner failed:', error);
      throw error;
    }
  }

  async checkMigrationStatus() {
    try {
      await this.createMigrationTable();
      const executedMigrations = await this.getExecutedMigrations();
      
      console.log('\n📊 Migration Status:');
      this.migrationOrder.forEach(filename => {
        const status = executedMigrations.includes(filename) ? '✅' : '❌';
        console.log(`${status} ${filename}`);
      });
      
      const pendingCount = this.migrationOrder.length - executedMigrations.length;
      if (pendingCount > 0) {
        console.log(`\n⚠️ ${pendingCount} migrations pending execution`);
        return false;
      } else {
        console.log('\n✅ All migrations are up to date');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to check migration status:', error);
      return false;
    }
  }

  async close() {
    await this.pool.end();
    await this.sequelize.close();
  }
}

module.exports = MigrationRunner; 