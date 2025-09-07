// Script to insert Vehicle Expense Cash test data
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

const insertVehicleExpenseTestData = async () => {
  try {
    console.log("🚀 Starting Vehicle Expense Cash test data insertion...");

    // 1. First, ensure we have some vehicles in the database
    console.log("🚗 Ensuring vehicles exist...");
    await db.pool.query(`
      INSERT INTO vehicles (license_plate, type, capacity, status, created_at) VALUES
      ('B1234ABC', 'Truck', '5000', 'available', NOW()),
      ('B5678DEF', 'Truck', '3500', 'available', NOW()),
      ('B9012GHI', 'Truck', '4000', 'available', NOW()),
      ('B3456JKL', 'Truck', '2500', 'available', NOW()),
      ('B7890MNO', 'Truck', '3000', 'maintenance', NOW())
      ON CONFLICT (license_plate) DO NOTHING;
    `);

    // 2. Get vehicle IDs for reference
    console.log("📋 Getting vehicle IDs...");
    const vehicleResult = await db.pool.query(`
      SELECT id, license_plate FROM vehicles WHERE license_plate IN ('B1234ABC', 'B5678DEF', 'B9012GHI', 'B3456JKL', 'B7890MNO')
      ORDER BY license_plate;
    `);
    const vehicles = vehicleResult.rows;
    console.log("Found vehicles:", vehicles.map(v => `${v.license_plate} (ID: ${v.id})`));

    // 3. Ensure vehicle expense categories exist
    console.log("📝 Ensuring vehicle expense categories exist...");
    await db.pool.query(`
      INSERT INTO cash_categories (category_name, category_type, description) VALUES
      ('Bahan Bakar', 'expense', 'Pengeluaran untuk bahan bakar kendaraan'),
      ('Servis Kendaraan', 'expense', 'Biaya servis dan maintenance kendaraan'),
      ('Perbaikan', 'expense', 'Biaya perbaikan kendaraan'),
      ('Asuransi Kendaraan', 'expense', 'Premi asuransi kendaraan'),
      ('Parkir', 'expense', 'Biaya parkir kendaraan'),
      ('Tol', 'expense', 'Biaya tol kendaraan'),
      ('Pajak Kendaraan', 'expense', 'Pajak kendaraan bermotor'),
      ('STNK', 'expense', 'Biaya STNK kendaraan'),
      ('Ban', 'expense', 'Penggantian dan perawatan ban'),
      ('Oli', 'expense', 'Penggantian oli kendaraan'),
      ('Spare Part', 'expense', 'Penggantian spare part kendaraan'),
      ('Cuci Kendaraan', 'expense', 'Biaya cuci kendaraan'),
      ('Maintenance', 'expense', 'Biaya maintenance rutin kendaraan')
      ON CONFLICT (category_name) DO NOTHING;
    `);

    // 4. Get category IDs
    console.log("📋 Getting vehicle expense category IDs...");
    const categoryResult = await db.pool.query(`
      SELECT id, category_name FROM cash_categories 
      WHERE category_name IN ('Bahan Bakar', 'Servis Kendaraan', 'Perbaikan', 'Asuransi Kendaraan', 'Parkir', 'Tol', 'Pajak Kendaraan', 'STNK', 'Ban', 'Oli', 'Spare Part', 'Cuci Kendaraan', 'Maintenance')
      ORDER BY category_name;
    `);
    const categories = categoryResult.rows;
    console.log("Found categories:", categories.map(c => `${c.category_name} (ID: ${c.id})`));

    // 5. Insert vehicle expense transactions with various types
    console.log("💰 Inserting vehicle expense transactions...");
    
    // Get the first vehicle and category IDs for reference
    const vehicle1Id = vehicles[0]?.id;
    const vehicle2Id = vehicles[1]?.id;
    const vehicle3Id = vehicles[2]?.id;
    const vehicle4Id = vehicles[3]?.id;
    const vehicle5Id = vehicles[4]?.id;

    const fuelCategoryId = categories.find(c => c.category_name === 'Bahan Bakar')?.id;
    const serviceCategoryId = categories.find(c => c.category_name === 'Servis Kendaraan')?.id;
    const repairCategoryId = categories.find(c => c.category_name === 'Perbaikan')?.id;
    const insuranceCategoryId = categories.find(c => c.category_name === 'Asuransi Kendaraan')?.id;
    const tollCategoryId = categories.find(c => c.category_name === 'Tol')?.id;
    const tireCategoryId = categories.find(c => c.category_name === 'Ban')?.id;
    const oilCategoryId = categories.find(c => c.category_name === 'Oli')?.id;
    const sparePartCategoryId = categories.find(c => c.category_name === 'Spare Part')?.id;
    const maintenanceCategoryId = categories.find(c => c.category_name === 'Maintenance')?.id;

    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, vehicle_id, no_nota, created_at
      ) VALUES 
      -- Regular Debit Transactions (Income)
      ('debit', ${insuranceCategoryId}, 2500000.00, 'Klaim asuransi kendaraan B1234ABC - kecelakaan ringan', 'VEH-INS-CLAIM-001-2025', '2025-01-01', 'Ewaldo', ${vehicle1Id}, '{"VEH-NOTA-INS-001"}', '2025-01-01 08:00:00+07'),
      ('debit', ${insuranceCategoryId}, 1800000.00, 'Klaim asuransi kendaraan B5678DEF - kerusakan mesin', 'VEH-INS-CLAIM-002-2025', '2025-01-02', 'Malvin', ${vehicle2Id}, '{"VEH-NOTA-INS-002"}', '2025-01-02 09:30:00+07'),
      
      -- Regular Kredit Transactions (Expenses)
      ('kredit', ${fuelCategoryId}, 500000.00, 'Pengisian BBM untuk B1234ABC - 50 liter', 'VEH-FUEL-001-2025', '2025-01-03', 'Ewaldo', ${vehicle1Id}, '{"VEH-NOTA-FUEL-001"}', '2025-01-03 10:15:00+07'),
      ('kredit', ${fuelCategoryId}, 750000.00, 'Pengisian BBM untuk B5678DEF - 75 liter', 'VEH-FUEL-002-2025', '2025-01-04', 'Malvin', ${vehicle2Id}, '{"VEH-NOTA-FUEL-002"}', '2025-01-04 11:30:00+07'),
      ('kredit', ${serviceCategoryId}, 1200000.00, 'Servis rutin B9012GHI - ganti oli dan filter', 'VEH-SERVICE-001-2025', '2025-01-05', 'Company', ${vehicle3Id}, '{"VEH-NOTA-SERVICE-001"}', '2025-01-05 12:45:00+07'),
      ('kredit', ${repairCategoryId}, 2500000.00, 'Perbaikan rem B3456JKL - ganti kampas rem', 'VEH-REPAIR-001-2025', '2025-01-06', 'General', ${vehicle4Id}, '{"VEH-NOTA-REPAIR-001"}', '2025-01-06 13:20:00+07'),
      ('kredit', ${tollCategoryId}, 150000.00, 'Biaya tol B1234ABC - Jakarta-Bandung', 'VEH-TOLL-001-2025', '2025-01-07', 'Ewaldo', ${vehicle1Id}, '{"VEH-NOTA-TOLL-001"}', '2025-01-07 14:10:00+07'),
      ('kredit', ${tireCategoryId}, 800000.00, 'Ganti ban B5678DEF - 2 ban belakang', 'VEH-TIRE-001-2025', '2025-01-08', 'Malvin', ${vehicle2Id}, '{"VEH-NOTA-TIRE-001"}', '2025-01-08 15:30:00+07'),
      ('kredit', ${oilCategoryId}, 300000.00, 'Ganti oli B9012GHI - oli mesin dan transmisi', 'VEH-OIL-001-2025', '2025-01-09', 'Company', ${vehicle3Id}, '{"VEH-NOTA-OIL-001"}', '2025-01-09 16:45:00+07'),
      ('kredit', ${sparePartCategoryId}, 450000.00, 'Ganti filter udara B3456JKL', 'VEH-SPARE-001-2025', '2025-01-10', 'General', ${vehicle4Id}, '{"VEH-NOTA-SPARE-001"}', '2025-01-10 17:15:00+07'),
      
      -- Debit Tempo Transactions (Income Tempo)
      ('debit_tempo', ${insuranceCategoryId}, 3000000.00, 'Klaim asuransi B7890MNO - pending approval', 'VEH-INS-TEMPO-001-2025', '2025-01-11', 'Ewaldo', ${vehicle5Id}, '{"VEH-NOTA-INS-TEMPO-001"}', '2025-01-11 18:00:00+07'),
      ('debit_tempo', ${insuranceCategoryId}, 2200000.00, 'Klaim asuransi B1234ABC - dalam proses', 'VEH-INS-TEMPO-002-2025', '2025-01-12', 'Malvin', ${vehicle1Id}, '{"VEH-NOTA-INS-TEMPO-002"}', '2025-01-12 19:30:00+07'),
      
      -- Kredit Tempo Transactions (Expense Tempo)
      ('kredit_tempo', ${serviceCategoryId}, 1800000.00, 'Servis besar B5678DEF - pembayaran tempo 30 hari', 'VEH-SERVICE-TEMPO-001-2025', '2025-01-13', 'Company', ${vehicle2Id}, '{"VEH-NOTA-SERVICE-TEMPO-001"}', '2025-01-13 20:15:00+07'),
      ('kredit_tempo', ${repairCategoryId}, 3500000.00, 'Overhaul mesin B9012GHI - pembayaran tempo 45 hari', 'VEH-REPAIR-TEMPO-001-2025', '2025-01-14', 'General', ${vehicle3Id}, '{"VEH-NOTA-REPAIR-TEMPO-001"}', '2025-01-14 21:00:00+07'),
      ('kredit_tempo', ${tireCategoryId}, 1200000.00, 'Ganti 4 ban B3456JKL - pembayaran tempo 15 hari', 'VEH-TIRE-TEMPO-001-2025', '2025-01-15', 'Ewaldo', ${vehicle4Id}, '{"VEH-NOTA-TIRE-TEMPO-001"}', '2025-01-15 22:30:00+07'),
      ('kredit_tempo', ${maintenanceCategoryId}, 900000.00, 'Maintenance rutin B7890MNO - pembayaran tempo 20 hari', 'VEH-MAINT-TEMPO-001-2025', '2025-01-16', 'Malvin', ${vehicle5Id}, '{"VEH-NOTA-MAINT-TEMPO-001"}', '2025-01-16 23:45:00+07'),
      
      -- More recent transactions for testing filters
      ('kredit', ${fuelCategoryId}, 600000.00, 'Pengisian BBM untuk B1234ABC - 60 liter', 'VEH-FUEL-003-2025', '2025-01-17', 'Ewaldo', ${vehicle1Id}, '{"VEH-NOTA-FUEL-003"}', '2025-01-17 08:30:00+07'),
      ('kredit', ${serviceCategoryId}, 800000.00, 'Servis AC B5678DEF', 'VEH-SERVICE-002-2025', '2025-01-18', 'Malvin', ${vehicle2Id}, '{"VEH-NOTA-SERVICE-002"}', '2025-01-18 09:45:00+07'),
      ('kredit', ${tollCategoryId}, 200000.00, 'Biaya tol B9012GHI - Bandung-Surabaya', 'VEH-TOLL-002-2025', '2025-01-19', 'Company', ${vehicle3Id}, '{"VEH-NOTA-TOLL-002"}', '2025-01-19 10:20:00+07'),
      ('kredit_tempo', ${repairCategoryId}, 2800000.00, 'Perbaikan transmisi B3456JKL - pembayaran tempo 30 hari', 'VEH-REPAIR-TEMPO-002-2025', '2025-01-20', 'General', ${vehicle4Id}, '{"VEH-NOTA-REPAIR-TEMPO-002"}', '2025-01-20 11:35:00+07'),
      ('debit_tempo', ${insuranceCategoryId}, 1500000.00, 'Klaim asuransi B7890MNO - kerusakan akibat banjir', 'VEH-INS-TEMPO-003-2025', '2025-01-21', 'Ewaldo', ${vehicle5Id}, '{"VEH-NOTA-INS-TEMPO-003"}', '2025-01-21 12:50:00+07'),
      
      -- Mixed account transactions
      ('kredit', ${fuelCategoryId}, 400000.00, 'Pengisian BBM untuk B3456JKL - 40 liter', 'VEH-FUEL-004-2025', '2025-01-22', 'General', ${vehicle4Id}, '{"VEH-NOTA-FUEL-004"}', '2025-01-22 13:15:00+07'),
      ('kredit', ${oilCategoryId}, 250000.00, 'Ganti oli B7890MNO - oli mesin', 'VEH-OIL-002-2025', '2025-01-23', 'Malvin', ${vehicle5Id}, '{"VEH-NOTA-OIL-002"}', '2025-01-23 14:30:00+07'),
      ('kredit', ${sparePartCategoryId}, 600000.00, 'Ganti filter bahan bakar B1234ABC', 'VEH-SPARE-002-2025', '2025-01-24', 'Company', ${vehicle1Id}, '{"VEH-NOTA-SPARE-002"}', '2025-01-24 15:45:00+07'),
      ('kredit_tempo', ${serviceCategoryId}, 1500000.00, 'Servis komprehensif B5678DEF - pembayaran tempo 25 hari', 'VEH-SERVICE-TEMPO-002-2025', '2025-01-25', 'Ewaldo', ${vehicle2Id}, '{"VEH-NOTA-SERVICE-TEMPO-002"}', '2025-01-25 16:00:00+07'),
      ('debit_tempo', ${insuranceCategoryId}, 2000000.00, 'Klaim asuransi B9012GHI - kerusakan akibat tabrakan', 'VEH-INS-TEMPO-004-2025', '2025-01-26', 'Malvin', ${vehicle3Id}, '{"VEH-NOTA-INS-TEMPO-004"}', '2025-01-26 17:15:00+07')
    `);

    // 6. Insert some transactions without vehicle_id (non-vehicle expenses) to test filtering
    console.log("📝 Inserting non-vehicle transactions for comparison...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, no_nota, created_at
      ) VALUES 
      ('kredit', ${fuelCategoryId}, 1000000.00, 'Pengisian BBM generator - bukan kendaraan', 'VEH-GEN-FUEL-001-2025', '2025-01-27', 'General', '{"VEH-NOTA-GEN-001"}', '2025-01-27 18:30:00+07'),
      ('debit', ${insuranceCategoryId}, 500000.00, 'Klaim asuransi gedung - bukan kendaraan', 'VEH-BUILD-INS-001-2025', '2025-01-28', 'Company', '{"VEH-NOTA-BUILD-001"}', '2025-01-28 19:45:00+07')
    `);

    console.log("✅ Vehicle Expense Cash test data insertion completed successfully!");
    console.log("\n📊 Summary of inserted data:");
    console.log("🚗 Vehicles: 5 vehicles (B1234ABC, B5678DEF, B9012GHI, B3456JKL, B7890MNO)");
    console.log("📝 Categories: 13 vehicle expense categories");
    console.log("💰 Transactions: 25 vehicle expense transactions");
    console.log("   - 2 Regular Debit (Income)");
    console.log("   - 10 Regular Kredit (Expenses)");
    console.log("   - 2 Debit Tempo (Income Tempo)");
    console.log("   - 6 Kredit Tempo (Expense Tempo)");
    console.log("   - 2 Non-vehicle transactions (for comparison)");
    console.log("\n🎯 Test scenarios covered:");
    console.log("   - Different transaction types (debit, kredit, debit_tempo, kredit_tempo)");
    console.log("   - Various vehicle expense categories");
    console.log("   - Different accounts (Ewaldo, Malvin, Company, General)");
    console.log("   - Different vehicles");
    console.log("   - Nota numbers for each transaction");
    console.log("   - Date range spanning multiple days");
    console.log("   - Mixed regular and tempo transactions for testing 'Lunasi' functionality");

  } catch (error) {
    console.error("❌ Error inserting vehicle expense test data:", error);
    throw error;
  }
};

// Run the script
insertVehicleExpenseTestData()
  .then(() => {
    console.log("🎉 Vehicle Expense Cash test data insertion completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Failed to insert vehicle expense test data:", error);
    process.exit(1);
  });
