// Script to insert comprehensive delivery orders test data for mobile app testing
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

const insertDeliveryOrdersTestData = async () => {
  try {
    console.log("🚀 Starting delivery orders test data insertion...");

    // 1. First, create test drivers if they don't exist
    console.log("👨‍💼 Creating test drivers...");
    await db.pool.query(`
      INSERT INTO users (username, password_hash, role, created_at) VALUES
      ('driver001', '$2b$10$example_hash_1', 'driver', NOW()),
      ('driver002', '$2b$10$example_hash_2', 'driver', NOW()),
      ('driver003', '$2b$10$example_hash_3', 'driver', NOW()),
      ('driver004', '$2b$10$example_hash_4', 'driver', NOW()),
      ('driver005', '$2b$10$example_hash_5', 'driver', NOW())
      ON CONFLICT (username) DO NOTHING;
    `);

    // 2. Create driver profiles for the drivers
    console.log("👨‍💼 Creating driver profiles...");
    await db.pool.query(`
      INSERT INTO driver_profiles (user_id, full_name, phone, address, id_card_number, sim_number, sim_expiry_date, license_type, status, created_at)
      SELECT 
        u.id,
        'Driver ' || u.username,
        '+628' || LPAD(CAST(random() * 999999999 AS TEXT), 9, '0'),
        'Alamat ' || u.username || ', Jakarta',
        'ID' || LPAD(CAST(random() * 999999999 AS TEXT), 9, '0'),
        'SIM' || LPAD(CAST(random() * 999999999 AS TEXT), 9, '0'),
        (CURRENT_DATE + INTERVAL '2 years')::date,
        'B2',
        'available',
        NOW()
      FROM users u 
      WHERE u.role = 'driver' AND u.username LIKE 'driver%'
      AND NOT EXISTS (SELECT 1 FROM driver_profiles dp WHERE dp.user_id = u.id);
    `);

    // 3. Get available drivers and vehicles
    console.log("📋 Getting available drivers and vehicles...");
    const driversResult = await db.pool.query(`
      SELECT u.id, u.username, dp.full_name 
      FROM users u 
      JOIN driver_profiles dp ON u.id = dp.user_id 
      WHERE u.role = 'driver' AND dp.status = 'available'
      ORDER BY u.id
    `);

    const vehiclesResult = await db.pool.query(`
      SELECT id, license_plate, type 
      FROM vehicles 
      ORDER BY id
    `);

    const drivers = driversResult.rows;
    const vehicles = vehiclesResult.rows;

    console.log(`✅ Found ${drivers.length} drivers and ${vehicles.length} vehicles`);

    if (drivers.length === 0) {
      throw new Error("No drivers available. Please create drivers first.");
    }
    if (vehicles.length === 0) {
      throw new Error("No vehicles available. Please create vehicles first.");
    }

    // 4. Create comprehensive delivery orders with different statuses
    console.log("📦 Creating delivery orders with various statuses...");

    const deliveryOrdersData = [
      // === COMPLETED DELIVERY ORDERS ===
      {
        do_number: 'DO-2025-001',
        do_name: 'Pengiriman Gas LPG ke Jakarta Pusat',
        customer_name: 'PT Gas Indonesia',
        item_name: 'LPG 12kg',
        minimal_load_quantity: 100,
        actual_load_quantity: 105,
        unit: 'kubik',
        unit_price: 15000,
        total_amount: 1575000,
        trip_allowance: 250000,
        gaji: 150000,
        ongkosan: 1175000,
        load_location: 'Depot Gas LPG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'PT Gas Indonesia, Jl. Thamrin No. 1, Jakarta Pusat',
        unload_latitude: -6.1944,
        unload_longitude: 106.8229,
        payment_status: 'lunas',
        payment_type: 'transfer',
        status: 'completed',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        departed_to_load_location_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        arrived_at_load_location_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        departed_from_load_location_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        arrived_at_unload_location_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        departed_from_unload_location_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
        surat_jalan_photo_url: ['https://example.com/surat_jalan_1.jpg'],
        nota_photo_url: ['https://example.com/nota_1.jpg']
      },
      {
        do_number: 'DO-2025-002',
        do_name: 'Pengiriman Gas CNG ke Bandung',
        customer_name: 'CV Energi Mandiri',
        item_name: 'CNG Compressed',
        minimal_load_quantity: 50,
        actual_load_quantity: 52,
        unit: 'kubik',
        unit_price: 12000,
        total_amount: 624000,
        trip_allowance: 300000,
        gaji: 180000,
        ongkosan: 144000,
        load_location: 'SPBG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'CV Energi Mandiri, Jl. Asia Afrika No. 100, Bandung',
        unload_latitude: -6.9175,
        unload_longitude: 107.6191,
        payment_status: 'lunas',
        payment_type: 'cash',
        status: 'completed',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        departed_to_load_location_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
        arrived_at_load_location_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        departed_from_load_location_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        arrived_at_unload_location_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000),
        departed_from_unload_location_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
        surat_jalan_photo_url: ['https://example.com/surat_jalan_2.jpg'],
        nota_photo_url: ['https://example.com/nota_2.jpg']
      },

      // === IN PROGRESS DELIVERY ORDERS ===
      {
        do_number: 'DO-2025-003',
        do_name: 'Pengiriman Gas LPG ke Tangerang',
        customer_name: 'UD Gas Makmur',
        item_name: 'LPG 50kg',
        minimal_load_quantity: 25,
        actual_load_quantity: null,
        unit: 'kubik',
        unit_price: 18000,
        total_amount: 450000,
        trip_allowance: 200000,
        gaji: 120000,
        ongkosan: 130000,
        load_location: 'Depot Gas LPG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'UD Gas Makmur, Jl. Raya Serpong No. 50, Tangerang',
        unload_latitude: -6.3150,
        unload_longitude: 106.6625,
        payment_status: 'awaiting_confirmation',
        payment_type: null,
        status: 'at_unload_location',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        departed_to_load_location_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        arrived_at_load_location_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        departed_from_load_location_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        arrived_at_unload_location_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        departed_from_unload_location_at: null,
        completed_at: null,
        surat_jalan_photo_url: ['https://example.com/surat_jalan_3.jpg'],
        nota_photo_url: null
      },
      {
        do_number: 'DO-2025-004',
        do_name: 'Pengiriman Gas CNG ke Depok',
        customer_name: 'PT Gas Depok',
        item_name: 'CNG Compressed',
        minimal_load_quantity: 30,
        actual_load_quantity: null,
        unit: 'kubik',
        unit_price: 14000,
        total_amount: 420000,
        trip_allowance: 180000,
        gaji: 100000,
        ongkosan: 140000,
        load_location: 'SPBG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'PT Gas Depok, Jl. Margonda Raya No. 200, Depok',
        unload_latitude: -6.4025,
        unload_longitude: 106.7942,
        payment_status: 'awaiting_confirmation',
        payment_type: null,
        status: 'otw_to_unload_location',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        departed_to_load_location_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
        arrived_at_load_location_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        departed_from_load_location_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        arrived_at_unload_location_at: null,
        departed_from_unload_location_at: null,
        completed_at: null,
        surat_jalan_photo_url: ['https://example.com/surat_jalan_4.jpg'],
        nota_photo_url: null
      },

      // === NEWLY ASSIGNED DELIVERY ORDERS ===
      {
        do_number: 'DO-2025-005',
        do_name: 'Pengiriman Gas LPG ke Bogor',
        customer_name: 'CV Gas Bogor',
        item_name: 'LPG 12kg',
        minimal_load_quantity: 80,
        actual_load_quantity: null,
        unit: 'kubik',
        unit_price: 16000,
        total_amount: 1280000,
        trip_allowance: 280000,
        gaji: 160000,
        ongkosan: 840000,
        load_location: 'Depot Gas LPG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'CV Gas Bogor, Jl. Pajajaran No. 150, Bogor',
        unload_latitude: -6.5971,
        unload_longitude: 106.8060,
        payment_status: 'awaiting_confirmation',
        payment_type: null,
        status: 'at_spbu',
        created_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        departed_to_load_location_at: null,
        arrived_at_load_location_at: null,
        departed_from_load_location_at: null,
        arrived_at_unload_location_at: null,
        departed_from_unload_location_at: null,
        completed_at: null,
        surat_jalan_photo_url: null,
        nota_photo_url: null
      },
      {
        do_number: 'DO-2025-006',
        do_name: 'Pengiriman Gas CNG ke Bekasi',
        customer_name: 'UD Gas Bekasi',
        item_name: 'CNG Compressed',
        minimal_load_quantity: 40,
        actual_load_quantity: null,
        unit: 'kubik',
        unit_price: 13000,
        total_amount: 520000,
        trip_allowance: 220000,
        gaji: 140000,
        ongkosan: 160000,
        load_location: 'SPBG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'UD Gas Bekasi, Jl. Raya Bekasi No. 300, Bekasi',
        unload_latitude: -6.2383,
        unload_longitude: 106.9756,
        payment_status: 'awaiting_confirmation',
        payment_type: null,
        status: 'at_spbu',
        created_at: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        departed_to_load_location_at: null,
        arrived_at_load_location_at: null,
        departed_from_load_location_at: null,
        arrived_at_unload_location_at: null,
        departed_from_unload_location_at: null,
        completed_at: null,
        surat_jalan_photo_url: null,
        nota_photo_url: null
      },

      // === MULTIPLE UNLOAD LOCATIONS ===
      {
        do_number: 'DO-2025-007',
        do_name: 'Pengiriman Gas LPG Multi-Lokasi Jakarta',
        customer_name: 'PT Gas Jakarta Multi',
        item_name: 'LPG 12kg',
        minimal_load_quantity: 60,
        actual_load_quantity: null,
        unit: 'kubik',
        unit_price: 15500,
        total_amount: 930000,
        trip_allowance: 350000,
        gaji: 200000,
        ongkosan: 380000,
        load_location: 'Depot Gas LPG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'PT Gas Jakarta Multi, Jl. Sudirman No. 10, Jakarta Selatan',
        unload_latitude: -6.2088,
        unload_longitude: 106.8456,
        additional_unload_locations: JSON.stringify([
          {
            location: 'CV Gas Jakarta Utara, Jl. Kelapa Gading No. 50, Jakarta Utara',
            latitude: -6.1574,
            longitude: 106.9073
          },
          {
            location: 'UD Gas Jakarta Timur, Jl. Bekasi Raya No. 100, Jakarta Timur',
            latitude: -6.2250,
            longitude: 106.9004
          }
        ]),
        payment_status: 'awaiting_confirmation',
        payment_type: null,
        status: 'at_spbu',
        created_at: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        departed_to_load_location_at: null,
        arrived_at_load_location_at: null,
        departed_from_load_location_at: null,
        arrived_at_unload_location_at: null,
        departed_from_unload_location_at: null,
        completed_at: null,
        surat_jalan_photo_url: null,
        nota_photo_url: null
      },

      // === CANCELLED DELIVERY ORDER ===
      {
        do_number: 'DO-2025-008',
        do_name: 'Pengiriman Gas LPG ke Karawang (Dibatalkan)',
        customer_name: 'PT Gas Karawang',
        item_name: 'LPG 50kg',
        minimal_load_quantity: 20,
        actual_load_quantity: null,
        unit: 'kubik',
        unit_price: 17000,
        total_amount: 340000,
        trip_allowance: 150000,
        gaji: 80000,
        ongkosan: 110000,
        load_location: 'Depot Gas LPG Cibitung, Bekasi',
        load_latitude: -6.2088,
        load_longitude: 106.8456,
        unload_location: 'PT Gas Karawang, Jl. Raya Karawang No. 75, Karawang',
        unload_latitude: -6.3036,
        unload_longitude: 107.3053,
        payment_status: 'awaiting_confirmation',
        payment_type: null,
        status: 'cancelled',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        departed_to_load_location_at: null,
        arrived_at_load_location_at: null,
        departed_from_load_location_at: null,
        arrived_at_unload_location_at: null,
        departed_from_unload_location_at: null,
        completed_at: null,
        surat_jalan_photo_url: null,
        nota_photo_url: null
      }
    ];

    // 5. Insert delivery orders with proper driver and vehicle assignments
    console.log("📦 Inserting delivery orders...");
    for (let i = 0; i < deliveryOrdersData.length; i++) {
      const doData = deliveryOrdersData[i];
      const driver = drivers[i % drivers.length]; // Cycle through drivers
      const vehicle = vehicles[i % vehicles.length]; // Cycle through vehicles

      const insertQuery = `
        INSERT INTO delivery_orders (
          do_number, do_name, customer_name, item_name, minimal_load_quantity, 
          actual_load_quantity, unit, unit_price, total_amount, trip_allowance, 
          gaji, ongkosan, load_location, load_latitude, load_longitude, 
          unload_location, unload_latitude, unload_longitude, additional_unload_locations,
          payment_status, payment_type, status, created_at, 
          departed_to_load_location_at, arrived_at_load_location_at, departed_from_load_location_at,
          arrived_at_unload_location_at, departed_from_unload_location_at, completed_at,
          surat_jalan_photo_url, nota_photo_url, driver_id, vehicle_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
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
        doData.additional_unload_locations,
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
        driver.id,
        vehicle.id
      ];

      await db.pool.query(insertQuery, values);
      console.log(`✅ Created delivery order: ${doData.do_number} (${doData.status}) - Driver: ${driver.full_name} - Vehicle: ${vehicle.license_plate}`);
    }

    // 6. Get final summary
    console.log("\n📊 Getting final summary...");
    const totalDOs = await db.pool.query('SELECT COUNT(*) as total FROM delivery_orders');
    const statusSummary = await db.pool.query(`
      SELECT status, COUNT(*) as count 
      FROM delivery_orders 
      GROUP BY status 
      ORDER BY status
    `);
    const paymentSummary = await db.pool.query(`
      SELECT payment_status, COUNT(*) as count 
      FROM delivery_orders 
      GROUP BY payment_status 
      ORDER BY payment_status
    `);

    console.log("\n🎉 Delivery Orders test data inserted successfully!");
    console.log("=" * 80);
    console.log("📋 Summary:");
    console.log(`   - Total Delivery Orders: ${totalDOs.rows[0].total}`);
    console.log("   - Status Distribution:");
    statusSummary.rows.forEach(row => {
      console.log(`     • ${row.status}: ${row.count}`);
    });
    console.log("   - Payment Status Distribution:");
    paymentSummary.rows.forEach(row => {
      console.log(`     • ${row.payment_status}: ${row.count}`);
    });
    console.log("=" * 80);

  } catch (error) {
    console.error("💥 Error inserting delivery orders test data:", error);
    throw error;
  } finally {
    await db.pool.end();
  }
};

// Run the test data insertion
insertDeliveryOrdersTestData()
  .then(() => {
    console.log("🎉 Delivery Orders test data insertion completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Delivery Orders test data insertion failed:", error);
    process.exit(1);
  });
