// Script to add SPBG fields to existing database
const fs = require("fs");
const path = require("path");
const db = require("./src/utils/db");

const runSPBGMigration = async () => {
  try {
    console.log("🚀 Starting SPBG fields migration...");
    
    // Read the migration SQL file
    const sql = fs
      .readFileSync(path.resolve(__dirname, "src/migrations/add_spbg_fields_to_existing.sql"))
      .toString();
    
    console.log("📝 Executing SPBG migration...");
    
    // Execute the migration
    await db.pool.query(sql);
    
    console.log("✅ SPBG migration completed successfully!");
    console.log("🎯 Your database now has all SPBG fields:");
    console.log("   - cash_transactions: spbg_location, gas_volume_m3, calculation_method, jisdor_rate, gas_filling_cost");
    console.log("   - deposit_groups: group_type, spbg_location, spbg_operator, gas_type");
    console.log("   - delivery_orders: gas_volume_m3, spbg_location, calculation_method, jisdor_rate, gas_filling_cost");
    
    process.exit(0);
  } catch (err) {
    console.error("❌ SPBG migration error:", err);
    console.error("💡 Make sure your database is running and accessible");
    process.exit(1);
  }
};

runSPBGMigration();
