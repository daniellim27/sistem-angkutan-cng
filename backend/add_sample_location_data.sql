-- Insert sample customers with coordinates (Jakarta area)
INSERT INTO customers (customer_name, location, latitude, longitude, nota_besar, nota_kecil)
VALUES 
  ('PT. Sumber Gas Indonesia', 'Jl. Sudirman No. 123, Jakarta Pusat', -6.2088, 106.8456, 50000000, 25000000),
  ('CV. Energi Nusantara', 'Jl. Gatot Subroto No. 45, Jakarta Selatan', -6.2297, 106.8075, 75000000, 30000000),
  ('UD. Gas Prima', 'Jl. Thamrin No. 67, Jakarta Pusat', -6.1944, 106.8229, 60000000, 20000000),
  ('PT. Indo Gas Mandiri', 'Jl. Rasuna Said No. 89, Jakarta Selatan', -6.2146, 106.8451, 80000000, 40000000),
  ('CV. Metro Gas', 'Jl. MH Thamrin No. 12, Jakarta Pusat', -6.1867, 106.8228, 45000000, 15000000);

-- Insert sample gas stations (SPBG) with coordinates
INSERT INTO gas_stations (name, latitude, longitude, address, station_type, phone, operating_hours, is_active, created_by)
VALUES 
  ('SPBG Sudirman', -6.2088, 106.8456, 'Jl. Sudirman Kav. 10, Jakarta Pusat', 'CNG', '021-5551234', '24/7', true, 3),
  ('SPBG Senayan', -6.2297, 106.8075, 'Jl. Asia Afrika No. 8, Jakarta Pusat', 'CNG', '021-5555678', '06:00 - 22:00', true, 3),
  ('SPBG Kuningan', -6.2146, 106.8451, 'Jl. HR Rasuna Said, Jakarta Selatan', 'CNG', '021-5559876', '24/7', true, 3),
  ('SPBG Kemang', -6.2615, 106.8106, 'Jl. Kemang Raya No. 25, Jakarta Selatan', 'CNG', '021-5554321', '05:00 - 23:00', true, 3),
  ('SPBG Blok M', -6.2441, 106.7991, 'Jl. Blok M No. 15, Jakarta Selatan', 'CNG', '021-5558765', '24/7', true, 3);
