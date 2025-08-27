-- =================================================================
-- CLEAN SEEDER (ESSENTIAL BUSINESS CATEGORIES + ADMIN USER)
-- =================================================================

-- Admin User (Essential for system access)
INSERT INTO users (username, password_hash, role) VALUES
('admin', 'awak1234', 'admin');

INSERT INTO admin_profiles (user_id, full_name, phone, email) VALUES
((SELECT id FROM users WHERE username = 'admin'), 'System Administrator', '081234567890', 'admin@company.com');

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
