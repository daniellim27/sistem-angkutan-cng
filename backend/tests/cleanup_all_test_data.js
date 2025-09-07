// Comprehensive cleanup script for all test data
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

const db = require(path.join(__dirname, '../src/utils/db'));

const cleanupAllTestData = async () => {
  try {
    console.log("🧹 Starting comprehensive test data cleanup...");
    console.log("=" * 60);

    // 1. Clean up cash coordinator test data
    console.log("\n👥 Cleaning Cash Coordinator test data...");
    await db.pool.query(`
      DELETE FROM cash_transactions 
      WHERE reference_number LIKE 'COORD-%' 
         OR account LIKE 'Coordinator%' 
         OR description LIKE '%koordinator%'
    `);
    console.log("   ✓ Cash Coordinator transactions deleted");

    await db.pool.query(`
      DELETE FROM cash_categories 
      WHERE category_name LIKE '%Coordinator%'
    `);
    console.log("   ✓ Cash Coordinator categories deleted");

    // 2. Clean up vehicle expense test data
    console.log("\n🚗 Cleaning Vehicle Expense test data...");
    await db.pool.query(`
      DELETE FROM cash_transactions 
      WHERE reference_number LIKE 'VEH-%' 
         OR vehicle_id IS NOT NULL
    `);
    console.log("   ✓ Vehicle expense transactions deleted");

    await db.pool.query(`
      DELETE FROM vehicles 
      WHERE license_plate IN ('B1234ABC', 'B5678DEF', 'B9012GHI', 'B3456JKL', 'B7890MNO')
    `);
    console.log("   ✓ Test vehicles deleted");

    await db.pool.query(`
      DELETE FROM cash_categories 
      WHERE category_name IN (
        'Bahan Bakar', 'Servis Kendaraan', 'Perbaikan', 'Asuransi Kendaraan', 
        'Parkir', 'Tol', 'Pajak Kendaraan', 'STNK', 'Ban', 'Oli', 
        'Spare Part', 'Cuci Kendaraan', 'Maintenance'
      )
    `);
    console.log("   ✓ Vehicle expense categories deleted");

    // 3. Clean up Module 2 test data
    console.log("\n📊 Cleaning Module 2 test data...");
    await db.pool.query(`
      DELETE FROM purchase_orders WHERE deposit_group_id IS NOT NULL
    `);
    console.log("   ✓ Purchase orders with deposit groups deleted");

    await db.pool.query(`
      DELETE FROM purchase_orders WHERE po_number LIKE 'PO/SPBG-TEST%'
    `);
    console.log("   ✓ Test purchase orders deleted");

    await db.pool.query(`
      DELETE FROM deposit_groups WHERE group_name LIKE '%SPBG%'
    `);
    console.log("   ✓ SPBG deposit groups deleted");

    await db.pool.query(`
      DELETE FROM cash_transactions 
      WHERE reference_number LIKE 'MOD2-%' 
         OR reference_number LIKE 'SPBG-%' 
         OR reference_number LIKE 'CNG-%' 
         OR reference_number LIKE 'REFUND-%'
    `);
    console.log("   ✓ Module 2 cash transactions deleted");

    await db.pool.query(`
      DELETE FROM cash_categories 
      WHERE category_name IN (
        'CNG Fuel Purchase', 'CNG Equipment Maintenance', 'CNG Insurance', 
        'SPBG Deposit', 'SPBG Refund', 'SPBG Gas Filling'
      )
    `);
    console.log("   ✓ Module 2 cash categories deleted");

    // 4. Clean up infrastructure test data
    console.log("\n🏗️ Cleaning Infrastructure test data...");
    await db.pool.query(`
      DELETE FROM infrastructure_transactions 
      WHERE reference_type = 'initial_stock'
    `);
    console.log("   ✓ Infrastructure transactions deleted");

    await db.pool.query(`
      DELETE FROM infrastructure_batches 
      WHERE batch_number LIKE 'BATCH-INF-%'
    `);
    console.log("   ✓ Infrastructure batches deleted");

    await db.pool.query(`
      DELETE FROM infrastructure_items 
      WHERE item_code LIKE 'INF-%'
    `);
    console.log("   ✓ Infrastructure items deleted");

    await db.pool.query(`
      DELETE FROM infrastructure_locations 
      WHERE location_name IN (
        'Jakarta Central Depot', 'Bandung Regional Hub', 'Surabaya Port Facility',
        'Medan Distribution Center', 'Makassar Logistics Base', 'Yogyakarta Workshop'
      )
    `);
    console.log("   ✓ Infrastructure locations deleted");

    await db.pool.query(`
      DELETE FROM infrastructure_categories 
      WHERE category_name IN (
        'Heavy Machinery', 'Transportation Equipment', 'Safety Equipment',
        'Tools & Instruments', 'Communication Systems', 'Power & Electrical'
      )
    `);
    console.log("   ✓ Infrastructure categories deleted");

    // 5. Clean up any remaining test data
    console.log("\n🧽 Cleaning remaining test data...");
    await db.pool.query(`
      DELETE FROM cash_transactions 
      WHERE reference_number LIKE 'TEST-%' 
         OR reference_number LIKE 'MODAL-%' 
         OR reference_number LIKE 'PENDAPATAN-%' 
         OR reference_number LIKE 'KANTOR-%' 
         OR reference_number LIKE 'GAJI-%' 
         OR reference_number LIKE 'ASET-%' 
         OR reference_number LIKE 'BBM-%' 
         OR reference_number LIKE 'SEWA-%'
    `);
    console.log("   ✓ Remaining test transactions deleted");

    // 6. Get final counts
    const transactionCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions');
    const vehicleCount = await db.pool.query('SELECT COUNT(*) as total FROM vehicles');
    const categoryCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_categories');
    const depositGroupCount = await db.pool.query('SELECT COUNT(*) as total FROM deposit_groups');
    const purchaseOrderCount = await db.pool.query('SELECT COUNT(*) as total FROM purchase_orders');
    const infraItemCount = await db.pool.query('SELECT COUNT(*) as total FROM infrastructure_items');

    console.log("\n📊 Final Database State:");
    console.log(`   - Cash Transactions: ${transactionCount.rows[0].total}`);
    console.log(`   - Vehicles: ${vehicleCount.rows[0].total}`);
    console.log(`   - Cash Categories: ${categoryCount.rows[0].total}`);
    console.log(`   - Deposit Groups: ${depositGroupCount.rows[0].total}`);
    console.log(`   - Purchase Orders: ${purchaseOrderCount.rows[0].total}`);
    console.log(`   - Infrastructure Items: ${infraItemCount.rows[0].total}`);

    console.log("\n✅ All test data cleaned successfully!");
    console.log("=" * 60);

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await db.pool.end();
  }
};

// Run the cleanup
cleanupAllTestData()
  .then(() => {
    console.log("🎉 Comprehensive test data cleanup completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Cleanup failed:", error);
    process.exit(1);
  });
