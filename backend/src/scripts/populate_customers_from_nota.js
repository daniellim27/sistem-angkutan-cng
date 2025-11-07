const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5435,
  database: process.env.DB_NAME || 'angkutan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'getsuga39',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function populateCustomersFromNota() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting customer population from Nota Management...\n');
    
    // Step 1: Get all unique customers from nota_kecils
    console.log('📊 Step 1: Extracting unique customers from nota_kecils...');
    const notaKecilCustomers = await client.query(`
      SELECT DISTINCT 
        customer_name,
        customer_address as location,
        COUNT(*) OVER (PARTITION BY customer_name) as nota_count
      FROM nota_kecils
      WHERE customer_name IS NOT NULL 
        AND customer_name != ''
        AND TRIM(customer_name) != ''
      ORDER BY customer_name
    `);
    
    console.log(`   Found ${notaKecilCustomers.rows.length} unique customers in nota_kecils\n`);
    
    if (notaKecilCustomers.rows.length === 0) {
      console.log('⚠️  No customers found in nota_kecils. Nothing to populate.');
      return {
        success: true,
        created: 0,
        existing: 0,
        skipped: 0
      };
    }
    
    // Step 2: Create customers if they don't exist
    console.log('👥 Step 2: Creating/updating customers...\n');
    let customersCreated = 0;
    let customersExisting = 0;
    let customersSkipped = 0;
    
    for (const row of notaKecilCustomers.rows) {
      const { customer_name, location, nota_count } = row;
      
      // Skip if customer name is invalid
      if (!customer_name || customer_name.trim() === '') {
        customersSkipped++;
        continue;
      }
      
      const cleanName = customer_name.trim();
      const cleanLocation = location ? location.trim() : 'Unknown Location';
      
      // Check if customer exists (case-insensitive)
      const existingCustomer = await client.query(
        `SELECT id, customer_name, location FROM customers 
         WHERE LOWER(TRIM(customer_name)) = LOWER($1)`,
        [cleanName]
      );
      
      if (existingCustomer.rows.length === 0) {
        // Create new customer
        try {
          await client.query(`
            INSERT INTO customers (customer_name, location, nota_besar, nota_kecil, created_at, updated_at)
            VALUES ($1, $2, 0, 0, NOW(), NOW())
          `, [cleanName, cleanLocation]);
          
          customersCreated++;
          console.log(`   ✅ Created: ${cleanName} (${nota_count} nota kecils)`);
        } catch (error) {
          console.error(`   ❌ Error creating ${cleanName}:`, error.message);
          customersSkipped++;
        }
      } else {
        customersExisting++;
        console.log(`   ℹ️  Exists:  ${existingCustomer.rows[0].customer_name} (${nota_count} nota kecils)`);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Created:  ${customersCreated} new customers`);
    console.log(`   ℹ️  Existing: ${customersExisting} customers already in database`);
    console.log(`   ⚠️  Skipped:  ${customersSkipped} invalid entries`);
    console.log(`   📊 Total:    ${notaKecilCustomers.rows.length} unique customer names found\n`);
    
no     // Step 3: Calculate and populate balances for customers with nota besars
    console.log('💰 Step 3: Calculating balances for customers with nota besars...\n');
    
    const balanceResults = await client.query(`
      SELECT 
        c.id,
        c.customer_name,
        COALESCE(SUM(nb.total_price), 0) as total_nota_besar,
        COALESCE(SUM(nb.total_volume), 0) as total_nota_kecil
      FROM customers c
      LEFT JOIN nota_besars nb ON nb.customer_id = c.id AND nb.status = 'confirmed'
      GROUP BY c.id, c.customer_name
      HAVING SUM(nb.total_price) > 0 OR SUM(nb.total_volume) > 0
    `);
    
    let balancesUpdated = 0;
    
    for (const customer of balanceResults.rows) {
      const notaBesarAmount = parseFloat(customer.total_nota_besar) || 0;
      const notaKecilVolume = parseFloat(customer.total_nota_kecil) || 0;
      
      await client.query(`
        UPDATE customers
        SET 
          nota_besar = $1,
          nota_kecil = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [notaBesarAmount, notaKecilVolume, customer.id]);
      
      balancesUpdated++;
      console.log(`   💵 ${customer.customer_name}:`);
      console.log(`      Nota Besar: Rp ${notaBesarAmount.toLocaleString('id-ID')}`);
      console.log(`      Nota Kecil: ${notaKecilVolume.toFixed(2)} m³\n`);
    }
    
    console.log(`   ✅ Updated balances for ${balancesUpdated} customers with nota besars\n`);
    
    // Step 4: Show customer list
    console.log('📋 Current Customers in Database:');
    const allCustomers = await client.query(`
      SELECT 
        id,
        customer_name,
        location,
        nota_besar,
        nota_kecil,
        created_at
      FROM customers
      ORDER BY customer_name
    `);
    
    console.log(`\n   Total customers in database: ${allCustomers.rows.length}\n`);
    
    // Show top 10
    console.log('   Top 10 customers:');
    allCustomers.rows.slice(0, 10).forEach((customer, index) => {
      console.log(`   ${index + 1}. ${customer.customer_name}`);
      console.log(`      Location: ${customer.location}`);
      console.log(`      Nota Besar: Rp ${parseFloat(customer.nota_besar || 0).toLocaleString('id-ID')}`);
      console.log(`      Nota Kecil: ${parseFloat(customer.nota_kecil || 0).toFixed(2)} m³`);
      console.log(`      Created: ${new Date(customer.created_at).toLocaleDateString('id-ID')}`);
      console.log('');
    });
    
    if (allCustomers.rows.length > 10) {
      console.log(`   ... and ${allCustomers.rows.length - 10} more customers\n`);
    }
    
    console.log('✅ Customer population completed successfully!\n');
    
    return {
      success: true,
      created: customersCreated,
      existing: customersExisting,
      skipped: customersSkipped,
      balancesUpdated: balancesUpdated,
      total: allCustomers.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error during customer population:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function runPopulation() {
  try {
    const result = await populateCustomersFromNota();
    
    if (result.success) {
      console.log('🎉 Done! All customers from Nota Management have been populated.');
      console.log('\n📝 Next steps:');
      console.log('   1. Check the customers in your database');
      console.log('   2. Visit /customers page to see all customers');
      console.log('   3. Run nota besar migration if needed\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runPopulation();
}

module.exports = {
  populateCustomersFromNota,
  runPopulation
};

