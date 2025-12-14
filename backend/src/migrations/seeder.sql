-- =================================================================
-- CLEAN SEEDER (ESSENTIAL BUSINESS CATEGORIES + ADMIN USER)
-- =================================================================

-- Driver User (Essential for mobile app testing)
INSERT INTO users (username, password_hash, role)
VALUES ('jack_driver', 'jack123', 'driver')
ON CONFLICT (username) DO NOTHING;

INSERT INTO driver_profiles (user_id, full_name, phone, address, id_card_number, sim_number, sim_expiry_date, license_type, status)
VALUES (
  (SELECT id FROM users WHERE username = 'jack_driver'),
  'Jack Driver',
  '+628123456789',
  'Jl. Driver No. 123, Jakarta',
  'ID123456789',
  'SIM123456789',
  '2026-12-31',
  'B2',
  'available'
);

-- Stock Categories (Essential for business operations)
INSERT INTO stock_categories (category_name, description) VALUES    
('Oli & Pelumas', 'Oli mesin, oli transmisi, dan pelumas lainnya'),
('Filter', 'Filter oli, filter solar, filter udara'),
('Spare Parts', 'Suku cadang kendaraan'),
('Bahan Bakar & Aditif', 'Solar, bensin, dan aditif'),
('Sistem Rem', 'Kampas rem, minyak rem, dan komponen rem lainnya'),
('Ban & Velg', 'Ban, velg, dan aksesoris roda');

-- Cash Categories (Essential for financial operations)
INSERT INTO cash_categories (category_name, category_type, description) VALUES
('Setoran Modal', 'income', 'Modal awal atau tambahan modal'),
('Pendapatan Operasional', 'income', 'Pendapatan dari operasional harian'),
('Pendapatan Lain-lain', 'income', 'Pendapatan di luar operasional utama'),
('Biaya Kantor', 'expense', 'Pengeluaran untuk operasional kantor'),
('Gaji Staf', 'expense', 'Pembayaran gaji karyawan'),
('Pembelian Aset', 'expense', 'Pembelian kendaraan, peralatan, dll'),
('Biaya Operasional', 'expense', 'Biaya BBM, maintenance, dll'),
('Pengeluaran Lain-lain', 'expense', 'Pengeluaran di luar kategori utama'),
('Pengeluaran Mobil', 'expense', 'Pengeluaran di urusan mobil');

-- =================================================================
-- TEST SPBG + VEHICLE LOCATION FOR PROXIMITY CHECKS
-- =================================================================

-- Test SPBG deposit group with coordinates (Jakarta area)
INSERT INTO deposit_groups (
  spbg_name,
  spbg_location,
  balance,
  completed_quantity,
  deposited_amount,
  remaining_quantity,
  unit,
  status,
  total_selisih_amount,
  selisih_details,
  selisih_status,
  latitude,
  longitude
) VALUES (
  'Test SPBG Rawu',
  'SPBG Rawu, Jakarta',
  10000000,          -- balance
  0,                 -- completed_quantity
  10000000,          -- deposited_amount
  10000,             -- remaining_quantity (kubik)
  'kubik',           -- unit
  'active',          -- status
  0,                 -- total_selisih_amount
  NULL,              -- selisih_details
  'none',            -- selisih_status
  -6.2088000,        -- latitude
  106.8456000        -- longitude
);

-- Test vehicle assigned to jack_driver
INSERT INTO vehicles (
  license_plate,
  type,
  capacity,
  tire_count,
  spare_tire_count,
  driver_id,
  status,
  device_id
) VALUES (
  'TEST-1234',
  'CNG Truck',
  '10000',                                         -- capacity in kg (stored as string)
  6,
  2,
  (SELECT id FROM users WHERE username = 'jack_driver'),
  'available',
  'DEV-TEST-DEVICE-1'
);

-- Driver location that is effectively "inside" the SPBG (same coordinates)
INSERT INTO driver_locations (
  driver_id,
  vehicle_id,
  delivery_order_id,
  latitude,
  longitude,
  altitude,
  speed,
  heading,
  accuracy,
  timestamp,
  device_id,
  battery_level,
  signal_strength,
  status
) VALUES (
  (SELECT id FROM users WHERE username = 'jack_driver'),
  (SELECT id FROM vehicles WHERE license_plate = 'TEST-1234'),
  NULL,
  -6.2088000,       -- same lat as Test SPBG
  106.8456000,      -- same lng as Test SPBG
  10.0,             -- altitude
  0.0,              -- speed
  0.0,              -- heading
  5.0,              -- accuracy (meters)
  NOW(),
  'DEV-TEST-DEVICE-1',
  90,
  80,
  'active'
);