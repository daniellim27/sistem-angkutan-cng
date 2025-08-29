  // Script to add SPBG category to existing database
const fs = require("fs");
const path = require("path");
const db = require("./src/utils/db");

const addSPBGCategory = async () => {
  try {
    console.log("🚀 Starting SPBG category migration...");
    
    // Read the migration SQL file
    const sql = fs
      .readFileSync(path.resolve(__dirname, "src/migrations/add_spbg_category.sql"))
      .toString();
    
    console.log("📝 Executing SPBG category migration...");
    
    // Execute the migration
    await db.pool.query(sql);
    
    console.log("✅ SPBG category migration completed successfully!");
    
    // Check if the category was added by querying it separately
    const checkResult = await db.pool.query(
      "SELECT id, category_name, category_type FROM cash_categories WHERE category_name = 'SPBG Gas Filling'"
    );
    
    if (checkResult.rows.length > 0) {
      const category = checkResult.rows[0];
      console.log("🎉 SPBG category is now available:");
      console.log(`   - ID: ${category.id}`);
      console.log(`   - Name: ${category.category_name}`);
      console.log(`   - Type: ${category.category_type}`);
      console.log("💡 You can now create SPBG transactions using category_id = " + category.id);
    } else {
      console.log("⚠️  SPBG category was not found after migration");
    }
    
    process.exit(0);
  } catch (err) {
    console.error("❌ SPBG category migration error:", err);
    console.error("💡 Make sure your database is running and accessible");
    process.exit(1);
  }
};

addSPBGCategory();
