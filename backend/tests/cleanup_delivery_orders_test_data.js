// Script to cleanup delivery orders test data
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

const cleanupDeliveryOrdersTestData = async () => {
  try {
    console.log("🧹 Starting delivery orders test data cleanup...");

    // 1. Delete delivery orders test data (DO numbers starting with DO-2025-)
    console.log("📦 Cleaning up delivery orders...");
    const deleteDOsResult = await db.pool.query(`
      DELETE FROM delivery_orders 
      WHERE do_number LIKE 'DO-2025-%'
    `);
    console.log(`✅ Deleted ${deleteDOsResult.rowCount} delivery orders`);

    // 2. Delete test drivers (usernames starting with driver00)
    console.log("👨‍💼 Cleaning up test drivers...");
    const deleteDriversResult = await db.pool.query(`
      DELETE FROM users 
      WHERE username LIKE 'driver00%'
    `);
    console.log(`✅ Deleted ${deleteDriversResult.rowCount} test drivers`);

    // 3. Get final summary
    console.log("\n📊 Getting final summary...");
    const totalDOs = await db.pool.query('SELECT COUNT(*) as total FROM delivery_orders');
    const totalDrivers = await db.pool.query('SELECT COUNT(*) as total FROM users WHERE role = \'driver\'');
    const totalVehicles = await db.pool.query('SELECT COUNT(*) as total FROM vehicles');

    console.log("\n🎉 Delivery Orders test data cleanup completed successfully!");
    console.log("=" * 80);
    console.log("📋 Final Summary:");
    console.log(`   - Total Delivery Orders: ${totalDOs.rows[0].total}`);
    console.log(`   - Total Drivers: ${totalDrivers.rows[0].total}`);
    console.log(`   - Total Vehicles: ${totalVehicles.rows[0].total}`);
    console.log("=" * 80);

  } catch (error) {
    console.error("💥 Error cleaning up delivery orders test data:", error);
    throw error;
  } finally {
    await db.pool.end();
  }
};

// Run the cleanup
cleanupDeliveryOrdersTestData()
  .then(() => {
    console.log("🎉 Delivery Orders test data cleanup completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Delivery Orders test data cleanup failed:", error);
    process.exit(1);
  });
