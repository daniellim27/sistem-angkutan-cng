// Script to insert Jack Driver specific test data for /api/delivery-orders/me endpoint
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

const insertJackDriverTestData = async () => {
  try {
    console.log("🚀 Starting Jack Driver specific test data insertion...");

    // 1. Get Jack's user ID
    console.log("👨‍💼 Getting Jack Driver user ID...");
    const jackResult = await db.pool.query(`
      SELECT id, username, role 
      FROM users 
      WHERE username = 'jack_driver' AND role = 'driver'
    `);

    if (jackResult.rows.length === 0) {
      throw new Error("Jack Driver user not found. Please create jack_driver user first.");
    }

    const jack = jackResult.rows[0];
    console.log(`✅ Found Jack Driver: ID ${jack.id}, Username: ${jack.username}`);

    // 2. Get available vehicles
    console.log("🚗 Getting available vehicles...");
    const vehiclesResult = await db.pool.query(`
      SELECT id, license_plate, type 
      FROM vehicles 
      ORDER BY id
    `);

    const vehicles = vehiclesResult.rows;
    console.log(`✅ Found ${vehicles.length} vehicles`);

    if (vehicles.length === 0) {
      throw new Error("No vehicles available. Please create vehicles first.");
    }

    // 3. Clean up any existing Jack's delivery orders first
    console.log("🧹 Cleaning up existing Jack's delivery orders...");
    
    // First, delete related nota_kecils records
    await db.pool.query(`
      DELETE FROM nota_kecils 
      WHERE delivery_order_id IN (
        SELECT id FROM delivery_orders 
        WHERE driver_id = $1 AND do_number LIKE 'JACK-%'
      )
    `, [jack.id]);
    console.log("✅ Cleaned up related nota_kecils records");
    
    // Then delete the delivery orders
    await db.pool.query(`
      DELETE FROM delivery_orders 
      WHERE driver_id = $1 AND do_number LIKE 'JACK-%'
    `, [jack.id]);
    console.log("✅ Cleaned up existing Jack's delivery orders");

    // 4. Create Jack's delivery orders with various statuses and realistic scenarios
    console.log("📦 Creating Jack's delivery orders...");

    const jackDeliveryOrders = [
      // === CURRENT ACTIVE DELIVERY ===
      {
        do_number: 'JACK-2025-001',
        do_name: 'Pengiriman Gas LPG ke Jakarta Selatan - Priority',
        customer_name: 'PT Gas Jakarta Selatan',
        item_name: 'LPG 12kg',
        minimal_load_quantity: 120,
        actual_load_quantity: null,
        unit: 'kubik',
        unit_price: 14500,
        total_amount: 1740000,
        trip_allowance: 300000,
        gaji: 180000,
        ongkosan: 1260000,
        load_location: 'Depot Gas LPG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'PT Gas Jakarta Selatan, Jl. Gatot Subroto No. 200, Jakarta Selatan',
        unload_latitude: -6.2442,
        unload_longitude: 106.7999,
        payment_status: 'awaiting_confirmation',
        payment_type: null,
        status: 'at_unload_location',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        departed_to_load_location_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30 * 60 * 1000),
        arrived_at_load_location_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
        departed_from_load_location_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
        arrived_at_unload_location_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        departed_from_unload_location_at: null,
        completed_at: null,
        surat_jalan_photo_url: ['https://example.com/jack_surat_jalan_1.jpg'],
        nota_photo_url: null,
        gas_volume_m3: 120,
        spbg_location: 'SPBG Cibitung',
        calculation_method: 'jisdor',
        jisdor_rate: 14500
      },

      // === COMPLETED DELIVERY (was ongoing) ===
      {
        do_number: 'JACK-2025-002',
        do_name: 'Pengiriman Gas CNG ke Tangerang - Express',
        customer_name: 'CV Gas Tangerang Express',
        item_name: 'CNG Compressed',
        minimal_load_quantity: 45,
        actual_load_quantity: 46,
        unit: 'kubik',
        unit_price: 13000,
        total_amount: 598000,
        trip_allowance: 250000,
        gaji: 150000,
        ongkosan: 198000,
        load_location: 'SPBG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'CV Gas Tangerang Express, Jl. Raya Serpong No. 100, Tangerang',
        unload_latitude: -6.3150,
        unload_longitude: 106.6625,
        payment_status: 'lunas',
        payment_type: 'transfer',
        status: 'completed',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        departed_to_load_location_at: new Date(Date.now() - 4 * 60 * 60 * 1000 + 30 * 60 * 1000),
        arrived_at_load_location_at: new Date(Date.now() - 4 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
        departed_from_load_location_at: new Date(Date.now() - 4 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        arrived_at_unload_location_at: new Date(Date.now() - 4 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        departed_from_unload_location_at: new Date(Date.now() - 4 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 4 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        surat_jalan_photo_url: ['https://example.com/jack_surat_jalan_2.jpg'],
        nota_photo_url: ['https://example.com/jack_nota_2.jpg'],
        gas_volume_m3: 46,
        spbg_location: 'SPBG Cibitung',
        calculation_method: 'jisdor',
        jisdor_rate: 13000
      },

      // === COMPLETED DELIVERY (was newly assigned) ===
      {
        do_number: 'JACK-2025-003',
        do_name: 'Pengiriman Gas LPG ke Depok - Standard',
        customer_name: 'UD Gas Depok Mandiri',
        item_name: 'LPG 50kg',
        minimal_load_quantity: 30,
        actual_load_quantity: 31,
        unit: 'kubik',
        unit_price: 16000,
        total_amount: 496000,
        trip_allowance: 200000,
        gaji: 120000,
        ongkosan: 176000,
        load_location: 'Depot Gas LPG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'UD Gas Depok Mandiri, Jl. Margonda Raya No. 150, Depok',
        unload_latitude: -6.4025,
        unload_longitude: 106.7942,
        payment_status: 'lunas',
        payment_type: 'cash',
        status: 'completed',
        created_at: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        departed_to_load_location_at: new Date(Date.now() - 15 * 60 * 1000 + 30 * 60 * 1000),
        arrived_at_load_location_at: new Date(Date.now() - 15 * 60 * 1000 + 1 * 60 * 60 * 1000),
        departed_from_load_location_at: new Date(Date.now() - 15 * 60 * 1000 + 2 * 60 * 60 * 1000),
        arrived_at_unload_location_at: new Date(Date.now() - 15 * 60 * 1000 + 3 * 60 * 60 * 1000),
        departed_from_unload_location_at: new Date(Date.now() - 15 * 60 * 1000 + 4 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 15 * 60 * 1000 + 5 * 60 * 60 * 1000),
        surat_jalan_photo_url: ['https://example.com/jack_surat_jalan_3.jpg'],
        nota_photo_url: ['https://example.com/jack_nota_3.jpg'],
        gas_volume_m3: 31,
        spbg_location: 'Depot Gas LPG Cibitung',
        calculation_method: 'jisdor',
        jisdor_rate: 16000
      },

      // === COMPLETED TODAY ===
      {
        do_number: 'JACK-2025-004',
        do_name: 'Pengiriman Gas CNG ke Bekasi - Completed',
        customer_name: 'PT Gas Bekasi Sukses',
        item_name: 'CNG Compressed',
        minimal_load_quantity: 35,
        actual_load_quantity: 36,
        unit: 'kubik',
        unit_price: 12500,
        total_amount: 450000,
        trip_allowance: 180000,
        gaji: 110000,
        ongkosan: 160000,
        load_location: 'SPBG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'PT Gas Bekasi Sukses, Jl. Raya Bekasi No. 250, Bekasi',
        unload_latitude: -6.2383,
        unload_longitude: 106.9756,
        payment_status: 'lunas',
        payment_type: 'transfer',
        status: 'completed',
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        departed_to_load_location_at: new Date(Date.now() - 8 * 60 * 60 * 1000 + 30 * 60 * 1000),
        arrived_at_load_location_at: new Date(Date.now() - 8 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
        departed_from_load_location_at: new Date(Date.now() - 8 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        arrived_at_unload_location_at: new Date(Date.now() - 8 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        departed_from_unload_location_at: new Date(Date.now() - 8 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 8 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        surat_jalan_photo_url: ['https://example.com/jack_surat_jalan_3.jpg'],
        nota_photo_url: ['https://example.com/jack_nota_3.jpg'],
        gas_volume_m3: 36,
        spbg_location: 'SPBG Cibitung',
        calculation_method: 'jisdor',
        jisdor_rate: 12500
      },

      // === COMPLETED YESTERDAY ===
      {
        do_number: 'JACK-2025-005',
        do_name: 'Pengiriman Gas LPG ke Bogor - Long Distance',
        customer_name: 'CV Gas Bogor Raya',
        item_name: 'LPG 12kg',
        minimal_load_quantity: 80,
        actual_load_quantity: 82,
        unit: 'kubik',
        unit_price: 15000,
        total_amount: 1230000,
        trip_allowance: 350000,
        gaji: 200000,
        ongkosan: 680000,
        load_location: 'Depot Gas LPG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'CV Gas Bogor Raya, Jl. Pajajaran No. 200, Bogor',
        unload_latitude: -6.5971,
        unload_longitude: 106.8060,
        payment_status: 'lunas',
        payment_type: 'cash',
        status: 'completed',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        departed_to_load_location_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
        arrived_at_load_location_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        departed_from_load_location_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        arrived_at_unload_location_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        departed_from_unload_location_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        surat_jalan_photo_url: ['https://example.com/jack_surat_jalan_4.jpg'],
        nota_photo_url: ['https://example.com/jack_nota_4.jpg'],
        gas_volume_m3: 82,
        spbg_location: 'Depot Gas LPG Cibitung',
        calculation_method: 'jisdor',
        jisdor_rate: 15000
      },

      // === CANCELLED ORDER ===
      {
        do_number: 'JACK-2025-006',
        do_name: 'Pengiriman Gas LPG ke Karawang - Cancelled',
        customer_name: 'PT Gas Karawang (Cancelled)',
        item_name: 'LPG 50kg',
        minimal_load_quantity: 25,
        actual_load_quantity: null,
        unit: 'kubik',
        unit_price: 17000,
        total_amount: 425000,
        trip_allowance: 220000,
        gaji: 130000,
        ongkosan: 75000,
        load_location: 'Depot Gas LPG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'PT Gas Karawang, Jl. Raya Karawang No. 100, Karawang',
        unload_latitude: -6.3036,
        unload_longitude: 107.3053,
        payment_status: 'awaiting_confirmation',
        payment_type: null,
        status: 'cancelled',
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        departed_to_load_location_at: null,
        arrived_at_load_location_at: null,
        departed_from_load_location_at: null,
        arrived_at_unload_location_at: null,
        departed_from_unload_location_at: null,
        completed_at: null,
        surat_jalan_photo_url: null,
        nota_photo_url: null,
        gas_volume_m3: null,
        spbg_location: null,
        calculation_method: null,
        jisdor_rate: null
      }
    ];

    // 5. Insert Jack's delivery orders
    console.log("📦 Inserting Jack's delivery orders...");
    for (let i = 0; i < jackDeliveryOrders.length; i++) {
      const doData = jackDeliveryOrders[i];
      const vehicle = vehicles[i % vehicles.length]; // Cycle through vehicles

      const insertQuery = `
        INSERT INTO delivery_orders (
          do_number, do_name, customer_name, item_name, minimal_load_quantity, 
          actual_load_quantity, unit, unit_price, total_amount, trip_allowance, 
          gaji, ongkosan, load_location, load_latitude, load_longitude, 
          unload_location, unload_latitude, unload_longitude,
          payment_status, payment_type, status, created_at, 
          departed_to_load_location_at, arrived_at_load_location_at, departed_from_load_location_at,
          arrived_at_unload_location_at, departed_from_unload_location_at, completed_at,
          surat_jalan_photo_url, nota_photo_url, driver_id, vehicle_id,
          gas_volume_m3, spbg_location, calculation_method, jisdor_rate
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
        )
      `;

      const values = [
        doData.do_number,
        doData.do_name,
        doData.customer_name,
        doData.item_name,
        doData.minimal_load_quantity,
        doData.actual_load_quantity,
        doData.unit,
        doData.unit_price,
        doData.total_amount,
        doData.trip_allowance,
        doData.gaji,
        doData.ongkosan,
        doData.load_location,
        doData.load_latitude,
        doData.load_longitude,
        doData.unload_location,
        doData.unload_latitude,
        doData.unload_longitude,
        doData.payment_status,
        doData.payment_type,
        doData.status,
        doData.created_at,
        doData.departed_to_load_location_at,
        doData.arrived_at_load_location_at,
        doData.departed_from_load_location_at,
        doData.arrived_at_unload_location_at,
        doData.departed_from_unload_location_at,
        doData.completed_at,
        doData.surat_jalan_photo_url,
        doData.nota_photo_url,
        jack.id, // Jack's driver ID
        vehicle.id,
        doData.gas_volume_m3,
        doData.spbg_location,
        doData.calculation_method,
        doData.jisdor_rate
      ];

      await db.pool.query(insertQuery, values);
      console.log(`✅ Created Jack's delivery order: ${doData.do_number} (${doData.status}) - Vehicle: ${vehicle.license_plate}`);
    }

    // 6. Get final summary for Jack
    console.log("\n📊 Getting Jack's delivery orders summary...");
    const jackDOs = await db.pool.query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
             COUNT(CASE WHEN status = 'at_unload_location' THEN 1 END) as at_unload,
             COUNT(CASE WHEN status = 'otw_to_unload_location' THEN 1 END) as otw_unload,
             COUNT(CASE WHEN status = 'at_spbu' THEN 1 END) as at_spbu,
             COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM delivery_orders 
      WHERE driver_id = $1 AND do_number LIKE 'JACK-%'
    `, [jack.id]);

    const statusSummary = await db.pool.query(`
      SELECT status, payment_status, COUNT(*) as count 
      FROM delivery_orders 
      WHERE driver_id = $1 AND do_number LIKE 'JACK-%'
      GROUP BY status, payment_status 
      ORDER BY status, payment_status
    `, [jack.id]);

    console.log("\n🎉 Jack Driver test data inserted successfully!");
    console.log("=".repeat(80));
    console.log("📋 Jack's Delivery Orders Summary:");
    console.log(`   - Total Orders: ${jackDOs.rows[0].total}`);
    console.log(`   - Completed: ${jackDOs.rows[0].completed}`);
    console.log(`   - At Unload Location: ${jackDOs.rows[0].at_unload}`);
    console.log(`   - On the Way to Unload: ${jackDOs.rows[0].otw_unload}`);
    console.log(`   - At SPBU: ${jackDOs.rows[0].at_spbu}`);
    console.log(`   - Cancelled: ${jackDOs.rows[0].cancelled}`);
    console.log("\n📊 Status & Payment Breakdown:");
    statusSummary.rows.forEach(row => {
      console.log(`   - ${row.status} (${row.payment_status}): ${row.count}`);
    });
    console.log("=".repeat(80));

  } catch (error) {
    console.error("💥 Error inserting Jack Driver test data:", error);
    throw error;
  } finally {
    await db.pool.end();
  }
};

// Run the test data insertion
insertJackDriverTestData()
  .then(() => {
    console.log("🎉 Jack Driver test data insertion completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Jack Driver test data insertion failed:", error);
    process.exit(1);
  });
