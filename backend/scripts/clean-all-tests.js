// Script to clean up all test data
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

const runCleanupScript = async (scriptPath, scriptName) => {
  try {
    console.log(`\n🧹 Running ${scriptName}...`);
    console.log('-' .repeat(40));
    
    // Clear require cache to ensure fresh module loading
    delete require.cache[require.resolve(scriptPath)];
    
    // The cleanup scripts run immediately when required, so we just require them
    // and they will execute their cleanup logic
    require(scriptPath);
    
    console.log(`✅ ${scriptName} completed successfully`);
  } catch (error) {
    console.error(`❌ Error running ${scriptName}:`, error.message);
    throw error;
  }
};

const cleanAllTests = async () => {
  try {
    console.log('🧹 Starting comprehensive test data cleanup...');
    console.log('This will remove all test data from the database');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    // Define cleanup scripts in order of execution (reverse dependency order)
    const cleanupScripts = [
      {
        path: path.join(__dirname, '../tests/cleanup_vehicle_expense_test_data.js'),
        name: 'Vehicle Expense Test Data Cleanup'
      },
      {
        path: path.join(__dirname, '../tests/cleanup_test_data.js'),
        name: 'Module 2 Test Data Cleanup (SPBG & CNG)'
      }
    ];
    
    // Run each cleanup script
    for (const cleanupScript of cleanupScripts) {
      await runCleanupScript(cleanupScript.path, cleanupScript.name);
    }
    
    // Additional cleanup for Cash Coordinator data (no specific cleanup script)
    console.log('\n🧹 Running Cash Coordinator Test Data Cleanup...');
    console.log('-' .repeat(40));
    await cleanupCashCoordinatorData();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 All test data cleanup completed successfully!');
    console.log('=' .repeat(60));
    console.log(`⏱️  Total execution time: ${duration} seconds`);
    console.log('\n📊 Cleanup Summary:');
    console.log('   ✅ Module 2 (SPBG & CNG) test data removed');
    console.log('   ✅ Cash Coordinator test data removed');
    console.log('   ✅ Vehicle Expense test data removed');
    console.log('\n💡 Database is now clean and ready for fresh test data');
    
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test data cleanup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check database connection');
    console.error('   2. Ensure you have proper permissions');
    console.error('   3. Check individual cleanup scripts for specific errors');
    console.error('   4. Some data might be referenced by foreign keys');
    process.exit(1);
  }
};

// Cleanup function for Cash Coordinator data
const cleanupCashCoordinatorData = async () => {
  const db = require(path.join(__dirname, '../src/utils/db'));
  
  try {
    // Delete Cash Coordinator transactions
    const deleteTransactionsResult = await db.pool.query(`
      DELETE FROM cash_transactions 
      WHERE reference_number LIKE 'COORD-%' 
         OR reference_number LIKE 'TRAVEL-%'
         OR reference_number LIKE 'COMM-%'
         OR reference_number LIKE 'TRAIN-%'
         OR reference_number LIKE 'EQUIP-%'
         OR reference_number LIKE 'BONUS-%'
         OR reference_number LIKE 'COMMISSION-%'
         OR reference_number LIKE 'ALLOWANCE-%'
         OR description LIKE '%Coordinator%'
         OR account LIKE '%Coordinator%'
    `);
    console.log(`   ✓ Deleted ${deleteTransactionsResult.rowCount} Cash Coordinator transactions`);
    
    // Delete Cash Coordinator categories
    const deleteCategoriesResult = await db.pool.query(`
      DELETE FROM cash_categories 
      WHERE category_name LIKE '%Coordinator%'
    `);
    console.log(`   ✓ Deleted ${deleteCategoriesResult.rowCount} Cash Coordinator categories`);
    
    console.log('✅ Cash Coordinator test data cleanup completed');
  } catch (error) {
    console.error('❌ Error cleaning up Cash Coordinator data:', error.message);
    throw error;
  }
};

// Handle script execution
if (require.main === module) {
  cleanAllTests();
}

module.exports = cleanAllTests;
