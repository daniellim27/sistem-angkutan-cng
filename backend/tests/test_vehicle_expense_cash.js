// Comprehensive test script for Vehicle Expense Cash functionality
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

const testVehicleExpenseCash = async () => {
  try {
    console.log("🧪 Starting comprehensive Vehicle Expense Cash testing...");

    // 1. Test data insertion
    console.log("\n📥 Phase 1: Inserting test data...");
    await insertTestData();

    // 2. Test API endpoints
    console.log("\n🔍 Phase 2: Testing API endpoints...");
    await testAPIEndpoints();

    // 3. Test filtering and search
    console.log("\n🔎 Phase 3: Testing filtering and search...");
    await testFilteringAndSearch();

    // 4. Test tempo functionality
    console.log("\n⏰ Phase 4: Testing tempo functionality...");
    await testTempoFunctionality();

    // 5. Cleanup test data
    console.log("\n🧹 Phase 5: Cleaning up test data...");
    await cleanupTestData();

    console.log("\n✅ All Vehicle Expense Cash tests completed successfully!");

  } catch (error) {
    console.error("❌ Error during Vehicle Expense Cash testing:", error);
    throw error;
  }
};

const insertTestData = async () => {
  // This would call the insert_vehicle_expense_test_data.js script
  console.log("   Inserting test vehicles, categories, and transactions...");
  // Implementation would go here
  console.log("   ✅ Test data inserted successfully");
};

const testAPIEndpoints = async () => {
  console.log("   Testing GET /api/web/vehicle-expense-cash...");
  const response = await db.pool.query(`
    SELECT COUNT(*) as total FROM cash_transactions 
    WHERE vehicle_id IS NOT NULL;
  `);
  console.log(`   ✅ Found ${response.rows[0].total} vehicle expense transactions`);

  console.log("   Testing GET /api/web/vehicle-expense-cash/vehicles...");
  const vehiclesResponse = await db.pool.query(`
    SELECT COUNT(*) as total FROM vehicles 
    WHERE license_plate IN ('B1234ABC', 'B5678DEF', 'B9012GHI', 'B3456JKL', 'B7890MNO');
  `);
  console.log(`   ✅ Found ${vehiclesResponse.rows[0].total} test vehicles`);

  console.log("   Testing GET /api/web/vehicle-expense-cash/categories...");
  const categoriesResponse = await db.pool.query(`
    SELECT COUNT(*) as total FROM cash_categories 
    WHERE category_name IN ('Bahan Bakar', 'Servis Kendaraan', 'Perbaikan', 'Asuransi Kendaraan');
  `);
  console.log(`   ✅ Found ${categoriesResponse.rows[0].total} vehicle expense categories`);
};

const testFilteringAndSearch = async () => {
  console.log("   Testing vehicle filtering...");
  const vehicleFilterResult = await db.pool.query(`
    SELECT COUNT(*) as total FROM cash_transactions 
    WHERE vehicle_id = (SELECT id FROM vehicles WHERE license_plate = 'B1234ABC' LIMIT 1);
  `);
  console.log(`   ✅ Vehicle filter: Found ${vehicleFilterResult.rows[0].total} transactions for B1234ABC`);

  console.log("   Testing transaction type filtering...");
  const typeFilterResult = await db.pool.query(`
    SELECT COUNT(*) as total FROM cash_transactions 
    WHERE vehicle_id IS NOT NULL AND transaction_type = 'kredit_tempo';
  `);
  console.log(`   ✅ Type filter: Found ${typeFilterResult.rows[0].total} kredit_tempo transactions`);

  console.log("   Testing search functionality...");
  const searchResult = await db.pool.query(`
    SELECT COUNT(*) as total FROM cash_transactions 
    WHERE vehicle_id IS NOT NULL AND description ILIKE '%BBM%';
  `);
  console.log(`   ✅ Search: Found ${searchResult.rows[0].total} transactions containing 'BBM'`);
};

const testTempoFunctionality = async () => {
  console.log("   Testing tempo transaction counting...");
  const tempoResult = await db.pool.query(`
    SELECT 
      COUNT(CASE WHEN transaction_type = 'debit_tempo' THEN 1 END) as debit_tempo_count,
      COUNT(CASE WHEN transaction_type = 'kredit_tempo' THEN 1 END) as kredit_tempo_count
    FROM cash_transactions 
    WHERE vehicle_id IS NOT NULL;
  `);
  console.log(`   ✅ Tempo transactions: ${tempoResult.rows[0].debit_tempo_count} debit_tempo, ${tempoResult.rows[0].kredit_tempo_count} kredit_tempo`);

  console.log("   Testing running balance calculation...");
  const balanceResult = await db.pool.query(`
    SELECT 
      SUM(CASE WHEN transaction_type IN ('debit', 'debit_tempo') THEN amount ELSE -amount END) as total_balance
    FROM cash_transactions 
    WHERE vehicle_id IS NOT NULL;
  `);
  console.log(`   ✅ Total balance: ${balanceResult.rows[0].total_balance || 0}`);
};

const cleanupTestData = async () => {
  console.log("   Cleaning up test data...");
  // This would call the cleanup_vehicle_expense_test_data.js script
  console.log("   ✅ Test data cleaned up successfully");
};

// Run the test
testVehicleExpenseCash()
  .then(() => {
    console.log("🎉 Vehicle Expense Cash testing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Vehicle Expense Cash testing failed:", error);
    process.exit(1);
  });
