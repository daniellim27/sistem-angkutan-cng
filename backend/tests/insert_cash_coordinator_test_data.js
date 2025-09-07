// Script to insert Cash Coordinator test data
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

const insertCashCoordinatorTestData = async () => {
  try {
    console.log("🚀 Starting Cash Coordinator test data insertion...");

    // 1. Add Cash Coordinator specific categories (if they don't exist)
    console.log("📝 Adding Cash Coordinator specific categories...");
    await db.pool.query(`
      INSERT INTO cash_categories (category_name, category_type, description) VALUES
      ('Coordinator Operations', 'expense', 'Operasional koordinator lapangan dan manajemen'),
      ('Coordinator Travel', 'expense', 'Biaya perjalanan dan transportasi koordinator'),
      ('Coordinator Communication', 'expense', 'Biaya komunikasi dan koordinasi tim'),
      ('Coordinator Training', 'expense', 'Pelatihan dan pengembangan koordinator'),
      ('Coordinator Equipment', 'expense', 'Peralatan dan tools untuk koordinator'),
      ('Coordinator Bonus', 'income', 'Bonus dan insentif untuk koordinator'),
      ('Coordinator Commission', 'income', 'Komisi dari pencapaian target koordinator'),
      ('Coordinator Allowance', 'income', 'Tunjangan operasional koordinator')
      ON CONFLICT (category_name) DO NOTHING;
    `);

    // 2. Insert Cash Coordinator specific transactions
    console.log("📝 Inserting Cash Coordinator transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, no_nota, created_at
      ) VALUES 
      -- Coordinator Operations
      ('kredit', 88, 500000.00, 'Operasional koordinator Jakarta - biaya administrasi dan koordinasi', 'COORD-OPS-JKT-001-2025', '2025-01-15', 'Coordinator Jakarta', '{"ADM-JKT-001", "ADM-JKT-002"}', '2025-01-15 08:00:00+07'),
      ('kredit', 88, 750000.00, 'Operasional koordinator Bandung - biaya manajemen depot', 'COORD-OPS-BDG-001-2025', '2025-01-16', 'Coordinator Bandung', '{"ADM-BDG-001"}', '2025-01-16 09:30:00+07'),
      ('kredit', 88, 600000.00, 'Operasional koordinator Surabaya - biaya koordinasi logistik', 'COORD-OPS-SBY-001-2025', '2025-01-17', 'Coordinator Surabaya', '{"ADM-SBY-001", "ADM-SBY-002"}', '2025-01-17 10:15:00+07'),
      
      -- Coordinator Travel
      ('kredit', 89, 1200000.00, 'Perjalanan koordinator Jakarta ke Bandung - inspeksi depot', 'COORD-TRAVEL-JKT-BDG-001-2025', '2025-01-18', 'Coordinator Jakarta', '{"TRAVEL-001", "TRAVEL-002"}', '2025-01-18 11:00:00+07'),
      ('kredit', 89, 800000.00, 'Perjalanan koordinator Bandung ke Surabaya - koordinasi proyek', 'COORD-TRAVEL-BDG-SBY-001-2025', '2025-01-19', 'Coordinator Bandung', '{"TRAVEL-003"}', '2025-01-19 12:30:00+07'),
      ('kredit', 89, 1500000.00, 'Perjalanan koordinator Surabaya ke Jakarta - rapat manajemen', 'COORD-TRAVEL-SBY-JKT-001-2025', '2025-01-20', 'Coordinator Surabaya', '{"TRAVEL-004", "TRAVEL-005"}', '2025-01-20 13:45:00+07'),
      
      -- Coordinator Communication
      ('kredit', 90, 300000.00, 'Paket data dan pulsa koordinator Jakarta - 3 bulan', 'COORD-COMM-JKT-001-2025', '2025-01-21', 'Coordinator Jakarta', '{"COMM-001"}', '2025-01-21 14:20:00+07'),
      ('kredit', 90, 250000.00, 'Paket data dan pulsa koordinator Bandung - 3 bulan', 'COORD-COMM-BDG-001-2025', '2025-01-22', 'Coordinator Bandung', '{"COMM-002"}', '2025-01-22 15:10:00+07'),
      ('kredit', 90, 350000.00, 'Paket data dan pulsa koordinator Surabaya - 3 bulan', 'COORD-COMM-SBY-001-2025', '2025-01-23', 'Coordinator Surabaya', '{"COMM-003"}', '2025-01-23 16:00:00+07'),
      
      -- Coordinator Training
      ('kredit', 91, 2000000.00, 'Pelatihan leadership koordinator Jakarta - 3 hari', 'COORD-TRAIN-JKT-001-2025', '2025-01-24', 'Coordinator Jakarta', '{"TRAIN-001", "TRAIN-002"}', '2025-01-24 17:15:00+07'),
      ('kredit', 91, 1500000.00, 'Pelatihan manajemen proyek koordinator Bandung', 'COORD-TRAIN-BDG-001-2025', '2025-01-25', 'Coordinator Bandung', '{"TRAIN-003"}', '2025-01-25 18:30:00+07'),
      ('kredit', 91, 1800000.00, 'Pelatihan komunikasi efektif koordinator Surabaya', 'COORD-TRAIN-SBY-001-2025', '2025-01-26', 'Coordinator Surabaya', '{"TRAIN-004", "TRAIN-005"}', '2025-01-26 19:45:00+07'),
      
      -- Coordinator Equipment
      ('kredit', 92, 500000.00, 'Laptop koordinator Jakarta - untuk koordinasi digital', 'COORD-EQUIP-JKT-001-2025', '2025-01-27', 'Coordinator Jakarta', '{"EQUIP-001"}', '2025-01-27 20:00:00+07'),
      ('kredit', 92, 400000.00, 'Tablet koordinator Bandung - untuk monitoring lapangan', 'COORD-EQUIP-BDG-001-2025', '2025-01-28', 'Coordinator Bandung', '{"EQUIP-002"}', '2025-01-28 21:15:00+07'),
      ('kredit', 92, 600000.00, 'Smartphone koordinator Surabaya - untuk komunikasi tim', 'COORD-EQUIP-SBY-001-2025', '2025-01-29', 'Coordinator Surabaya', '{"EQUIP-003", "EQUIP-004"}', '2025-01-29 22:30:00+07'),
      
      -- Coordinator Income (Bonus, Commission, Allowance)
      ('debit', 93, 5000000.00, 'Bonus koordinator Jakarta - pencapaian target Q1 2025', 'COORD-BONUS-JKT-001-2025', '2025-01-30', 'Coordinator Jakarta', '{"BONUS-001"}', '2025-01-30 23:00:00+07'),
      ('debit', 94, 3000000.00, 'Komisi koordinator Bandung - penjualan tambahan', 'COORD-COMM-BDG-001-2025', '2025-01-31', 'Coordinator Bandung', '{"COMM-001"}', '2025-01-31 00:15:00+07'),
      ('debit', 95, 2000000.00, 'Tunjangan operasional koordinator Surabaya - Januari 2025', 'COORD-ALLOW-SBY-001-2025', '2025-02-01', 'Coordinator Surabaya', '{"ALLOW-001"}', '2025-02-01 01:30:00+07'),
      
      -- More recent transactions for February 2025
      ('kredit', 88, 450000.00, 'Operasional koordinator Jakarta - Februari 2025', 'COORD-OPS-JKT-002-2025', '2025-02-05', 'Coordinator Jakarta', '{"ADM-JKT-003"}', '2025-02-05 08:00:00+07'),
      ('kredit', 89, 900000.00, 'Perjalanan koordinator Bandung ke Medan - inspeksi', 'COORD-TRAVEL-BDG-MDN-001-2025', '2025-02-06', 'Coordinator Bandung', '{"TRAVEL-006"}', '2025-02-06 09:30:00+07'),
      ('kredit', 90, 280000.00, 'Paket data koordinator Surabaya - Februari 2025', 'COORD-COMM-SBY-002-2025', '2025-02-07', 'Coordinator Surabaya', '{"COMM-004"}', '2025-02-07 10:15:00+07'),
      ('debit', 93, 2500000.00, 'Bonus koordinator Bandung - pencapaian target Februari', 'COORD-BONUS-BDG-001-2025', '2025-02-08', 'Coordinator Bandung', '{"BONUS-002"}', '2025-02-08 11:00:00+07'),
      ('debit', 95, 1800000.00, 'Tunjangan operasional koordinator Jakarta - Februari 2025', 'COORD-ALLOW-JKT-001-2025', '2025-02-09', 'Coordinator Jakarta', '{"ALLOW-002"}', '2025-02-09 12:30:00+07'),
      
      -- March 2025 transactions
      ('kredit', 91, 1200000.00, 'Pelatihan safety koordinator Surabaya', 'COORD-TRAIN-SBY-002-2025', '2025-03-01', 'Coordinator Surabaya', '{"TRAIN-006"}', '2025-03-01 13:45:00+07'),
      ('kredit', 92, 350000.00, 'Headset koordinator Jakarta - untuk komunikasi tim', 'COORD-EQUIP-JKT-002-2025', '2025-03-02', 'Coordinator Jakarta', '{"EQUIP-005"}', '2025-03-02 14:20:00+07'),
      ('debit', 94, 4000000.00, 'Komisi koordinator Jakarta - proyek besar Maret', 'COORD-COMM-JKT-001-2025', '2025-03-03', 'Coordinator Jakarta', '{"COMM-002"}', '2025-03-03 15:10:00+07'),
      ('kredit', 88, 550000.00, 'Operasional koordinator Bandung - Maret 2025', 'COORD-OPS-BDG-002-2025', '2025-03-04', 'Coordinator Bandung', '{"ADM-BDG-002"}', '2025-03-04 16:00:00+07'),
      ('debit', 95, 2200000.00, 'Tunjangan operasional koordinator Surabaya - Maret 2025', 'COORD-ALLOW-SBY-002-2025', '2025-03-05', 'Coordinator Surabaya', '{"ALLOW-003"}', '2025-03-05 17:15:00+07')
    `);

    // 3. Insert some SPBG transactions for coordinators (coordinator-managed SPBG operations)
    console.log("📝 Inserting Coordinator-managed SPBG transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, spbg_location, gas_volume_m3, calculation_method, 
        jisdor_rate, gas_filling_cost, no_nota, created_at
      ) VALUES 
      ('debit', 56, 2000000.00, 'Pengisian gas koordinator Jakarta - SPBG Jakarta Center', 'COORD-SPBG-JKT-001-2025', '2025-01-10', 'Coordinator Jakarta', 'jakarta', 120.00, 'jisdor', 16667.00, 2000000.00, '{"SPBG-JKT-COORD-001"}', '2025-01-10 08:00:00+07'),
      ('debit', 56, 1500000.00, 'Pengisian gas koordinator Bandung - SPBG Bandung Station', 'COORD-SPBG-BDG-001-2025', '2025-01-12', 'Coordinator Bandung', 'bandung', 90.00, 'jisdor', 16667.00, 1500000.00, '{"SPBG-BDG-COORD-001"}', '2025-01-12 09:30:00+07'),
      ('debit', 56, 1800000.00, 'Pengisian gas koordinator Surabaya - SPBG Surabaya Hub', 'COORD-SPBG-SBY-001-2025', '2025-01-14', 'Coordinator Surabaya', 'surabaya', 110.00, 'fixed', 16364.00, 1800000.00, '{"SPBG-SBY-COORD-001"}', '2025-01-14 10:15:00+07'),
      ('debit', 56, 1200000.00, 'Pengisian gas koordinator Jakarta - SPBG Semarang', 'COORD-SPBG-SMG-001-2025', '2025-02-02', 'Coordinator Jakarta', 'semarang', 75.00, 'jisdor', 16000.00, 1200000.00, '{"SPBG-SMG-COORD-001"}', '2025-02-02 11:00:00+07'),
      ('debit', 56, 2500000.00, 'Pengisian gas koordinator Bandung - SPBG Yogyakarta', 'COORD-SPBG-JOG-001-2025', '2025-02-04', 'Coordinator Bandung', 'yogyakarta', 150.00, 'jisdor', 16667.00, 2500000.00, '{"SPBG-JOG-COORD-001"}', '2025-02-04 12:30:00+07')
    `);

    // 4. Insert some regular transactions that coordinators might manage
    console.log("📝 Inserting Coordinator-managed regular transactions...");
    await db.pool.query(`
      INSERT INTO cash_transactions (
        transaction_type, category_id, amount, description, reference_number, 
        transaction_date, account, no_nota, created_at
      ) VALUES 
      ('debit', 1, 10000000.00, 'Setoran modal koordinator Jakarta - untuk operasional', 'COORD-MODAL-JKT-001-2025', '2025-01-01', 'Coordinator Jakarta', '{"MODAL-001"}', '2025-01-01 08:00:00+07'),
      ('debit', 2, 5000000.00, 'Pendapatan koordinator Bandung - dari proyek konstruksi', 'COORD-PENDAPATAN-BDG-001-2025', '2025-01-05', 'Coordinator Bandung', '{"PEND-001"}', '2025-01-05 09:30:00+07'),
      ('kredit', 4, 2000000.00, 'Biaya kantor koordinator Surabaya - renovasi ruang kerja', 'COORD-KANTOR-SBY-001-2025', '2025-01-08', 'Coordinator Surabaya', '{"KANTOR-001", "KANTOR-002"}', '2025-01-08 10:15:00+07'),
      ('kredit', 5, 8000000.00, 'Gaji tim koordinator Jakarta - Januari 2025', 'COORD-GAJI-JKT-001-2025', '2025-01-31', 'Coordinator Jakarta', '{"GAJI-001"}', '2025-01-31 11:00:00+07'),
      ('kredit', 6, 12000000.00, 'Pembelian kendaraan koordinator Bandung - untuk operasional', 'COORD-KENDARAAN-BDG-001-2025', '2025-02-01', 'Coordinator Bandung', '{"KEND-001"}', '2025-02-01 12:30:00+07'),
      ('debit', 3, 3000000.00, 'Pendapatan sewa gudang koordinator Surabaya', 'COORD-SEWA-SBY-001-2025', '2025-02-03', 'Coordinator Surabaya', '{"SEWA-001"}', '2025-02-03 13:45:00+07'),
      ('kredit', 7, 1500000.00, 'Biaya BBM koordinator Jakarta - untuk kendaraan operasional', 'COORD-BBM-JKT-001-2025', '2025-02-05', 'Coordinator Jakarta', '{"BBM-001"}', '2025-02-05 14:20:00+07'),
      ('debit', 2, 7000000.00, 'Pendapatan koordinator Bandung - dari proyek infrastruktur', 'COORD-PENDAPATAN-BDG-002-2025', '2025-02-10', 'Coordinator Bandung', '{"PEND-002"}', '2025-02-10 15:10:00+07'),
      ('kredit', 4, 1200000.00, 'Biaya kantor koordinator Surabaya - pembelian peralatan', 'COORD-KANTOR-SBY-002-2025', '2025-02-12', 'Coordinator Surabaya', '{"KANTOR-003"}', '2025-02-12 16:00:00+07'),
      ('debit', 3, 2500000.00, 'Pendapatan sewa gudang koordinator Jakarta', 'COORD-SEWA-JKT-001-2025', '2025-02-15', 'Coordinator Jakarta', '{"SEWA-002"}', '2025-02-15 17:15:00+07')
    `);

    console.log("✅ Cash Coordinator test data inserted successfully!");

    // Verify the data was inserted
    const coordinatorCount = await db.pool.query(`
      SELECT COUNT(*) as total FROM cash_transactions 
      WHERE account LIKE 'Coordinator%' OR description LIKE '%koordinator%'
    `);
    
    const coordinatorByAccount = await db.pool.query(`
      SELECT account, COUNT(*) as transaction_count, 
             SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) as total_debit,
             SUM(CASE WHEN transaction_type = 'kredit' THEN amount ELSE 0 END) as total_kredit
      FROM cash_transactions 
      WHERE account LIKE 'Coordinator%'
      GROUP BY account
      ORDER BY account
    `);
    
    const coordinatorByCategory = await db.pool.query(`
      SELECT cc.category_name, COUNT(ct.id) as transaction_count,
             SUM(CASE WHEN ct.transaction_type = 'debit' THEN ct.amount ELSE 0 END) as total_debit,
             SUM(CASE WHEN ct.transaction_type = 'kredit' THEN ct.amount ELSE 0 END) as total_kredit
      FROM cash_transactions ct
      JOIN cash_categories cc ON ct.category_id = cc.id
      WHERE cc.category_name LIKE '%Coordinator%'
      GROUP BY cc.id, cc.category_name
      ORDER BY cc.category_name
    `);

    console.log("\n📊 Cash Coordinator Data Summary:");
    console.log(`   - Total Coordinator Transactions: ${coordinatorCount.rows[0].total}`);
    
    console.log("\n👥 Transactions by Coordinator Account:");
    coordinatorByAccount.rows.forEach(row => {
      console.log(`   - ${row.account}: ${row.transaction_count} transactions`);
      console.log(`     Debit: Rp ${parseInt(row.total_debit).toLocaleString('id-ID')}`);
      console.log(`     Credit: Rp ${parseInt(row.total_kredit).toLocaleString('id-ID')}`);
    });
    
    console.log("\n📋 Transactions by Coordinator Category:");
    coordinatorByCategory.rows.forEach(row => {
      console.log(`   - ${row.category_name}: ${row.transaction_count} transactions`);
      console.log(`     Debit: Rp ${parseInt(row.total_debit).toLocaleString('id-ID')}`);
      console.log(`     Credit: Rp ${parseInt(row.total_kredit).toLocaleString('id-ID')}`);
    });

    console.log("\n💡 Cash Coordinator Testing Features:");
    console.log(`   - 8 coordinator-specific categories (operations, travel, communication, etc.)`);
    console.log(`   - 3 coordinator accounts: Jakarta, Bandung, Surabaya`);
    console.log(`   - Mix of regular transactions and SPBG transactions managed by coordinators`);
    console.log(`   - Realistic amounts and descriptions for coordinator operations`);
    console.log(`   - Transactions span 3 months (January-March 2025) for testing date filters`);
    console.log(`   - Both income and expense transactions for coordinators`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error inserting Cash Coordinator test data:", err);
    process.exit(1);
  }
};

insertCashCoordinatorTestData();
