-- Make delivery_orders.driver_id nullable on user deletion
-- Drops existing FK and recreates it with ON DELETE SET NULL

ALTER TABLE delivery_orders
  DROP CONSTRAINT IF EXISTS delivery_orders_driver_id_fkey;

ALTER TABLE delivery_orders
  ADD CONSTRAINT delivery_orders_driver_id_fkey
  FOREIGN KEY (driver_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

