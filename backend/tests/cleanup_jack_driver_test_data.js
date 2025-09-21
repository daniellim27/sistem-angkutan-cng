// Script to cleanup Jack Driver specific test data
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

const cleanupJackDriverTestData = async () => {
  try {
    console.log("🧹 Starting Jack Driver test data cleanup...");

    // 1. Get Jack's user ID
    console.log("👨‍💼 Getting Jack Driver user ID...");
    const jackResult = await db.pool.query(`
      SELECT id, username 
      FROM users 
      WHERE username = 'jack_driver' AND role = 'driver'
    `);

    if (jackResult.rows.length === 0) {
      console.log("⚠️ Jack Driver user not found. Nothing to cleanup.");
      return;
    }

    const jack = jackResult.rows[0];
    console.log(`✅ Found Jack Driver: ID ${jack.id}, Username: ${jack.username}`);

    // 2. Delete Jack's delivery orders (DO numbers starting with JACK-)
    console.log("📦 Cleaning up Jack's delivery orders...");
    const deleteDOsResult = await db.pool.query(`
      DELETE FROM delivery_orders 
      WHERE driver_id = $1 AND do_number LIKE 'JACK-%'
    `, [jack.id]);
    console.log(`✅ Deleted ${deleteDOsResult.rowCount} Jack's delivery orders`);

    // 3. Get final summary
    console.log("\n📊 Getting final summary...");
    const jackDOs = await db.pool.query(`
      SELECT COUNT(*) as total 
      FROM delivery_orders 
      WHERE driver_id = $1 AND do_number LIKE 'JACK-%'
    `, [jack.id]);

    const totalDOs = await db.pool.query('SELECT COUNT(*) as total FROM delivery_orders');
    const totalDrivers = await db.pool.query('SELECT COUNT(*) as total FROM users WHERE role = \'driver\'');

    console.log("\n🎉 Jack Driver test data cleanup completed successfully!");
    console.log("=" * 80);
    console.log("📋 Final Summary:");
    console.log(`   - Jack's Remaining Delivery Orders: ${jackDOs.rows[0].total}`);
    console.log(`   - Total Delivery Orders in System: ${totalDOs.rows[0].total}`);
    console.log(`   - Total Drivers: ${totalDrivers.rows[0].total}`);
    console.log("=" * 80);

  } catch (error) {
    console.error("💥 Error cleaning up Jack Driver test data:", error);
    throw error;
  } finally {
    await db.pool.end();
  }
};

// Run the cleanup
cleanupJackDriverTestData()
  .then(() => {
    console.log("🎉 Jack Driver test data cleanup completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Jack Driver test data cleanup failed:", error);
    process.exit(1);
  });
