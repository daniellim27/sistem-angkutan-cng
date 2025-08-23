#!/usr/bin/env node

const MigrationRunner = require('../src/utils/migrationRunner');

async function main() {
  const runner = new MigrationRunner();
  
  try {
    await runner.runMigrations();
    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = main; 