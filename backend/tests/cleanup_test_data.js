const path = require('path');
const db = require(path.join(__dirname, '../src/utils/db'));

const cleanupTestData = async () => {
  try {
    console.log("🧹 Cleaning up existing test data...");
    
    // Step 1: Clear ALL foreign key references to deposit groups
    await db.pool.query("UPDATE purchase_orders SET deposit_group_id = NULL WHERE deposit_group_id IS NOT NULL");
    console.log("   ✓ All purchase orders deposit group references cleared");
    
    // Step 2: Delete all test purchase orders
    await db.pool.query("DELETE FROM purchase_orders WHERE po_number LIKE 'PO/SPBG-TEST%'");
    console.log("   ✓ Test purchase orders deleted");
    
    // Step 3: Delete all SPBG deposit groups
    await db.pool.query("DELETE FROM deposit_groups WHERE group_name LIKE '%SPBG%'");
    console.log("   ✓ SPBG deposit groups deleted");
    
    // Step 4: Clear ALL foreign key references to cash categories first
    await db.pool.query("UPDATE cash_transactions SET category_id = NULL WHERE category_id IN (SELECT id FROM cash_categories WHERE category_name LIKE '%CNG%' OR category_name LIKE '%SPBG%')");
    console.log("   ✓ Cash transaction category references cleared");
    
    // Step 5: Delete CNG/SPBG cash transactions
    await db.pool.query("DELETE FROM cash_transactions WHERE reference_number LIKE '%SPBG%' OR reference_number LIKE '%CNG%'");
    console.log("   ✓ CNG/SPBG cash transactions deleted");
    
    // Step 6: Now delete CNG/SPBG cash categories (safe after all references are cleared)
    await db.pool.query("DELETE FROM cash_categories WHERE category_name LIKE '%CNG%' OR category_name LIKE '%SPBG%'");
    console.log("   ✓ CNG/SPBG cash categories deleted");
    
    // Step 7: Verify cleanup
    const remainingPos = await db.pool.query("SELECT COUNT(*) as count FROM purchase_orders WHERE po_number LIKE 'PO/SPBG-TEST%'");
    const remainingDgs = await db.pool.query("SELECT COUNT(*) as count FROM deposit_groups WHERE group_name LIKE '%SPBG%'");
    
    console.log(`\n📊 Cleanup verification:`);
    console.log(`   - Remaining test POs: ${remainingPos.rows[0].count}`);
    console.log(`   - Remaining SPBG groups: ${remainingDgs.rows[0].count}`);
    
    console.log("\n✅ Test data cleared successfully!");
    console.log("💡 You can now run: node insert_test_data.js");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error cleaning up test data:", err);
    process.exit(1);
  }
};

cleanupTestData();
