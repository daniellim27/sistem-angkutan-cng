-- scripts/insert_dummy_gas_transactions.sql
--
-- Insert dummy gas_transactions for user with username 'driver'.
-- Uses subqueries to find driver id and a deposit_group id (safest for local/dev DBs).
-- Run with psql or your preferred DB client while connected to the project's DB.
--
-- Example: psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/insert_dummy_gas_transactions.sql

-- 1) Insert an APPROVED (visible in history) gas transaction
INSERT INTO gas_transactions (
  deposit_group_id,
  delivery_order_id,
  driver_id,
  vehicle_id,
  volume_m3,
  calculation_method,
  rate_per_m3,
  jisdor_rate,
  total_cost,
  status,
  surat_jalan_photo_url,
  nota_photo_url,
  biaya_lain_photo_url,
  biaya_lain_amount,
  biaya_lain_description,
  nota_ocr_data,
  created_at,
  updated_at
)
VALUES (
  -- use any existing deposit_group (fallback NULL if none)
  (SELECT id FROM deposit_groups LIMIT 1),
  NULL,
  (SELECT id FROM users WHERE username = 'driver' LIMIT 1),
  (SELECT id FROM vehicles WHERE driver_id = (SELECT id FROM users WHERE username = 'driver' LIMIT 1) LIMIT 1),
  1.75,
  'fixed',
  110000.00,
  NULL,
  192500.00,
  'approved',
  'https://example.com/surat_jalan_dummy.jpg',
  'https://example.com/nota_dummy.jpg',
  NULL,
  NULL,
  NULL,
  ('{"submitted_at":"2025-12-17T00:00:00Z","stan_awal":1000,"current_stan":1500}'::jsonb),
  now(), now()
);

-- 2) Insert a PENDING gas transaction (to test pending state rendering)
INSERT INTO gas_transactions (
  deposit_group_id,
  delivery_order_id,
  driver_id,
  vehicle_id,
  volume_m3,
  calculation_method,
  rate_per_m3,
  total_cost,
  status,
  nota_photo_url,
  nota_ocr_data,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM deposit_groups LIMIT 1),
  NULL,
  (SELECT id FROM users WHERE username = 'driver' LIMIT 1),
  (SELECT id FROM vehicles WHERE driver_id = (SELECT id FROM users WHERE username = 'driver' LIMIT 1) LIMIT 1),
  2.00,
  'jisdor',
  0.00,
  0.00,
  'pending',
  'https://example.com/nota_pending_dummy.jpg',
  ('{"submitted_at":"2025-12-17T00:00:00Z"}'::jsonb),
  now(), now()
);

-- NOTE: if the subqueries return NULL (e.g., no deposit_groups or no driver user), these inserts will place NULL in those fields — which is fine for local dev. If you want to ensure a deposit_group exists first, create one via:
-- INSERT INTO deposit_groups (name, created_at, updated_at) VALUES ('Dummy SPBG', now(), now());

-- After running, query to validate:
-- SELECT id, deposit_group_id, driver_id, volume_m3, total_cost, status, nota_photo_url FROM gas_transactions ORDER BY created_at DESC LIMIT 10;
