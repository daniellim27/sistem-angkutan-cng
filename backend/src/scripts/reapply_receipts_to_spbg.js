const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5435,
  database: process.env.DB_NAME || 'angkutan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'getsuga39',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function reapplyReceiptsToSPBG() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Re-applying Confirmed Receipts to SPBG Balances...\n');
    
    // Find all confirmed receipts that haven't been applied to SPBG
    const receiptsQuery = `
      SELECT 
        r.id,
        r.do_id,
        r.calculated_cost,
        r.admin_confirmed,
        r.applied_to_spbg,
        d.do_number,
        dgm.group_id,
        dg.spbg_location,
        dg.balance
      FROM receipt_ocr r
      JOIN delivery_orders d ON r.do_id = d.id
      JOIN deposit_group_members dgm ON dgm.delivery_order_id = d.id
      JOIN deposit_groups dg ON dgm.group_id = dg.id
      WHERE r.admin_confirmed = TRUE
        AND r.applied_to_spbg = FALSE
      ORDER BY r.confirmed_at
    `;
    
    const receipts = await client.query(receiptsQuery);
    
    console.log(`Found ${receipts.rows.length} confirmed receipts to re-apply\n`);
    
    if (receipts.rows.length === 0) {
      console.log('✅ All confirmed receipts are already applied to SPBG!');
      return {
        success: true,
        applied: 0
      };
    }
    
    let appliedCount = 0;
    const spbgUpdates = {};
    
    for (const receipt of receipts.rows) {
      const cost = parseFloat(receipt.calculated_cost || 0);
      const groupId = receipt.group_id;
      const spbgLocation = receipt.spbg_location;
      
      // Track balance changes per SPBG
      if (!spbgUpdates[groupId]) {
        spbgUpdates[groupId] = {
          location: spbgLocation,
          previous_balance: parseFloat(receipt.balance || 0),
          total_cost: 0,
          receipts: []
        };
      }
      
      spbgUpdates[groupId].total_cost += cost;
      spbgUpdates[groupId].receipts.push({
        id: receipt.id,
        do_number: receipt.do_number,
        cost: cost
      });
      
      // Mark receipt as applied to SPBG
      await client.query(`
        UPDATE receipt_ocr 
        SET applied_to_spbg = TRUE, 
            applied_to_spbg_at = NOW()
        WHERE id = $1
      `, [receipt.id]);
      
      appliedCount++;
      console.log(`  ✅ Applied Receipt #${receipt.id} (DO: ${receipt.do_number}) → ${spbgLocation}`);
      console.log(`     Cost: Rp ${cost.toLocaleString('id-ID')}`);
    }
    
    console.log(`\n💰 Updating SPBG Balances:\n`);
    
    // Update SPBG balances
    for (const [groupId, update] of Object.entries(spbgUpdates)) {
      const newBalance = Math.max(0, update.previous_balance - update.total_cost);
      
      await client.query(`
        UPDATE deposit_groups
        SET balance = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [newBalance, groupId]);
      
      console.log(`  💵 ${update.location}:`);
      console.log(`     Previous Balance: Rp ${update.previous_balance.toLocaleString('id-ID')}`);
      console.log(`     Total Receipt Cost: Rp ${update.total_cost.toLocaleString('id-ID')}`);
      console.log(`     New Balance: Rp ${newBalance.toLocaleString('id-ID')}`);
      console.log(`     Receipts Applied: ${update.receipts.length}`);
      console.log('');
    }
    
    console.log(`\n✅ Re-applied ${appliedCount} receipts to SPBG balances\n`);
    
    return {
      success: true,
      applied: appliedCount
    };
    
  } catch (error) {
    console.error('❌ Error during re-application:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function run() {
  try {
    await reapplyReceiptsToSPBG();
    console.log('🎉 Done! All confirmed receipts have been applied to SPBG balances.');
    console.log('\n📝 Next steps:');
    console.log('   1. Check SPBG Management → Tagihan');
    console.log('   2. Receipts should now appear');
    console.log('   3. SPBG balances should be updated\n');
  } catch (error) {
    console.error('❌ Re-application failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  run();
}

module.exports = {
  reapplyReceiptsToSPBG
};


