// Comprehensive test script to run all test data scripts in sequence
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

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const runAllTestData = async () => {
  try {
    console.log("🚀 Starting comprehensive test data insertion for all modules...");
    console.log("=" * 80);

    // 1. Clean existing test data first
    console.log("\n🧹 Step 1: Cleaning existing test data...");
    try {
      await execAsync('node backend/tests/cleanup_test_data.js');
      console.log("✅ Test data cleaned successfully");
    } catch (error) {
      console.log("⚠️ Cleanup script not found or failed, continuing...");
    }

    // 2. Run basic test data (Module 2 - SPBG & CNG)
    console.log("\n📊 Step 2: Inserting Module 2 test data (SPBG & CNG)...");
    try {
      await execAsync('node backend/tests/insert_test_data.js');
      console.log("✅ Module 2 test data inserted successfully");
    } catch (error) {
      console.error("❌ Module 2 test data insertion failed:", error.message);
      throw error;
    }

    // 3. Run vehicle expense test data
    console.log("\n🚗 Step 3: Inserting Vehicle Expense test data...");
    try {
      await execAsync('node backend/tests/insert_vehicle_expense_test_data.js');
      console.log("✅ Vehicle Expense test data inserted successfully");
    } catch (error) {
      console.error("❌ Vehicle Expense test data insertion failed:", error.message);
      throw error;
    }

    // 4. Run cash coordinator test data
    console.log("\n👥 Step 4: Inserting Cash Coordinator test data...");
    try {
      await execAsync('node backend/tests/insert_cash_coordinator_test_data.js');
      console.log("✅ Cash Coordinator test data inserted successfully");
    } catch (error) {
      console.error("❌ Cash Coordinator test data insertion failed:", error.message);
      throw error;
    }

    // 5. Verify no conflicts
    console.log("\n🔍 Step 5: Verifying no conflicts...");
    await verifyNoConflicts();

    console.log("\n🎉 All test data inserted successfully without conflicts!");
    console.log("=" * 80);
    console.log("📋 Summary of inserted test data:");
    console.log("   - Module 2: SPBG & CNG transactions with filtering test data");
    console.log("   - Vehicle Expense: Vehicle-specific transactions with tempo functionality");
    console.log("   - Cash Coordinator: Coordinator-specific transactions and categories");
    console.log("   - Infrastructure: Inventory management test data");
    console.log("   - Deposit Groups: SPBG deposit management test data");
    console.log("   - Purchase Orders: SPBG-related purchase orders");

  } catch (error) {
    console.error("💥 Error during test data insertion:", error);
    process.exit(1);
  }
};

const verifyNoConflicts = async () => {
  const db = require(path.join(__dirname, '../src/utils/db'));
  
  try {
    // Check for duplicate reference numbers
    const duplicateRefs = await db.pool.query(`
      SELECT reference_number, COUNT(*) as count 
      FROM cash_transactions 
      GROUP BY reference_number 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateRefs.rows.length > 0) {
      console.error("❌ Found duplicate reference numbers:");
      duplicateRefs.rows.forEach(row => {
        console.error(`   - ${row.reference_number}: ${row.count} occurrences`);
      });
      throw new Error("Duplicate reference numbers found");
    }
    console.log("✅ No duplicate reference numbers found");

    // Check for duplicate vehicle license plates
    const duplicateVehicles = await db.pool.query(`
      SELECT license_plate, COUNT(*) as count 
      FROM vehicles 
      GROUP BY license_plate 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateVehicles.rows.length > 0) {
      console.error("❌ Found duplicate vehicle license plates:");
      duplicateVehicles.rows.forEach(row => {
        console.error(`   - ${row.license_plate}: ${row.count} occurrences`);
      });
      throw new Error("Duplicate vehicle license plates found");
    }
    console.log("✅ No duplicate vehicle license plates found");

    // Check for duplicate category names
    const duplicateCategories = await db.pool.query(`
      SELECT category_name, COUNT(*) as count 
      FROM cash_categories 
      GROUP BY category_name 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCategories.rows.length > 0) {
      console.error("❌ Found duplicate category names:");
      duplicateCategories.rows.forEach(row => {
        console.error(`   - ${row.category_name}: ${row.count} occurrences`);
      });
      throw new Error("Duplicate category names found");
    }
    console.log("✅ No duplicate category names found");

    // Get summary counts
    const totalTransactions = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions');
    const totalVehicles = await db.pool.query('SELECT COUNT(*) as total FROM vehicles');
    const totalCategories = await db.pool.query('SELECT COUNT(*) as total FROM cash_categories');
    const totalDepositGroups = await db.pool.query('SELECT COUNT(*) as total FROM deposit_groups');
    const totalPurchaseOrders = await db.pool.query('SELECT COUNT(*) as total FROM purchase_orders');

    console.log("\n📊 Final Data Summary:");
    console.log(`   - Total Transactions: ${totalTransactions.rows[0].total}`);
    console.log(`   - Total Vehicles: ${totalVehicles.rows[0].total}`);
    console.log(`   - Total Categories: ${totalCategories.rows[0].total}`);
    console.log(`   - Total Deposit Groups: ${totalDepositGroups.rows[0].total}`);
    console.log(`   - Total Purchase Orders: ${totalPurchaseOrders.rows[0].total}`);

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    throw error;
  } finally {
    await db.pool.end();
  }
};

// Run the comprehensive test
runAllTestData()
  .then(() => {
    console.log("🎉 All test data scripts completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test data insertion failed:", error);
    process.exit(1);
  });
