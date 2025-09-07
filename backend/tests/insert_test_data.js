// Script to insert Module 2 test data for comprehensive SPBG & CNG filtering testing
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

const insertTestData = async () => {
  try {
    console.log("🚀 Starting comprehensive Module 2 test data insertion...");

    // 1. Add CNG-specific cash categories (if they don't exist)
    console.log("📝 Adding CNG cash categories...");
    await db.pool.query(`
      INSERT INTO cash_categories (category_name, category_type, description) VALUES
      ('CNG Fuel Purchase', 'expense', 'Pembelian bahan bakar CNG untuk kendaraan'),
      ('CNG Equipment Maintenance', 'expense', 'Maintenance peralatan dan sistem CNG'),
      ('CNG Insurance', 'expense', 'Asuransi untuk peralatan dan kendaraan CNG'),
      ('SPBG Deposit', 'expense', 'Deposit awal di Stasiun Pengisian Bahan Bakar Gas'),
      ('SPBG Refund', 'income', 'Pengembalian deposit SPBG yang tidak terpakai')
      ON CONFLICT (category_name) DO NOTHING;
    `);

    // 2. Get category IDs after insertion
    console.log("📝 Getting category IDs...");
    const categoryResult = await db.pool.query(`
      SELECT id, category_name FROM cash_categories 
      WHERE category_name IN (
        'CNG Fuel Purchase', 'CNG Equipment Maintenance', 'CNG Insurance', 
        'SPBG Deposit', 'SPBG Refund'
      )
      ORDER BY category_name
    `);
    
    const categoryMap = {};
    categoryResult.rows.forEach(cat => {
      categoryMap[cat.category_name] = cat.id;
    });

    // 3. Insert SPBG-ONLY transactions (SPBG category + SPBG fields, no CNG keywords)
    console.log("📝 Inserting SPBG-ONLY transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, spbg_location, gas_volume_m3, calculation_method, 
        jisdor_rate, gas_filling_cost, no_nota, created_at
      ) VALUES 
      ('debit', ${categoryMap['SPBG Gas Filling'] || 'NULL'}, 1500000.00, 'Pengisian gas untuk truck B1111XYZ - Jakarta SPBG Center', 'MOD2-SPBG-JKT-001-2025', '2025-08-01', 'Bank BCA', 'jakarta', 100.00, 'jisdor', 15000.00, 1500000.00, '{"MOD2-INV-JKT-001", "MOD2-INV-JKT-002"}', '2025-08-01 08:00:00+07'),
      ('debit', ${categoryMap['SPBG Gas Filling'] || 'NULL'}, 750000.00, 'Pengisian gas untuk truck B2222ABC - Bandung SPBG Station', 'MOD2-SPBG-BDG-002-2025', '2025-08-02', 'Bank Mandiri', 'bandung', 50.00, 'jisdor', 15000.00, 750000.00, '{"MOD2-INV-BDG-001"}', '2025-08-02 09:30:00+07'),
      ('debit', ${categoryMap['SPBG Gas Filling'] || 'NULL'}, 400000.00, 'Pengisian gas untuk truck B3333DEF - Surabaya SPBG Hub', 'MOD2-SPBG-SBY-003-2025', '2025-08-03', 'Bank BNI', 'surabaya', 25.00, 'fixed', 16000.00, 400000.00, '{"MOD2-INV-SBY-001", "MOD2-INV-SBY-002", "MOD2-INV-SBY-003"}', '2025-08-03 10:15:00+07'),
      ('kredit', ${categoryMap['SPBG Refund'] || 'NULL'}, 250000.00, 'Pengembalian deposit SPBG Semarang - tidak terpakai', 'MOD2-REFUND-SMG-001-2025', '2025-08-04', 'Bank BCA', 'semarang', 15.00, 'fixed', 16666.67, 250000.00, '{"MOD2-REF-SMG-001"}', '2025-08-04 14:20:00+07'),
      ('debit', ${categoryMap['SPBG Gas Filling'] || 'NULL'}, 2000000.00, 'Pengisian gas premium untuk truck B4444GHI - Yogyakarta SPBG Station', 'MOD2-SPBG-JOG-004-2025', '2025-08-05', 'Bank Mandiri', 'yogyakarta', 80.00, 'jisdor', 25000.00, 2000000.00, '{"MOD2-INV-JOG-001", "MOD2-INV-JOG-002"}', '2025-08-05 11:45:00+07');
    `);

    // 4. Insert CNG-ONLY transactions (CNG categories, no SPBG fields, CNG keywords in description)
    console.log("📝 Inserting CNG-ONLY transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, created_at
      ) VALUES 
      ('debit', ${categoryMap['CNG Fuel Purchase'] || 'NULL'}, 500000.00, 'Pembelian bahan bakar CNG untuk depot Jakarta - 50 m³ @ Rp 10,000/m³', 'MOD2-CNG-FUEL-001-2025', '2025-08-01', 'Bank BCA', '2025-08-01 07:30:00+07'),
      ('debit', ${categoryMap['CNG Equipment Maintenance'] || 'NULL'}, 1200000.00, 'Maintenance sistem CNG truck B5555JKL - ganti regulator dan selang', 'MOD2-CNG-MAINT-001-2025', '2025-08-02', 'Bank Mandiri', '2025-08-02 13:45:00+07'),
      ('debit', ${categoryMap['CNG Insurance'] || 'NULL'}, 800000.00, 'Asuransi tahunan peralatan CNG - coverage kerusakan dan kecelakaan', 'MOD2-CNG-INS-001-2025', '2025-08-03', 'Bank BNI', '2025-08-03 16:20:00+07'),
      ('debit', ${categoryMap['SPBG Deposit'] || 'NULL'}, 1000000.00, 'Deposit awal di SPBG Jakarta Center - untuk pengisian gas reguler', 'MOD2-SPBG-DEP-001-2025', '2025-08-04', 'Bank BCA', '2025-08-04 09:15:00+07'),
      ('debit', ${categoryMap['CNG Fuel Purchase'] || 'NULL'}, 300000.00, 'Pengisian gas CNG untuk truck B6666MNO - 30 m³ @ Rp 10,000/m³', 'MOD2-CNG-GAS-001-2025', '2025-08-05', 'Bank Mandiri', '2025-08-05 15:30:00+07');
    `);

    // 5. Insert BOTH CNG & SPBG transactions (CNG categories + SPBG fields + CNG keywords)
    console.log("📝 Inserting BOTH CNG & SPBG transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, spbg_location, gas_volume_m3, calculation_method, 
        jisdor_rate, gas_filling_cost, no_nota, created_at
      ) VALUES 
      ('debit', ${categoryMap['CNG Fuel Purchase'] || 'NULL'}, 1800000.00, 'Pengisian gas CNG untuk truck B9999XYZ - Medan SPBG Hub', 'MOD2-CNG-SPBG-MDN-001-2025', '2025-08-06', 'Bank BCA', 'medan', 120.00, 'jisdor', 15000.00, 1800000.00, '{"MOD2-INV-MDN-001", "MOD2-INV-MDN-002"}', '2025-08-06 10:00:00+07'),
      ('debit', ${categoryMap['CNG Equipment Maintenance'] || 'NULL'}, 900000.00, 'Maintenance sistem CNG + pengisian gas di Palembang SPBG', 'MOD2-CNG-SPBG-PLG-001-2025', '2025-08-07', 'Bank Mandiri', 'palembang', 60.00, 'fixed', 15000.00, 900000.00, '{"MOD2-INV-PLG-001"}', '2025-08-07 11:30:00+07'),
      ('debit', ${categoryMap['CNG Insurance'] || 'NULL'}, 1500000.00, 'Asuransi CNG + gas filling di Makassar SPBG Center', 'MOD2-CNG-SPBG-MKS-001-2025', '2025-08-08', 'Bank BNI', 'makassar', 100.00, 'jisdor', 15000.00, 1500000.00, '{"MOD2-INV-MKS-001", "MOD2-INV-MKS-002"}', '2025-08-08 14:15:00+07');
    `);

    // 6. Get regular category IDs
    console.log("📝 Getting regular category IDs...");
    const regularCategoryResult = await db.pool.query(`
      SELECT id, category_name FROM cash_categories 
      WHERE category_name IN (
        'Setoran Modal', 'Pendapatan Operasional', 'Pendapatan Lain-lain', 
        'Biaya Kantor', 'Gaji Staf', 'Pembelian Aset', 'Biaya Operasional'
      )
      ORDER BY category_name
    `);
    
    const regularCategoryMap = {};
    regularCategoryResult.rows.forEach(cat => {
      regularCategoryMap[cat.category_name] = cat.id;
    });

    // 7. Insert NON-CNG & NON-SPBG transactions (regular categories, no CNG/SPBG keywords, no SPBG fields)
    console.log("📝 Inserting NON-CNG & NON-SPBG transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, created_at
      ) VALUES 
      ('debit', ${regularCategoryMap['Setoran Modal'] || 'NULL'}, 5000000.00, 'Setoran modal awal untuk operasional perusahaan', 'MOD2-MODAL-001-2025', '2025-08-09', 'Bank BCA', '2025-08-09 09:00:00+07'),
      ('debit', ${regularCategoryMap['Pendapatan Operasional'] || 'NULL'}, 2500000.00, 'Pendapatan dari pengiriman barang Jakarta-Bandung', 'MOD2-PENDAPATAN-001-2025', '2025-08-10', 'Bank Mandiri', '2025-08-10 10:30:00+07'),
      ('kredit', ${regularCategoryMap['Biaya Kantor'] || 'NULL'}, 800000.00, 'Biaya kantor - pembelian printer dan kertas', 'MOD2-KANTOR-001-2025', '2025-08-11', 'Bank BCA', '2025-08-11 11:45:00+07'),
      ('kredit', ${regularCategoryMap['Gaji Staf'] || 'NULL'}, 3000000.00, 'Gaji staf bulan Agustus 2025', 'MOD2-GAJI-001-2025', '2025-08-12', 'Bank Mandiri', '2025-08-12 12:00:00+07'),
      ('kredit', ${regularCategoryMap['Pembelian Aset'] || 'NULL'}, 15000000.00, 'Pembelian truck baru untuk operasional', 'MOD2-ASET-001-2025', '2025-08-13', 'Bank BNI', '2025-08-13 13:15:00+07'),
      ('kredit', ${regularCategoryMap['Biaya Operasional'] || 'NULL'}, 1200000.00, 'Biaya BBM solar untuk truck diesel', 'MOD2-BBM-001-2025', '2025-08-14', 'Bank BCA', '2025-08-14 14:30:00+07'),
      ('debit', ${regularCategoryMap['Pendapatan Lain-lain'] || 'NULL'}, 500000.00, 'Pendapatan sewa gudang', 'MOD2-SEWA-001-2025', '2025-08-15', 'Bank Mandiri', '2025-08-15 15:45:00+07');
    `);

    // 6. Insert sample deposit groups (if they don't exist)
    console.log("📝 Inserting SPBG deposit groups...");
    
    // Check if groups already exist
    const existingGroups = await db.pool.query(`
      SELECT group_name FROM deposit_groups 
      WHERE group_name IN (
        'Jakarta SPBG Center - CNG Regular',
        'Bandung SPBG Station - CNG Premium', 
        'Surabaya SPBG Hub - LNG Industrial',
        'Semarang SPBG Center - CNG Standard',
        'Yogyakarta SPBG Station - CNG Premium Plus'
      )
    `);
    
    const existingNames = existingGroups.rows.map(row => row.group_name);
    const groupsToInsert = [
      ['Jakarta SPBG Center - CNG Regular', 1000.00, 5000000.00, 'kubik', 'spbg', 'jakarta', 'PT Gas Indonesia', 'cng', '2025-08-01 08:00:00+07'],
      ['Bandung SPBG Station - CNG Premium', 800.00, 4000000.00, 'kubik', 'spbg', 'bandung', 'PT Pertamina Gas', 'cng', '2025-08-02 09:30:00+07'],
      ['Surabaya SPBG Hub - LNG Industrial', 2000.00, 10000000.00, 'kubik', 'spbg', 'surabaya', 'PT Shell Gas Indonesia', 'lng', '2025-08-03 10:15:00+07'],
      ['Semarang SPBG Center - CNG Standard', 600.00, 3000000.00, 'kubik', 'spbg', 'semarang', 'PT Gas Indonesia', 'cng', '2025-08-04 14:20:00+07'],
      ['Yogyakarta SPBG Station - CNG Premium Plus', 1200.00, 6000000.00, 'kubik', 'spbg', 'yogyakarta', 'PT Pertamina Gas', 'cng', '2025-08-05 11:45:00+07']
    ];
    
    const newGroups = groupsToInsert.filter(group => !existingNames.includes(group[0]));
    
    if (newGroups.length > 0) {
      const values = newGroups.map(group => 
        `('${group[0]}', ${group[1]}, ${group[2]}, '${group[3]}', '${group[4]}', '${group[5]}', '${group[6]}', '${group[7]}', '${group[8]}')`
      ).join(',\n      ');
      
      await db.pool.query(`
        INSERT INTO deposit_groups (
          group_name, target_quantity, deposited_amount, unit, group_type, 
          spbg_location, spbg_operator, gas_type, created_at
        ) VALUES 
        ${values}
      `);
      console.log(`   ✓ Inserted ${newGroups.length} new deposit groups`);
    } else {
      console.log("   ✓ All deposit groups already exist");
    }

    // 7. Get deposit group IDs for linking purchase orders
    console.log("📝 Getting deposit group IDs...");
    const depositGroups = await db.pool.query(`
      SELECT id, group_name FROM deposit_groups 
      WHERE group_name LIKE '%SPBG%' 
      ORDER BY id
    `);
    
    const groupIdMap = {};
    depositGroups.rows.forEach(group => {
      groupIdMap[group.group_name] = group.id;
    });

    // 8. Insert sample purchase orders with deposit_group_id
    console.log("📝 Inserting SPBG purchase orders with deposit group connections...");
    await db.pool.query(`
      INSERT INTO purchase_orders (
        po_number, customer_name, item_name, total_quantity, unit, unit_price, total_amount, 
        load_location, unload_location, order_date, deposit_group_id, status, notes
      ) VALUES 
      ('PO/SPBG-TEST/2025/001', 'PT Konstruksi SPBG Test', 'Pasir Urug', 50.00, 'ton', 50000.00, 2500000.00, 'Quarry Bogor, Jawa Barat', 'Proyek SPBG Jakarta Center', '2025-08-01', ${groupIdMap['Jakarta SPBG Center - CNG Regular']}, 'confirmed', 'Pasir urug untuk pembangunan SPBG Jakarta Center'),
      ('PO/SPBG-TEST/2025/002', 'PT Jalan Raya SPBG Test', 'Batu Split', 30.00, 'ton', 75000.00, 2250000.00, 'Quarry Sukabumi, Jawa Barat', 'Proyek Jalan SPBG Bandung', '2025-08-02', ${groupIdMap['Bandung SPBG Station - CNG Premium']}, 'confirmed', 'Batu split untuk pembangunan jalan akses SPBG Bandung'),
      ('PO/SPBG-TEST/2025/003', 'PT Bangunan SPBG Test', 'Semen', 40.00, 'ton', 120000.00, 4800000.00, 'Pabrik Semen Cibinong, Jawa Barat', 'Proyek Bangunan SPBG Surabaya', '2025-08-03', ${groupIdMap['Surabaya SPBG Hub - LNG Industrial']}, 'confirmed', 'Semen untuk pembangunan gedung SPBG Surabaya'),
      ('PO/SPBG-TEST/2025/004', 'PT Struktur SPBG Test', 'Besi Beton', 10.00, 'ton', 180000.00, 1800000.00, 'Pabrik Besi Cilegon, Banten', 'Proyek Struktur SPBG Semarang', '2025-08-04', ${groupIdMap['Semarang SPBG Center - CNG Standard']}, 'confirmed', 'Besi beton untuk struktur SPBG Semarang'),
      ('PO/SPBG-TEST/2025/005', 'PT Finishing SPBG Test', 'Keramik Lantai', 50.00, 'kubik', 45000.00, 2250000.00, 'Pabrik Keramik Karawang, Jawa Barat', 'Proyek Finishing SPBG Yogyakarta', '2025-08-05', ${groupIdMap['Yogyakarta SPBG Station - CNG Premium Plus']}, 'confirmed', 'Keramik lantai untuk finishing SPBG Yogyakarta'),
      ('PO/SPBG-TEST/2025/006', 'PT Konstruksi SPBG Test', 'Pasir Urug', 30.00, 'ton', 50000.00, 1500000.00, 'Quarry Bogor, Jawa Barat', 'Proyek SPBG Jakarta Center', '2025-08-06', ${groupIdMap['Jakarta SPBG Center - CNG Regular']}, 'partial', 'Pasir urug tambahan untuk pembangunan SPBG Jakarta Center'),
      ('PO/SPBG-TEST/2025/007', 'PT Jalan Raya SPBG Test', 'Batu Split', 20.00, 'ton', 75000.00, 1500000.00, 'Quarry Sukabumi, Jawa Barat', 'Proyek Jalan SPBG Bandung', '2025-08-07', ${groupIdMap['Bandung SPBG Station - CNG Premium']}, 'confirmed', 'Batu split tambahan untuk pembangunan jalan akses SPBG Bandung'),
      ('PO/SPBG-TEST/2025/008', 'PT Bangunan SPBG Test', 'Semen', 20.00, 'ton', 120000.00, 2400000.00, 'Pabrik Semen Cibinong, Jawa Barat', 'Proyek Bangunan SPBG Surabaya', '2025-08-08', ${groupIdMap['Surabaya SPBG Hub - LNG Industrial']}, 'completed', 'Semen tambahan untuk pembangunan gedung SPBG Surabaya'),
      ('PO/SPBG-TEST/2025/009', 'PT Struktur SPBG Test', 'Besi Beton', 5.00, 'ton', 180000.00, 900000.00, 'Pabrik Besi Cilegon, Banten', 'Proyek Struktur SPBG Semarang', '2025-08-09', ${groupIdMap['Semarang SPBG Center - CNG Standard']}, 'confirmed', 'Besi beton tambahan untuk struktur SPBG Semarang'),
      ('PO/SPBG-TEST/2025/010', 'PT Finishing SPBG Test', 'Keramik Lantai', 25.00, 'kubik', 45000.00, 1125000.00, 'Pabrik Keramik Karawang, Jawa Barat', 'Proyek Finishing SPBG Yogyakarta', '2025-08-10', ${groupIdMap['Yogyakarta SPBG Station - CNG Premium Plus']}, 'confirmed', 'Keramik lantai tambahan untuk finishing SPBG Yogyakarta')
      ON CONFLICT (po_number) DO NOTHING;
    `);

    // 9. Insert Infrastructure Inventory test data
    console.log("📝 Inserting Infrastructure Inventory test data...");
    
    // Insert infrastructure categories (if they don't exist)
    await db.pool.query(`
      INSERT INTO infrastructure_categories (category_name, description) VALUES
      ('Heavy Machinery', 'Excavators, bulldozers, cranes, and other heavy construction equipment'),
      ('Transportation Equipment', 'Trucks, trailers, forklifts, and other transport vehicles'),
      ('Safety Equipment', 'Safety gear, protective equipment, and emergency response tools'),
      ('Tools & Instruments', 'Hand tools, measuring instruments, and specialized equipment'),
      ('Communication Systems', 'Radios, phones, and other communication devices'),
      ('Power & Electrical', 'Generators, electrical equipment, and power distribution systems')
      ON CONFLICT (category_name) DO NOTHING;
    `);

    // Insert infrastructure locations (if they don't exist)
    await db.pool.query(`
      INSERT INTO infrastructure_locations (location_name, location_code, description) VALUES
      ('Jakarta Central Depot', 'JKT-CENTRAL', 'Main storage facility for Jakarta operations - Jl. Gatot Subroto No. 123, Jakarta Selatan'),
      ('Bandung Regional Hub', 'BDG-HUB', 'Regional distribution center for West Java - Jl. Soekarno Hatta No. 456, Bandung'),
      ('Surabaya Port Facility', 'SBY-PORT', 'Port-based storage for East Java operations - Jl. Raya Gresik No. 789, Surabaya'),
      ('Medan Distribution Center', 'MDN-DIST', 'Northern Sumatra distribution hub - Jl. Gatot Subroto No. 321, Medan'),
      ('Makassar Logistics Base', 'MKS-LOG', 'Eastern Indonesia logistics center - Jl. Veteran No. 654, Makassar'),
      ('Yogyakarta Workshop', 'JOG-WORK', 'Maintenance and repair facility - Jl. Malioboro No. 987, Yogyakarta')
      ON CONFLICT (location_name) DO NOTHING;
    `);

    // Get category and location IDs
    const categories = await db.pool.query('SELECT id, category_name FROM infrastructure_categories ORDER BY id');
    const locations = await db.pool.query('SELECT id, location_name FROM infrastructure_locations ORDER BY id');
    
    const infraCategoryMap = {};
    categories.rows.forEach(cat => {
      infraCategoryMap[cat.category_name] = cat.id;
    });
    
    const locationMap = {};
    locations.rows.forEach(loc => {
      locationMap[loc.location_name] = loc.id;
    });

    // Insert infrastructure items with initial stock
    await db.pool.query(`
      INSERT INTO infrastructure_items (
        item_code, item_name, category_id, location_id, supplier, unit, 
        min_quantity, average_unit_price, total_value, 
        notes, created_at
      ) VALUES 
      ('INF-001', 'Excavator CAT 320D', ${infraCategoryMap['Heavy Machinery']}, ${locationMap['Jakarta Central Depot']}, 'PT Heavy Equipment Indonesia', 'unit', 2, 2500000000.00, 12500000000.00, 'Heavy duty excavator for construction projects', '2025-08-01 08:00:00+07'),
      ('INF-002', 'Bulldozer Komatsu D65', ${infraCategoryMap['Heavy Machinery']}, ${locationMap['Bandung Regional Hub']}, 'PT Komatsu Indonesia', 'unit', 1, 1800000000.00, 5400000000.00, 'Bulldozer for land clearing and grading', '2025-08-01 09:00:00+07'),
      ('INF-003', 'Crane Mobile 25 Ton', ${infraCategoryMap['Heavy Machinery']}, ${locationMap['Surabaya Port Facility']}, 'PT Crane Solutions', 'unit', 1, 1200000000.00, 2400000000.00, 'Mobile crane for lifting operations', '2025-08-01 10:00:00+07'),
      ('INF-004', 'Dump Truck Hino 500', ${infraCategoryMap['Transportation Equipment']}, ${locationMap['Jakarta Central Depot']}, 'PT Hino Motors', 'unit', 5, 450000000.00, 5400000000.00, 'Heavy duty dump truck for material transport', '2025-08-01 11:00:00+07'),
      ('INF-005', 'Forklift Toyota 3 Ton', ${infraCategoryMap['Transportation Equipment']}, ${locationMap['Bandung Regional Hub']}, 'PT Toyota Material Handling', 'unit', 3, 180000000.00, 1440000000.00, 'Electric forklift for warehouse operations', '2025-08-01 12:00:00+07'),
      ('INF-006', 'Safety Helmet Standard', ${infraCategoryMap['Safety Equipment']}, ${locationMap['Jakarta Central Depot']}, 'PT Safety Gear Indonesia', 'pcs', 50, 75000.00, 11250000.00, 'Standard safety helmet for construction workers', '2025-08-01 13:00:00+07'),
      ('INF-007', 'Safety Vest Reflective', ${infraCategoryMap['Safety Equipment']}, ${locationMap['Bandung Regional Hub']}, 'PT Safety Gear Indonesia', 'pcs', 30, 45000.00, 4500000.00, 'High visibility safety vest', '2025-08-01 14:00:00+07'),
      ('INF-008', 'First Aid Kit Complete', ${infraCategoryMap['Safety Equipment']}, ${locationMap['Surabaya Port Facility']}, 'PT Medical Supplies', 'set', 10, 250000.00, 6250000.00, 'Complete first aid kit for emergency response', '2025-08-01 15:00:00+07'),
      ('INF-009', 'Measuring Tape 50m', ${infraCategoryMap['Tools & Instruments']}, ${locationMap['Medan Distribution Center']}, 'PT Precision Tools', 'pcs', 20, 150000.00, 7500000.00, 'Professional measuring tape for construction', '2025-08-01 16:00:00+07'),
      ('INF-010', 'Level Laser Digital', ${infraCategoryMap['Tools & Instruments']}, ${locationMap['Makassar Logistics Base']}, 'PT Precision Tools', 'pcs', 5, 800000.00, 9600000.00, 'Digital laser level for precise measurements', '2025-08-01 17:00:00+07'),
      ('INF-011', 'Two Way Radio Motorola', ${infraCategoryMap['Communication Systems']}, ${locationMap['Yogyakarta Workshop']}, 'PT Communication Solutions', 'pcs', 15, 350000.00, 14000000.00, 'Professional two-way radio for site communication', '2025-08-01 18:00:00+07'),
      ('INF-012', 'Generator 50 KVA', ${infraCategoryMap['Power & Electrical']}, ${locationMap['Jakarta Central Depot']}, 'PT Power Solutions', 'unit', 2, 15000000.00, 60000000.00, 'Diesel generator for backup power supply', '2025-08-01 19:00:00+07'),
      ('INF-013', 'Welding Machine Inverter', ${infraCategoryMap['Tools & Instruments']}, ${locationMap['Bandung Regional Hub']}, 'PT Welding Equipment', 'unit', 3, 2500000.00, 20000000.00, 'Inverter welding machine for metal work', '2025-08-01 20:00:00+07'),
      ('INF-014', 'Concrete Mixer 1 Bag', ${infraCategoryMap['Heavy Machinery']}, ${locationMap['Surabaya Port Facility']}, 'PT Construction Equipment', 'unit', 4, 8000000.00, 80000000.00, 'Portable concrete mixer for small projects', '2025-08-01 21:00:00+07'),
      ('INF-015', 'Air Compressor 100 PSI', ${infraCategoryMap['Power & Electrical']}, ${locationMap['Medan Distribution Center']}, 'PT Air Systems', 'unit', 2, 12000000.00, 72000000.00, 'High pressure air compressor for pneumatic tools', '2025-08-01 22:00:00+07')
      ON CONFLICT (item_code) DO NOTHING;
    `);

    // Get infrastructure item IDs for creating batches and transactions
    const items = await db.pool.query('SELECT id, item_code, item_name FROM infrastructure_items ORDER BY id');
    const itemMap = {};
    items.rows.forEach(item => {
      itemMap[item.item_code] = item.id;
    });

    // Insert infrastructure batches for each item
    await db.pool.query(`
      INSERT INTO infrastructure_batches (
        item_id, batch_number, quantity, original_quantity, unit_price, purchase_date, expired_date, 
        supplier, notes, created_at
      ) VALUES 
      (${itemMap['INF-001']}, 'BATCH-INF-001-001', 2, 2, 2500000000.00, '2025-07-15', '2030-07-15', 'PT Heavy Equipment Indonesia', 'Initial batch - Jakarta operations', '2025-08-01 08:00:00+07'),
      (${itemMap['INF-001']}, 'BATCH-INF-001-002', 3, 3, 2500000000.00, '2025-08-01', '2030-08-01', 'PT Heavy Equipment Indonesia', 'Additional batch - expansion project', '2025-08-01 08:00:00+07'),
      (${itemMap['INF-002']}, 'BATCH-INF-002-001', 1, 1, 1800000000.00, '2025-07-20', '2030-07-20', 'PT Komatsu Indonesia', 'Initial batch - Bandung operations', '2025-08-01 09:00:00+07'),
      (${itemMap['INF-002']}, 'BATCH-INF-002-002', 2, 2, 1800000000.00, '2025-08-01', '2030-08-01', 'PT Komatsu Indonesia', 'Additional batch - regional expansion', '2025-08-01 09:00:00+07'),
      (${itemMap['INF-003']}, 'BATCH-INF-003-001', 2, 2, 1200000000.00, '2025-07-25', '2030-07-25', 'PT Crane Solutions', 'Initial batch - Surabaya port operations', '2025-08-01 10:00:00+07'),
      (${itemMap['INF-004']}, 'BATCH-INF-004-001', 5, 5, 450000000.00, '2025-07-10', '2030-07-10', 'PT Hino Motors', 'Initial batch - Jakarta fleet', '2025-08-01 11:00:00+07'),
      (${itemMap['INF-004']}, 'BATCH-INF-004-002', 7, 7, 450000000.00, '2025-08-01', '2030-08-01', 'PT Hino Motors', 'Additional batch - fleet expansion', '2025-08-01 11:00:00+07'),
      (${itemMap['INF-005']}, 'BATCH-INF-005-001', 4, 4, 180000000.00, '2025-07-18', '2030-07-18', 'PT Toyota Material Handling', 'Initial batch - Bandung warehouse', '2025-08-01 12:00:00+07'),
      (${itemMap['INF-005']}, 'BATCH-INF-005-002', 4, 4, 180000000.00, '2025-08-01', '2030-08-01', 'PT Toyota Material Handling', 'Additional batch - warehouse expansion', '2025-08-01 12:00:00+07'),
      (${itemMap['INF-006']}, 'BATCH-INF-006-001', 75, 75, 75000.00, '2025-07-05', '2027-07-05', 'PT Safety Gear Indonesia', 'Initial batch - Jakarta safety equipment', '2025-08-01 13:00:00+07'),
      (${itemMap['INF-006']}, 'BATCH-INF-006-002', 75, 75, 75000.00, '2025-08-01', '2027-08-01', 'PT Safety Gear Indonesia', 'Additional batch - safety stock', '2025-08-01 13:00:00+07'),
      (${itemMap['INF-007']}, 'BATCH-INF-007-001', 50, 50, 45000.00, '2025-07-12', '2027-07-12', 'PT Safety Gear Indonesia', 'Initial batch - Bandung safety equipment', '2025-08-01 14:00:00+07'),
      (${itemMap['INF-007']}, 'BATCH-INF-007-002', 50, 50, 45000.00, '2025-08-01', '2027-08-01', 'PT Safety Gear Indonesia', 'Additional batch - safety stock', '2025-08-01 14:00:00+07'),
      (${itemMap['INF-008']}, 'BATCH-INF-008-001', 15, 15, 250000.00, '2025-07-08', '2027-07-08', 'PT Medical Supplies', 'Initial batch - Surabaya medical supplies', '2025-08-01 15:00:00+07'),
      (${itemMap['INF-008']}, 'BATCH-INF-008-002', 10, 10, 250000.00, '2025-08-01', '2027-08-01', 'PT Medical Supplies', 'Additional batch - medical stock', '2025-08-01 15:00:00+07'),
      (${itemMap['INF-009']}, 'BATCH-INF-009-001', 25, 25, 150000.00, '2025-07-14', '2028-07-14', 'PT Precision Tools', 'Initial batch - Medan measuring tools', '2025-08-01 16:00:00+07'),
      (${itemMap['INF-009']}, 'BATCH-INF-009-002', 25, 25, 150000.00, '2025-08-01', '2028-08-01', 'PT Precision Tools', 'Additional batch - tool stock', '2025-08-01 16:00:00+07'),
      (${itemMap['INF-010']}, 'BATCH-INF-010-001', 6, 6, 800000.00, '2025-07-22', '2028-07-22', 'PT Precision Tools', 'Initial batch - Makassar precision tools', '2025-08-01 17:00:00+07'),
      (${itemMap['INF-010']}, 'BATCH-INF-010-002', 6, 6, 800000.00, '2025-08-01', '2028-08-01', 'PT Precision Tools', 'Additional batch - precision stock', '2025-08-01 17:00:00+07'),
      (${itemMap['INF-011']}, 'BATCH-INF-011-001', 20, 20, 350000.00, '2025-07-16', '2028-07-16', 'PT Communication Solutions', 'Initial batch - Yogyakarta communication', '2025-08-01 18:00:00+07'),
      (${itemMap['INF-011']}, 'BATCH-INF-011-002', 20, 20, 350000.00, '2025-08-01', '2028-08-01', 'PT Communication Solutions', 'Additional batch - communication stock', '2025-08-01 18:00:00+07'),
      (${itemMap['INF-012']}, 'BATCH-INF-012-001', 2, 2, 15000000.00, '2025-07-28', '2030-07-28', 'PT Power Solutions', 'Initial batch - Jakarta power equipment', '2025-08-01 19:00:00+07'),
      (${itemMap['INF-012']}, 'BATCH-INF-012-002', 2, 2, 15000000.00, '2025-08-01', '2030-08-01', 'PT Power Solutions', 'Additional batch - power backup', '2025-08-01 19:00:00+07'),
      (${itemMap['INF-013']}, 'BATCH-INF-013-001', 4, 4, 2500000.00, '2025-07-19', '2028-07-19', 'PT Welding Equipment', 'Initial batch - Bandung welding equipment', '2025-08-01 20:00:00+07'),
      (${itemMap['INF-013']}, 'BATCH-INF-013-002', 4, 4, 2500000.00, '2025-08-01', '2028-08-01', 'PT Welding Equipment', 'Additional batch - welding stock', '2025-08-01 20:00:00+07'),
      (${itemMap['INF-014']}, 'BATCH-INF-014-001', 5, 5, 8000000.00, '2025-07-26', '2030-07-26', 'PT Construction Equipment', 'Initial batch - Surabaya construction equipment', '2025-08-01 21:00:00+07'),
      (${itemMap['INF-014']}, 'BATCH-INF-014-002', 5, 5, 8000000.00, '2025-08-01', '2030-08-01', 'PT Construction Equipment', 'Additional batch - construction stock', '2025-08-01 21:00:00+07'),
      (${itemMap['INF-015']}, 'BATCH-INF-015-001', 3, 3, 12000000.00, '2025-07-30', '2030-07-30', 'PT Air Systems', 'Initial batch - Medan air systems', '2025-08-01 22:00:00+07'),
      (${itemMap['INF-015']}, 'BATCH-INF-015-002', 3, 3, 12000000.00, '2025-08-01', '2030-08-01', 'PT Air Systems', 'Additional batch - air systems stock', '2025-08-01 22:00:00+07')
      ON CONFLICT (item_id, batch_number) DO NOTHING;
    `);

    // Get batch IDs for creating transactions
    const batches = await db.pool.query('SELECT id, batch_number, item_id FROM infrastructure_batches ORDER BY id');
    const batchMap = {};
    batches.rows.forEach(batch => {
      batchMap[batch.batch_number] = batch.id;
    });

    // Insert infrastructure transactions (initial stock entries)
    await db.pool.query(`
      INSERT INTO infrastructure_transactions (
        item_id, batch_id, transaction_type, quantity, unit_price, total_amount, 
        reference_type, notes, transaction_date, created_at
      ) VALUES 
      (${itemMap['INF-001']}, ${batchMap['BATCH-INF-001-001']}, 'in', 2, 2500000000.00, 5000000000.00, 'initial_stock', 'Initial stock entry - Jakarta operations', '2025-08-01', '2025-08-01 08:00:00+07'),
      (${itemMap['INF-001']}, ${batchMap['BATCH-INF-001-002']}, 'in', 3, 2500000000.00, 7500000000.00, 'initial_stock', 'Initial stock entry - expansion project', '2025-08-01', '2025-08-01 08:00:00+07'),
      (${itemMap['INF-002']}, ${batchMap['BATCH-INF-002-001']}, 'in', 1, 1800000000.00, 1800000000.00, 'initial_stock', 'Initial stock entry - Bandung operations', '2025-08-01', '2025-08-01 09:00:00+07'),
      (${itemMap['INF-002']}, ${batchMap['BATCH-INF-002-002']}, 'in', 2, 1800000000.00, 3600000000.00, 'initial_stock', 'Initial stock entry - regional expansion', '2025-08-01', '2025-08-01 09:00:00+07'),
      (${itemMap['INF-003']}, ${batchMap['BATCH-INF-003-001']}, 'in', 2, 1200000000.00, 2400000000.00, 'initial_stock', 'Initial stock entry - Surabaya port operations', '2025-08-01', '2025-08-01 10:00:00+07'),
      (${itemMap['INF-004']}, ${batchMap['BATCH-INF-004-001']}, 'in', 5, 450000000.00, 2250000000.00, 'initial_stock', 'Initial stock entry - Jakarta fleet', '2025-08-01', '2025-08-01 11:00:00+07'),
      (${itemMap['INF-004']}, ${batchMap['BATCH-INF-004-002']}, 'in', 7, 450000000.00, 3150000000.00, 'initial_stock', 'Initial stock entry - fleet expansion', '2025-08-01', '2025-08-01 11:00:00+07'),
      (${itemMap['INF-005']}, ${batchMap['BATCH-INF-005-001']}, 'in', 4, 180000000.00, 720000000.00, 'initial_stock', 'Initial stock entry - Bandung warehouse', '2025-08-01', '2025-08-01 12:00:00+07'),
      (${itemMap['INF-005']}, ${batchMap['BATCH-INF-005-002']}, 'in', 4, 180000000.00, 720000000.00, 'initial_stock', 'Initial stock entry - warehouse expansion', '2025-08-01', '2025-08-01 12:00:00+07'),
      (${itemMap['INF-006']}, ${batchMap['BATCH-INF-006-001']}, 'in', 75, 75000.00, 5625000.00, 'initial_stock', 'Initial stock entry - Jakarta safety equipment', '2025-08-01', '2025-08-01 13:00:00+07'),
      (${itemMap['INF-006']}, ${batchMap['BATCH-INF-006-002']}, 'in', 75, 75000.00, 5625000.00, 'initial_stock', 'Initial stock entry - safety stock', '2025-08-01', '2025-08-01 13:00:00+07'),
      (${itemMap['INF-007']}, ${batchMap['BATCH-INF-007-001']}, 'in', 50, 45000.00, 2250000.00, 'initial_stock', 'Initial stock entry - Bandung safety equipment', '2025-08-01', '2025-08-01 14:00:00+07'),
      (${itemMap['INF-007']}, ${batchMap['BATCH-INF-007-002']}, 'in', 50, 45000.00, 2250000.00, 'initial_stock', 'Initial stock entry - safety stock', '2025-08-01', '2025-08-01 14:00:00+07'),
      (${itemMap['INF-008']}, ${batchMap['BATCH-INF-008-001']}, 'in', 15, 250000.00, 3750000.00, 'initial_stock', 'Initial stock entry - Surabaya medical supplies', '2025-08-01', '2025-08-01 15:00:00+07'),
      (${itemMap['INF-008']}, ${batchMap['BATCH-INF-008-002']}, 'in', 10, 250000.00, 2500000.00, 'initial_stock', 'Initial stock entry - medical stock', '2025-08-01', '2025-08-01 15:00:00+07'),
      (${itemMap['INF-009']}, ${batchMap['BATCH-INF-009-001']}, 'in', 25, 150000.00, 3750000.00, 'initial_stock', 'Initial stock entry - Medan measuring tools', '2025-08-01', '2025-08-01 16:00:00+07'),
      (${itemMap['INF-009']}, ${batchMap['BATCH-INF-009-002']}, 'in', 25, 150000.00, 3750000.00, 'initial_stock', 'Initial stock entry - tool stock', '2025-08-01', '2025-08-01 16:00:00+07'),
      (${itemMap['INF-010']}, ${batchMap['BATCH-INF-010-001']}, 'in', 6, 800000.00, 4800000.00, 'initial_stock', 'Initial stock entry - Makassar precision tools', '2025-08-01', '2025-08-01 17:00:00+07'),
      (${itemMap['INF-010']}, ${batchMap['BATCH-INF-010-002']}, 'in', 6, 800000.00, 4800000.00, 'initial_stock', 'Initial stock entry - precision stock', '2025-08-01', '2025-08-01 17:00:00+07'),
      (${itemMap['INF-011']}, ${batchMap['BATCH-INF-011-001']}, 'in', 20, 350000.00, 7000000.00, 'initial_stock', 'Initial stock entry - Yogyakarta communication', '2025-08-01', '2025-08-01 18:00:00+07'),
      (${itemMap['INF-011']}, ${batchMap['BATCH-INF-011-002']}, 'in', 20, 350000.00, 7000000.00, 'initial_stock', 'Initial stock entry - communication stock', '2025-08-01', '2025-08-01 18:00:00+07'),
      (${itemMap['INF-012']}, ${batchMap['BATCH-INF-012-001']}, 'in', 2, 15000000.00, 30000000.00, 'initial_stock', 'Initial stock entry - Jakarta power equipment', '2025-08-01', '2025-08-01 19:00:00+07'),
      (${itemMap['INF-012']}, ${batchMap['BATCH-INF-012-002']}, 'in', 2, 15000000.00, 30000000.00, 'initial_stock', 'Initial stock entry - power backup', '2025-08-01', '2025-08-01 19:00:00+07'),
      (${itemMap['INF-013']}, ${batchMap['BATCH-INF-013-001']}, 'in', 4, 2500000.00, 10000000.00, 'initial_stock', 'Initial stock entry - Bandung welding equipment', '2025-08-01', '2025-08-01 20:00:00+07'),
      (${itemMap['INF-013']}, ${batchMap['BATCH-INF-013-002']}, 'in', 4, 2500000.00, 10000000.00, 'initial_stock', 'Initial stock entry - welding stock', '2025-08-01', '2025-08-01 20:00:00+07'),
      (${itemMap['INF-014']}, ${batchMap['BATCH-INF-014-001']}, 'in', 5, 8000000.00, 40000000.00, 'initial_stock', 'Initial stock entry - Surabaya construction equipment', '2025-08-01', '2025-08-01 21:00:00+07'),
      (${itemMap['INF-014']}, ${batchMap['BATCH-INF-014-002']}, 'in', 5, 8000000.00, 40000000.00, 'initial_stock', 'Initial stock entry - construction stock', '2025-08-01', '2025-08-01 21:00:00+07'),
      (${itemMap['INF-015']}, ${batchMap['BATCH-INF-015-001']}, 'in', 3, 12000000.00, 36000000.00, 'initial_stock', 'Initial stock entry - Medan air systems', '2025-08-01', '2025-08-01 22:00:00+07'),
      (${itemMap['INF-015']}, ${batchMap['BATCH-INF-015-002']}, 'in', 3, 12000000.00, 36000000.00, 'initial_stock', 'Initial stock entry - air systems stock', '2025-08-01', '2025-08-01 22:00:00+07');
    `);

    console.log("✅ Comprehensive Module 2 test data inserted successfully!");

    // Verify the data was inserted with detailed breakdown
    const cashCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions');
    const categoryCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_categories');
    const depositCount = await db.pool.query('SELECT COUNT(*) as total FROM deposit_groups');
    const poCount = await db.pool.query('SELECT COUNT(*) as total FROM purchase_orders WHERE po_number LIKE \'PO/SPBG-TEST%\'');
    
    // Infrastructure data counts
    const infraCategoryCount = await db.pool.query('SELECT COUNT(*) as total FROM infrastructure_categories');
    const infraLocationCount = await db.pool.query('SELECT COUNT(*) as total FROM infrastructure_locations');
    const infraItemCount = await db.pool.query('SELECT COUNT(*) as total FROM infrastructure_items');
    const infraBatchCount = await db.pool.query('SELECT COUNT(*) as total FROM infrastructure_batches');
    const infraTransactionCount = await db.pool.query('SELECT COUNT(*) as total FROM infrastructure_transactions');
    
    // Check deposit group connections
    const poWithDepositGroup = await db.pool.query('SELECT COUNT(*) as total FROM purchase_orders WHERE deposit_group_id IS NOT NULL');
    const poByDepositGroup = await db.pool.query(`
      SELECT dg.group_name, COUNT(po.id) as po_count, SUM(po.total_amount) as total_value
      FROM deposit_groups dg 
      LEFT JOIN purchase_orders po ON dg.id = po.deposit_group_id 
      GROUP BY dg.id, dg.group_name 
      ORDER BY dg.id
    `);

    // Detailed breakdown for filtering testing
    const spbgOnlyCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions WHERE spbg_location IS NOT NULL AND category_id = 1');
    const cngOnlyCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions WHERE category_id IN (2,3,4) AND spbg_location IS NULL');
    const bothCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions WHERE category_id IN (2,3,4) AND spbg_location IS NOT NULL');
    const regularCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions WHERE category_id IN (27,28,29,30,34,35)');
    
    console.log("📊 Data Summary:");
    console.log(`   - Total Cash Transactions: ${cashCount.rows[0].total}`);
    console.log(`   - Total Cash Categories: ${categoryCount.rows[0].total}`);
    console.log(`   - Total Deposit Groups: ${depositCount.rows[0].total}`);
    console.log(`   - Total SPBG Purchase Orders: ${poCount.rows[0].total}`);
    console.log(`   - Purchase Orders with Deposit Groups: ${poWithDepositGroup.rows[0].total}`);
    
    console.log("\n🏗️ Infrastructure Inventory Data:");
    console.log(`   - Infrastructure Categories: ${infraCategoryCount.rows[0].total}`);
    console.log(`   - Infrastructure Locations: ${infraLocationCount.rows[0].total}`);
    console.log(`   - Infrastructure Items: ${infraItemCount.rows[0].total}`);
    console.log(`   - Infrastructure Batches: ${infraBatchCount.rows[0].total}`);
    console.log(`   - Infrastructure Transactions: ${infraTransactionCount.rows[0].total}`);
    
    console.log("\n🏗️ Deposit Group & Purchase Order Connections:");
    poByDepositGroup.rows.forEach(row => {
      console.log(`   - ${row.group_name}: ${row.po_count} POs, Total Value: Rp ${parseInt(row.total_value || 0).toLocaleString('id-ID')}`);
    });
    
    console.log("\n🎯 Filtering Test Data Breakdown:");
    console.log(`   - SPBG-ONLY: ${spbgOnlyCount.rows[0].total} transactions (SPBG category + SPBG fields, no CNG keywords)`);
    console.log(`   - CNG-ONLY: ${cngOnlyCount.rows[0].total} transactions (CNG categories, no SPBG fields, CNG keywords)`);
    console.log(`   - BOTH CNG & SPBG: ${bothCount.rows[0].total} transactions (CNG categories + SPBG fields + CNG keywords)`);
    console.log(`   - REGULAR (Non-CNG/Non-SPBG): ${regularCount.rows[0].total} transactions (regular categories, no CNG/SPBG keywords)`);
    
    console.log("\n🧪 Expected Filter Results:");
    console.log(`   - CNG Filter: Should show ${parseInt(cngOnlyCount.rows[0].total) + parseInt(bothCount.rows[0].total)} transactions`);
    console.log(`   - SPBG Filter: Should show ${parseInt(spbgOnlyCount.rows[0].total) + parseInt(bothCount.rows[0].total)} transactions`);
    console.log(`   - Both Filters: Should show ${bothCount.rows[0].total} transactions`);
    console.log(`   - No Filters: Should show ${cashCount.rows[0].total} transactions`);
    
    console.log("\n💡 Deposit Group Management Testing:");
    console.log(`   - Each deposit group now has 2 purchase orders for testing`);
    console.log(`   - Purchase orders have realistic unit prices and total amounts`);
    console.log(`   - Different PO statuses: confirmed, partial, completed`);
    console.log(`   - All POs are properly linked to their respective deposit groups`);

    // Infrastructure inventory summary
    const infraByCategory = await db.pool.query(`
      SELECT ic.category_name, COUNT(ii.id) as item_count, SUM(ii.total_value) as total_value
      FROM infrastructure_categories ic 
      LEFT JOIN infrastructure_items ii ON ic.id = ii.category_id 
      GROUP BY ic.id, ic.category_name 
      ORDER BY ic.id
    `);
    
    const infraByLocation = await db.pool.query(`
      SELECT il.location_name, COUNT(ii.id) as item_count, SUM(ii.total_value) as total_value
      FROM infrastructure_locations il 
      LEFT JOIN infrastructure_items ii ON il.id = ii.location_id 
      GROUP BY il.id, il.location_name 
      ORDER BY il.id
    `);

    console.log("\n🏗️ Infrastructure Inventory by Category:");
    infraByCategory.rows.forEach(row => {
      console.log(`   - ${row.category_name}: ${row.item_count} items, Total Value: Rp ${parseInt(row.total_value || 0).toLocaleString('id-ID')}`);
    });

    console.log("\n🏗️ Infrastructure Inventory by Location:");
    infraByLocation.rows.forEach(row => {
      console.log(`   - ${row.location_name}: ${row.item_count} items, Total Value: Rp ${parseInt(row.total_value || 0).toLocaleString('id-ID')}`);
    });

    console.log("\n💡 Infrastructure Inventory Testing Features:");
    console.log(`   - 6 categories: Heavy Machinery, Transportation, Safety, Tools, Communication, Power`);
    console.log(`   - 6 locations: Jakarta, Bandung, Surabaya, Medan, Makassar, Yogyakarta`);
    console.log(`   - 15 infrastructure items with realistic pricing and quantities`);
    console.log(`   - Each item has 2 batches for FIFO testing`);
    console.log(`   - All items have initial stock transactions`);
    console.log(`   - Expiration dates set for consumable items (safety equipment, tools)`);
    console.log(`   - Infrastructure locations will appear as accounts in cash book`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error inserting test data:", err);
    process.exit(1);
  }
};

insertTestData();
