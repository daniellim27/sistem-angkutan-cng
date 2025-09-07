#!/usr/bin/env node
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

const MigrationRunner = require('../src/utils/migrationRunner');

async function main() {
  const runner = new MigrationRunner();
  
  try {
    const isUpToDate = await runner.checkMigrationStatus();
    
    if (!isUpToDate) {
      console.log('\n💡 Run `npm run migrate` to execute pending migrations');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Failed to check migration status:', error.message);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

if (require.main === module) {
  main();
} 