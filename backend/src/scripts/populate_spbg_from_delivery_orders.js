const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5435,
  database: process.env.DB_NAME || 'angkutan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'getsuga39',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Extract city from load_location
function extractCityFromLocation(loadLocation) {
  if (!loadLocation) return null;
  
  // Split by comma and get last part (usually the city)
  // Example: "Depot Gas LPG Cibitung, Bekasi" → "Bekasi"
  const parts = loadLocation.split(',').map(p => p.trim());
  const city = parts[parts.length - 1];
  
  // Clean up common prefixes
  return city
    .replace(/^(Kota|Kabupaten|Kab\.|Kec\.)\s+/i, '')
    .trim();
}

async function populateSPBGFromDeliveryOrders() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Populating SPBG Deposit Groups from Delivery Orders...\n');
    
    // Step 1: Get all delivery orders with load_location
    console.log('📊 Step 1: Fetching delivery orders...');
    const deliveryOrders = await client.query(`
      SELECT 
        id, 
        do_number, 
        customer_name, 
        load_location,
        (SELECT COUNT(*) FROM deposit_group_members WHERE delivery_order_id = delivery_orders.id) as already_in_group
      FROM delivery_orders
      WHERE load_location IS NOT NULL 
        AND load_location != ''
      ORDER BY created_at DESC
    `);
    
    console.log(`   Found ${deliveryOrders.rows.length} delivery orders with load locations\n`);
    
    if (deliveryOrders.rows.length === 0) {
      console.log('⚠️  No delivery orders with load_location found.');
      return {
        success: true,
        processed: 0,
        groupsCreated: 0,
        dosLinked: 0
      };
    }
    
    // Step 2: Process each delivery order
    console.log('🔗 Step 2: Linking delivery orders to deposit groups...\n');
    
    let groupsCreated = 0;
    let dosLinked = 0;
    let dosSkipped = 0;
    let dosAlreadyLinked = 0;
    
    const cityGroups = {}; // Cache for created groups
    
    for (const deliveryOrder of deliveryOrders.rows) {
      const city = extractCityFromLocation(deliveryOrder.load_location);
      
      if (!city) {
        console.log(`  ⚠️  Skipped DO #${deliveryOrder.id} (${deliveryOrder.do_number}) - couldn't extract city`);
        dosSkipped++;
        continue;
      }
      
      // Check if already in a group
      if (deliveryOrder.already_in_group > 0) {
        console.log(`  ℹ️  Skipped DO #${deliveryOrder.id} (${deliveryOrder.do_number}) - already in group`);
        dosAlreadyLinked++;
        continue;
      }
      
      // Find or create deposit group for this city
      let depositGroup;
      
      if (cityGroups[city.toLowerCase()]) {
        depositGroup = cityGroups[city.toLowerCase()];
      } else {
        // Check if deposit group exists (case-insensitive)
        const existingGroup = await client.query(
          'SELECT * FROM deposit_groups WHERE LOWER(spbg_location) = LOWER($1)',
          [city]
        );
        
        if (existingGroup.rows.length > 0) {
          depositGroup = existingGroup.rows[0];
          cityGroups[city.toLowerCase()] = depositGroup;
          console.log(`  ℹ️  Using existing group: "${depositGroup.spbg_location}" (ID: ${depositGroup.id})`);
        } else {
          // Create new deposit group
          const newGroup = await client.query(`
            INSERT INTO deposit_groups (spbg_location, balance, deposited_amount, status, created_at, updated_at)
            VALUES ($1, 0, 0, 'active', NOW(), NOW())
            RETURNING *
          `, [city]);
          
          depositGroup = newGroup.rows[0];
          cityGroups[city.toLowerCase()] = depositGroup;
          groupsCreated++;
          console.log(`  ✅ Created new group: "${depositGroup.spbg_location}" (ID: ${depositGroup.id})`);
        }
      }
      
      // Add DO to deposit group
      await client.query(`
        INSERT INTO deposit_group_members (group_id, delivery_order_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [depositGroup.id, deliveryOrder.id]);
      
      dosLinked++;
      console.log(`  🔗 Linked DO #${deliveryOrder.id} (${deliveryOrder.do_number}) → "${depositGroup.spbg_location}"`);
      console.log(`     Location: ${deliveryOrder.load_location}`);
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Groups Created:    ${groupsCreated}`);
    console.log(`   🔗 DOs Linked:        ${dosLinked}`);
    console.log(`   ℹ️  Already Linked:    ${dosAlreadyLinked}`);
    console.log(`   ⚠️  Skipped:          ${dosSkipped}`);
    console.log(`   📊 Total Processed:   ${deliveryOrders.rows.length}\n`);
    
    // Step 3: Show deposit groups summary
    console.log('📋 Deposit Groups Summary:\n');
    const groupsSummary = await client.query(`
      SELECT 
        dg.id,
        dg.spbg_location,
        dg.balance,
        COUNT(dgm.id) as total_dos,
        (SELECT COUNT(*) FROM receipt_ocr r 
         JOIN delivery_orders d ON r.do_id = d.id
         JOIN deposit_group_members dgm2 ON dgm2.delivery_order_id = d.id
         WHERE dgm2.group_id = dg.id AND r.admin_confirmed = TRUE) as confirmed_receipts
      FROM deposit_groups dg
      LEFT JOIN deposit_group_members dgm ON dg.id = dgm.group_id
      GROUP BY dg.id
      ORDER BY dg.spbg_location
    `);
    
    groupsSummary.rows.forEach(g => {
      console.log(`   ${g.spbg_location}:`);
      console.log(`     Delivery Orders: ${g.total_dos}`);
      console.log(`     Confirmed Receipts: ${g.confirmed_receipts}`);
      console.log(`     Balance: Rp ${parseFloat(g.balance || 0).toLocaleString('id-ID')}`);
      console.log('');
    });
    
    console.log('✅ SPBG population completed successfully!\n');
    
    return {
      success: true,
      processed: deliveryOrders.rows.length,
      groupsCreated: groupsCreated,
      dosLinked: dosLinked,
      dosAlreadyLinked: dosAlreadyLinked,
      dosSkipped: dosSkipped
    };
    
  } catch (error) {
    console.error('❌ Error during SPBG population:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function run() {
  try {
    await populateSPBGFromDeliveryOrders();
    console.log('🎉 Done! All delivery orders have been linked to SPBG deposit groups.');
    console.log('\n📝 Next steps:');
    console.log('   1. Check SPBG Management page - deposit groups should have DOs');
    console.log('   2. Check Tagihan for each SPBG - confirmed receipts should appear');
    console.log('   3. Confirm more receipts - they will auto-link to SPBG\n');
  } catch (error) {
    console.error('❌ Population failed:', error);
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
  populateSPBGFromDeliveryOrders,
  extractCityFromLocation
};

