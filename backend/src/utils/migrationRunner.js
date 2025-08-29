const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
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
    
    this.migrationsDir = path.join(__dirname, '../migrations');
    this.migrationOrder = [
      'init.sql',
      'add_driver_locations_table.sql'
      // Add future migrations here in order
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
      
      // Run the migration SQL
      await this.pool.query(content);
      
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
  }
}

module.exports = MigrationRunner; 