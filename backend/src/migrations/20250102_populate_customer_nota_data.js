const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5435,
  database: process.env.DB_NAME || 'angkutan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'getsuga39',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function populateCustomerNotaData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Starting customer data population...');
    
    // Step 1: Get all unique customers from nota_kecils
    console.log('\n📊 Step 1: Extracting unique customers from nota_kecils...');
    const notaKecilCustomers = await client.query(`
      SELECT DISTINCT 
        customer_name,
        customer_address as location
      FROM nota_kecils
      WHERE customer_name IS NOT NULL 
        AND customer_name != ''
      ORDER BY customer_name
    `);
    
    console.log(`Found ${notaKecilCustomers.rows.length} unique customers in nota_kecils`);
    
    // Step 2: Create customers if they don't exist
    console.log('\n👥 Step 2: Creating missing customers...');
    let customersCreated = 0;
    let customersExisting = 0;
    
    for (const row of notaKecilCustomers.rows) {
      const { customer_name, location } = row;
      
      // Check if customer exists
      const existingCustomer = await client.query(
        'SELECT id FROM customers WHERE customer_name = $1',
        [customer_name]
      );
      
      if (existingCustomer.rows.length === 0) {
        // Create new customer
        await client.query(`
          INSERT INTO customers (customer_name, location, nota_besar, nota_kecil, created_at, updated_at)
          VALUES ($1, $2, 0, 0, NOW(), NOW())
        `, [customer_name, location || 'Unknown Location']);
        
        customersCreated++;
        console.log(`  ✅ Created: ${customer_name}`);
      } else {
        customersExisting++;
      }
    }
    
    console.log(`\n📈 Summary: ${customersCreated} created, ${customersExisting} already existed`);
    
    // Step 3: Link nota_besars to customers
    console.log('\n🔗 Step 3: Linking nota_besars to customers...');
    
    const notaBesars = await client.query(`
      SELECT 
        nb.id as nota_besar_id,
        nb.delivery_order_id,
        nb.status,
        nb.total_price,
        nb.total_volume
      FROM nota_besars nb
      WHERE nb.customer_id IS NULL
      ORDER BY nb.id
    `);
    
    console.log(`Found ${notaBesars.rows.length} nota_besars to link`);
    
    let linked = 0;
    let skipped = 0;
    
    for (const nb of notaBesars.rows) {
      // Get customer name from the first nota_kecil in this nota_besar
      const notaKecil = await client.query(`
        SELECT nk.customer_name
        FROM nota_besar_items nbi
        JOIN nota_kecils nk ON nbi.nota_kecil_id = nk.id
        WHERE nbi.nota_besar_id = $1
        LIMIT 1
      `, [nb.nota_besar_id]);
      
      if (notaKecil.rows.length > 0 && notaKecil.rows[0].customer_name) {
        const customerName = notaKecil.rows[0].customer_name;
        
        // Find customer ID
        const customer = await client.query(
          'SELECT id FROM customers WHERE customer_name = $1',
          [customerName]
        );
        
        if (customer.rows.length > 0) {
          const customerId = customer.rows[0].id;
          
          // Update nota_besar with customer_id
          await client.query(`
            UPDATE nota_besars
            SET customer_id = $1,
                applied_to_customer = $2,
                applied_to_customer_at = CASE WHEN $2 THEN NOW() ELSE NULL END
            WHERE id = $3
          `, [customerId, nb.status === 'confirmed', nb.nota_besar_id]);
          
          linked++;
          
          if (linked % 10 === 0) {
            console.log(`  Linked ${linked} nota_besars...`);
          }
        } else {
          console.log(`  ⚠️  Customer not found: ${customerName} for nota_besar #${nb.nota_besar_id}`);
          skipped++;
        }
      } else {
        console.log(`  ⚠️  No nota_kecil found for nota_besar #${nb.nota_besar_id}`);
        skipped++;
      }
    }
    
    console.log(`\n📊 Linking summary: ${linked} linked, ${skipped} skipped`);
    
    // Step 4: Calculate and update customer balances
    console.log('\n💰 Step 4: Calculating customer balances...');
    
    const customers = await client.query('SELECT id, customer_name FROM customers');
    
    let balancesUpdated = 0;
    
    for (const customer of customers.rows) {
      // Calculate nota_besar total (only confirmed)
      const notaBesarTotal = await client.query(`
        SELECT COALESCE(SUM(total_price), 0) as total
        FROM nota_besars
        WHERE customer_id = $1 
          AND status = 'confirmed'
      `, [customer.id]);
      
      // Calculate nota_kecil total (sum of volumes from confirmed nota_besars)
      const notaKecilTotal = await client.query(`
        SELECT COALESCE(SUM(nbi.volume_m3), 0) as total
        FROM nota_besar_items nbi
        JOIN nota_besars nb ON nbi.nota_besar_id = nb.id
        WHERE nb.customer_id = $1 
          AND nb.status = 'confirmed'
      `, [customer.id]);
      
      const notaBesarAmount = parseFloat(notaBesarTotal.rows[0].total) || 0;
      const notaKecilAmount = parseFloat(notaKecilTotal.rows[0].total) || 0;
      
      // Update customer balances
      await client.query(`
        UPDATE customers
        SET nota_besar = $1,
            nota_kecil = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [notaBesarAmount, notaKecilAmount, customer.id]);
      
      balancesUpdated++;
      
      if (notaBesarAmount > 0 || notaKecilAmount > 0) {
        console.log(`  💵 ${customer.customer_name}: Rp ${notaBesarAmount.toLocaleString('id-ID')} (${notaKecilAmount.toFixed(2)} m³)`);
      }
    }
    
    console.log(`\n✅ Updated ${balancesUpdated} customer balances`);
    
    await client.query('COMMIT');
    console.log('\n🎉 Data migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during data migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function runDataMigration() {
  try {
    console.log('🚀 Starting Customer Nota Data Population...\n');
    
    await populateCustomerNotaData();
    
    console.log('\n✅ All data migration completed successfully');
    console.log('\n📝 Next steps:');
    console.log('  1. Verify customer data in database');
    console.log('  2. Run cleanup script to remove SPBG columns');
    console.log('  3. Update backend code to use customer_id');
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runDataMigration();
}

module.exports = {
  populateCustomerNotaData,
  runDataMigration
};


