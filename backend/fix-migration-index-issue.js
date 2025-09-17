// fix-migration-index-issue.js
const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'angkutan_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: false,
});

async function fixMigrationIssue() {
  try {
    console.log('🔧 Fixing migration index issue...');
    
    // Check if budget_requests table exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'budget_requests'
    `);
    
    if (tables.length === 0) {
      console.log('❌ budget_requests table does not exist. Running migration...');
      
      // Run the migration
      const { execSync } = require('child_process');
      execSync('npm run migrate', { stdio: 'inherit' });
      
    } else {
      console.log('✅ budget_requests table exists. Checking indexes...');
      
      // Check if the problematic index exists
      const [indexes] = await sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'budget_requests' 
        AND indexname = 'budget_requests_delivery_order_id'
      `);
      
      if (indexes.length > 0) {
        console.log('✅ Index budget_requests_delivery_order_id already exists');
        
        // Mark the migration as completed
        await sequelize.query(`
          INSERT INTO "SequelizeMeta" (name) 
          VALUES ('20250111_create_instant_budget_requests.js')
          ON CONFLICT (name) DO NOTHING
        `);
        
        console.log('✅ Migration marked as completed');
      } else {
        console.log('❌ Index does not exist. Creating it...');
        
        // Create the missing index
        await sequelize.query(`
          CREATE INDEX "budget_requests_delivery_order_id" 
          ON "budget_requests" ("delivery_order_id")
        `);
        
        console.log('✅ Index created successfully');
      }
    }
    
    // Now run the OCR migration
    console.log('🔄 Running OCR migration...');
    const { execSync } = require('child_process');
    execSync('npm run migrate', { stdio: 'inherit' });
    
    console.log('✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing migration:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixMigrationIssue();

