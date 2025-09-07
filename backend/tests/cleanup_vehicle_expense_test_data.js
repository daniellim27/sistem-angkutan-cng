// Script to cleanup Vehicle Expense Cash test data
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

const cleanupVehicleExpenseTestData = async () => {
  try {
    console.log("🧹 Starting Vehicle Expense Cash test data cleanup...");

    // 1. Delete vehicle expense transactions
    console.log("🗑️ Deleting vehicle expense transactions...");
    const deleteTransactionsResult = await db.pool.query(`
      DELETE FROM cash_transactions 
      WHERE description LIKE '%B1234ABC%' 
         OR description LIKE '%B5678DEF%' 
         OR description LIKE '%B9012GHI%' 
         OR description LIKE '%B3456JKL%' 
         OR description LIKE '%B7890MNO%'
         OR reference_number LIKE 'FUEL-%'
         OR reference_number LIKE 'SERVICE-%'
         OR reference_number LIKE 'REPAIR-%'
         OR reference_number LIKE 'INS-%'
         OR reference_number LIKE 'TOLL-%'
         OR reference_number LIKE 'TIRE-%'
         OR reference_number LIKE 'OIL-%'
         OR reference_number LIKE 'SPARE-%'
         OR reference_number LIKE 'MAINT-%'
         OR reference_number LIKE 'GEN-%'
         OR reference_number LIKE 'BUILD-%'
         OR no_nota::text LIKE '%NOTA-FUEL%'
         OR no_nota::text LIKE '%NOTA-SERVICE%'
         OR no_nota::text LIKE '%NOTA-REPAIR%'
         OR no_nota::text LIKE '%NOTA-INS%'
         OR no_nota::text LIKE '%NOTA-TOLL%'
         OR no_nota::text LIKE '%NOTA-TIRE%'
         OR no_nota::text LIKE '%NOTA-OIL%'
         OR no_nota::text LIKE '%NOTA-SPARE%'
         OR no_nota::text LIKE '%NOTA-MAINT%'
         OR no_nota::text LIKE '%NOTA-GEN%'
         OR no_nota::text LIKE '%NOTA-BUILD%';
    `);
    console.log(`   Deleted ${deleteTransactionsResult.rowCount} vehicle expense transactions`);

    // 2. Delete test vehicles (only if they were created by this script)
    console.log("🚗 Deleting test vehicles...");
    const deleteVehiclesResult = await db.pool.query(`
      DELETE FROM vehicles 
      WHERE license_plate IN ('B1234ABC', 'B5678DEF', 'B9012GHI', 'B3456JKL', 'B7890MNO')
        AND created_at > NOW() - INTERVAL '1 hour';
    `);
    console.log(`   Deleted ${deleteVehiclesResult.rowCount} test vehicles`);

    // 3. Delete vehicle expense categories (only if they were created by this script)
    console.log("📝 Deleting vehicle expense categories...");
    const deleteCategoriesResult = await db.pool.query(`
      DELETE FROM cash_categories 
      WHERE category_name IN (
        'Bahan Bakar', 'Servis Kendaraan', 'Perbaikan', 'Asuransi Kendaraan', 
        'Parkir', 'Tol', 'Pajak Kendaraan', 'STNK', 'Ban', 'Oli', 
        'Spare Part', 'Cuci Kendaraan', 'Maintenance'
      ) AND created_at > NOW() - INTERVAL '1 hour';
    `);
    console.log(`   Deleted ${deleteCategoriesResult.rowCount} vehicle expense categories`);

    console.log("✅ Vehicle Expense Cash test data cleanup completed successfully!");

  } catch (error) {
    console.error("❌ Error cleaning up vehicle expense test data:", error);
    throw error;
  }
};

// Run the script
cleanupVehicleExpenseTestData()
  .then(() => {
    console.log("🎉 Vehicle Expense Cash test data cleanup completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Failed to cleanup vehicle expense test data:", error);
    process.exit(1);
  });
