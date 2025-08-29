#!/usr/bin/env node

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