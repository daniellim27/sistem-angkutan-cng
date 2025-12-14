// Script to run seeder.sql
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Check if required environment variables are set
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these variables or create a .env file in the backend directory');
  process.exit(1);
}

const db = require('../src/utils/db');
const fs = require('fs');

const runSeeder = async () => {
  try {
    console.log("🌱 Starting seeder execution...");
    console.log("📄 Reading seeder.sql file...");

    // Read the seeder.sql file
    const seederPath = path.join(__dirname, '../src/migrations/seeder.sql');
    const seederSQL = fs.readFileSync(seederPath, 'utf8');

    // Split the SQL into individual statements (simple ';' splitter)
    // Keep any non-empty chunk – comments may be mixed with SQL.
    const statements = seederSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement with conflict handling
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // For INSERTs, make them idempotent; other statements run as-is
        const isInsert = /^INSERT\s+INTO\s/i.test(statement);
        const hasOnConflict = /ON\s+CONFLICT/i.test(statement);
        const modifiedStatement = isInsert && !hasOnConflict
          ? `${statement} ON CONFLICT DO NOTHING`
          : statement;

        await db.pool.query(modifiedStatement);
        console.log(`   ✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`   ⚠️  Statement ${i + 1} - Data already exists (skipped)`);
        } else {
          console.log(`   ❌ Statement ${i + 1} failed:`, error.message);
          throw error;
        }
      }
    }

    console.log("✅ Seeder execution completed!");

  } catch (error) {
    console.error("❌ Error running seeder:", error);
    throw error;
  }
};

// Run the seeder
runSeeder()
  .then(() => {
    console.log("🎉 Seeder completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeder failed:", error);
    process.exit(1);
  });
