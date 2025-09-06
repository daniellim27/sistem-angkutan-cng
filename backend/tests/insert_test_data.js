// Script to insert Module 2 test data for comprehensive SPBG & CNG filtering testing
const path = require('path');
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

    // 2. Insert SPBG-ONLY transactions (SPBG category + SPBG fields, no CNG keywords)
    console.log("📝 Inserting SPBG-ONLY transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, spbg_location, gas_volume_m3, calculation_method, 
        jisdor_rate, gas_filling_cost, no_nota, created_at
      ) VALUES 
      ('debit', 56, 1500000.00, 'Pengisian gas untuk truck B1234ABC - Jakarta SPBG Center', 'SPBG-JKT-001-2025', '2025-08-01', 'Bank BCA', 'jakarta', 100.00, 'jisdor', 15000.00, 1500000.00, '{"INV-JKT-001", "INV-JKT-002"}', '2025-08-01 08:00:00+07'),
      ('debit', 56, 750000.00, 'Pengisian gas untuk truck B5678DEF - Bandung SPBG Station', 'SPBG-BDG-002-2025', '2025-08-02', 'Bank Mandiri', 'bandung', 50.00, 'jisdor', 15000.00, 750000.00, '{"INV-BDG-001"}', '2025-08-02 09:30:00+07'),
      ('debit', 56, 400000.00, 'Pengisian gas untuk truck B9012GHI - Surabaya SPBG Hub', 'SPBG-SBY-003-2025', '2025-08-03', 'Bank BNI', 'surabaya', 25.00, 'fixed', 16000.00, 400000.00, '{"INV-SBY-001", "INV-SBY-002", "INV-SBY-003"}', '2025-08-03 10:15:00+07'),
      ('kredit', 57, 250000.00, 'Pengembalian deposit SPBG Semarang - tidak terpakai', 'REFUND-SMG-001-2025', '2025-08-04', 'Bank BCA', 'semarang', 15.00, 'fixed', 16666.67, 250000.00, '{"REF-SMG-001"}', '2025-08-04 14:20:00+07'),
      ('debit', 56, 2000000.00, 'Pengisian gas premium untuk truck B3456JKL - Yogyakarta SPBG Station', 'SPBG-JOG-004-2025', '2025-08-05', 'Bank Mandiri', 'yogyakarta', 80.00, 'jisdor', 25000.00, 2000000.00, '{"INV-JOG-001", "INV-JOG-002"}', '2025-08-05 11:45:00+07');
    `);

    // 3. Insert CNG-ONLY transactions (CNG categories, no SPBG fields, CNG keywords in description)
    console.log("📝 Inserting CNG-ONLY transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, created_at
      ) VALUES 
      ('debit', 53, 500000.00, 'Pembelian bahan bakar CNG untuk depot Jakarta - 50 m³ @ Rp 10,000/m³', 'CNG-FUEL-001-2025', '2025-08-01', 'Bank BCA', '2025-08-01 07:30:00+07'),
      ('debit', 54, 1200000.00, 'Maintenance sistem CNG truck B1234ABC - ganti regulator dan selang', 'CNG-MAINT-001-2025', '2025-08-02', 'Bank Mandiri', '2025-08-02 13:45:00+07'),
      ('debit', 55, 800000.00, 'Asuransi tahunan peralatan CNG - coverage kerusakan dan kecelakaan', 'CNG-INS-001-2025', '2025-08-03', 'Bank BNI', '2025-08-03 16:20:00+07'),
      ('debit', 56, 1000000.00, 'Deposit awal di SPBG Jakarta Center - untuk pengisian gas reguler', 'SPBG-DEP-001-2025', '2025-08-04', 'Bank BCA', '2025-08-04 09:15:00+07'),
      ('debit', 53, 300000.00, 'Pengisian gas CNG untuk truck B5678DEF - 30 m³ @ Rp 10,000/m³', 'CNG-GAS-001-2025', '2025-08-05', 'Bank Mandiri', '2025-08-05 15:30:00+07');
    `);

    // 4. Insert BOTH CNG & SPBG transactions (CNG categories + SPBG fields + CNG keywords)
    console.log("📝 Inserting BOTH CNG & SPBG transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, spbg_location, gas_volume_m3, calculation_method, 
        jisdor_rate, gas_filling_cost, no_nota, created_at
      ) VALUES 
      ('debit', 53, 1800000.00, 'Pengisian gas CNG untuk truck B9999XYZ - Medan SPBG Hub', 'CNG-SPBG-MDN-001-2025', '2025-08-06', 'Bank BCA', 'medan', 120.00, 'jisdor', 15000.00, 1800000.00, '{"INV-MDN-001", "INV-MDN-002"}', '2025-08-06 10:00:00+07'),
      ('debit', 54, 900000.00, 'Maintenance sistem CNG + pengisian gas di Palembang SPBG', 'CNG-SPBG-PLG-001-2025', '2025-08-07', 'Bank Mandiri', 'palembang', 60.00, 'fixed', 15000.00, 900000.00, '{"INV-PLG-001"}', '2025-08-07 11:30:00+07'),
      ('debit', 55, 1500000.00, 'Asuransi CNG + gas filling di Makassar SPBG Center', 'CNG-SPBG-MKS-001-2025', '2025-08-08', 'Bank BNI', 'makassar', 100.00, 'jisdor', 15000.00, 1500000.00, '{"INV-MKS-001", "INV-MKS-002"}', '2025-08-08 14:15:00+07');
    `);

    // 5. Insert NON-CNG & NON-SPBG transactions (regular categories, no CNG/SPBG keywords, no SPBG fields)
    console.log("📝 Inserting NON-CNG & NON-SPBG transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, created_at
      ) VALUES 
      ('debit', 1, 5000000.00, 'Setoran modal awal untuk operasional perusahaan', 'MODAL-001-2025', '2025-08-09', 'Bank BCA', '2025-08-09 09:00:00+07'),
      ('debit', 2, 2500000.00, 'Pendapatan dari pengiriman barang Jakarta-Bandung', 'PENDAPATAN-001-2025', '2025-08-10', 'Bank Mandiri', '2025-08-10 10:30:00+07'),
      ('kredit', 4, 800000.00, 'Biaya kantor - pembelian printer dan kertas', 'KANTOR-001-2025', '2025-08-11', 'Bank BCA', '2025-08-11 11:45:00+07'),
      ('kredit', 5, 3000000.00, 'Gaji staf bulan Agustus 2025', 'GAJI-001-2025', '2025-08-12', 'Bank Mandiri', '2025-08-12 12:00:00+07'),
      ('kredit', 6, 15000000.00, 'Pembelian truck baru untuk operasional', 'ASET-001-2025', '2025-08-13', 'Bank BNI', '2025-08-13 13:15:00+07'),
      ('kredit', 7, 1200000.00, 'Biaya BBM solar untuk truck diesel', 'BBM-001-2025', '2025-08-14', 'Bank BCA', '2025-08-14 14:30:00+07'),
      ('debit', 3, 500000.00, 'Pendapatan sewa gudang', 'SEWA-001-2025', '2025-08-15', 'Bank Mandiri', '2025-08-15 15:45:00+07');
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
      ('PO/SPBG-TEST/2025/005', 'PT Finishing SPBG Test', 'Keramik Lantai', 50.00, 'm²', 45000.00, 2250000.00, 'Pabrik Keramik Karawang, Jawa Barat', 'Proyek Finishing SPBG Yogyakarta', '2025-08-05', ${groupIdMap['Yogyakarta SPBG Station - CNG Premium Plus']}, 'confirmed', 'Keramik lantai untuk finishing SPBG Yogyakarta'),
      ('PO/SPBG-TEST/2025/006', 'PT Konstruksi SPBG Test', 'Pasir Urug', 30.00, 'ton', 50000.00, 1500000.00, 'Quarry Bogor, Jawa Barat', 'Proyek SPBG Jakarta Center', '2025-08-06', ${groupIdMap['Jakarta SPBG Center - CNG Regular']}, 'partial', 'Pasir urug tambahan untuk pembangunan SPBG Jakarta Center'),
      ('PO/SPBG-TEST/2025/007', 'PT Jalan Raya SPBG Test', 'Batu Split', 20.00, 'ton', 75000.00, 1500000.00, 'Quarry Sukabumi, Jawa Barat', 'Proyek Jalan SPBG Bandung', '2025-08-07', ${groupIdMap['Bandung SPBG Station - CNG Premium']}, 'confirmed', 'Batu split tambahan untuk pembangunan jalan akses SPBG Bandung'),
      ('PO/SPBG-TEST/2025/008', 'PT Bangunan SPBG Test', 'Semen', 20.00, 'ton', 120000.00, 2400000.00, 'Pabrik Semen Cibinong, Jawa Barat', 'Proyek Bangunan SPBG Surabaya', '2025-08-08', ${groupIdMap['Surabaya SPBG Hub - LNG Industrial']}, 'completed', 'Semen tambahan untuk pembangunan gedung SPBG Surabaya'),
      ('PO/SPBG-TEST/2025/009', 'PT Struktur SPBG Test', 'Besi Beton', 5.00, 'ton', 180000.00, 900000.00, 'Pabrik Besi Cilegon, Banten', 'Proyek Struktur SPBG Semarang', '2025-08-09', ${groupIdMap['Semarang SPBG Center - CNG Standard']}, 'confirmed', 'Besi beton tambahan untuk struktur SPBG Semarang'),
      ('PO/SPBG-TEST/2025/010', 'PT Finishing SPBG Test', 'Keramik Lantai', 25.00, 'm²', 45000.00, 1125000.00, 'Pabrik Keramik Karawang, Jawa Barat', 'Proyek Finishing SPBG Yogyakarta', '2025-08-10', ${groupIdMap['Yogyakarta SPBG Station - CNG Premium Plus']}, 'confirmed', 'Keramik lantai tambahan untuk finishing SPBG Yogyakarta')
      ON CONFLICT (po_number) DO NOTHING;
    `);

    console.log("✅ Comprehensive Module 2 test data inserted successfully!");

    // Verify the data was inserted with detailed breakdown
    const cashCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions');
    const categoryCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_categories');
    const depositCount = await db.pool.query('SELECT COUNT(*) as total FROM deposit_groups');
    const poCount = await db.pool.query('SELECT COUNT(*) as total FROM purchase_orders WHERE po_number LIKE \'PO/SPBG-TEST%\'');
    
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
    const spbgOnlyCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions WHERE spbg_location IS NOT NULL AND category_id = 56');
    const cngOnlyCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions WHERE category_id IN (53,54,55) AND spbg_location IS NULL');
    const bothCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions WHERE category_id IN (53,54,55) AND spbg_location IS NOT NULL');
    const regularCount = await db.pool.query('SELECT COUNT(*) as total FROM cash_transactions WHERE category_id IN (1,2,3,4,5,6,7,8,9)');
    
    console.log("📊 Data Summary:");
    console.log(`   - Total Cash Transactions: ${cashCount.rows[0].total}`);
    console.log(`   - Total Cash Categories: ${categoryCount.rows[0].total}`);
    console.log(`   - Total Deposit Groups: ${depositCount.rows[0].total}`);
    console.log(`   - Total SPBG Purchase Orders: ${poCount.rows[0].total}`);
    console.log(`   - Purchase Orders with Deposit Groups: ${poWithDepositGroup.rows[0].total}`);
    
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

    process.exit(0);
  } catch (err) {
    console.error("❌ Error inserting test data:", err);
    process.exit(1);
  }
};

insertTestData();
