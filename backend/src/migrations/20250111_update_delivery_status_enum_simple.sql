-- Simple migration to update delivery_status enum
-- This creates the new enum and updates the table

-- Step 1: Create new enum with desired values
CREATE TYPE delivery_status_simple AS ENUM (
    'at_spbu',
    'otw_to_unload_location', 
    'at_unload_location',
    'completed',
    'cancelled'
);

-- Step 2: Add temporary column with new enum type
ALTER TABLE delivery_orders 
ADD COLUMN status_new delivery_status_simple;

-- Step 3: Populate the new column with mapped values
UPDATE delivery_orders SET status_new = 
    CASE status::text
        WHEN 'assigned' THEN 'at_spbu'::delivery_status_simple
        WHEN 'otw_to_load_location' THEN 'at_spbu'::delivery_status_simple
        WHEN 'at_load_location' THEN 'at_spbu'::delivery_status_simple
        WHEN 'otw_to_unload_location' THEN 'otw_to_unload_location'::delivery_status_simple
        WHEN 'at_unload_location' THEN 'at_unload_location'::delivery_status_simple
        WHEN 'otw_to_base' THEN 'completed'::delivery_status_simple
        WHEN 'completed' THEN 'completed'::delivery_status_simple
        WHEN 'cancelled' THEN 'cancelled'::delivery_status_simple
        ELSE 'at_spbu'::delivery_status_simple
    END;

-- Step 4: Drop the old column and rename the new one
ALTER TABLE delivery_orders DROP COLUMN status;
ALTER TABLE delivery_orders RENAME COLUMN status_new TO status;

-- Step 5: Set NOT NULL constraint and default
ALTER TABLE delivery_orders 
ALTER COLUMN status SET NOT NULL;

ALTER TABLE delivery_orders 
ALTER COLUMN status SET DEFAULT 'at_spbu';

-- Step 6: Clean up old enum
DROP TYPE delivery_status;
ALTER TYPE delivery_status_simple RENAME TO delivery_status;

-- Step 7: Add new timestamp column
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS departed_from_spbu_at TIMESTAMP WITH TIME ZONE;

-- Step 8: Migrate timestamp data
UPDATE delivery_orders 
SET departed_from_spbu_at = COALESCE(
    departed_to_load_location_at, 
    arrived_at_load_location_at, 
    departed_from_load_location_at
)
WHERE departed_from_spbu_at IS NULL;

-- Step 9: Drop old timestamp columns
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS departed_to_load_location_at;
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS arrived_at_load_location_at;
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS departed_from_load_location_at;

-- Step 10: Update indexes
DROP INDEX IF EXISTS idx_active_delivery_orders_per_driver_id;
DROP INDEX IF EXISTS idx_active_delivery_orders_per_vehicle;

CREATE UNIQUE INDEX idx_active_delivery_orders_per_driver_id 
ON delivery_orders(driver_id) 
WHERE status IN ('at_spbu', 'otw_to_unload_location', 'at_unload_location');

CREATE UNIQUE INDEX idx_active_delivery_orders_per_vehicle 
ON delivery_orders(vehicle_id) 
WHERE status IN ('at_spbu', 'otw_to_unload_location', 'at_unload_location');
