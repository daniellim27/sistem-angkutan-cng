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

-- Step 2: Convert existing data and change column type
-- First, update any existing records to map to new values
UPDATE delivery_orders SET status = 
    CASE status::text
        WHEN 'assigned' THEN 'at_spbu'
        WHEN 'otw_to_load_location' THEN 'at_spbu' 
        WHEN 'at_load_location' THEN 'at_spbu'
        WHEN 'otw_to_base' THEN 'completed'
        ELSE status::text
    END::text;

-- Step 3: Change the column type
ALTER TABLE delivery_orders 
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE delivery_orders 
ALTER COLUMN status TYPE delivery_status_simple 
USING status::text::delivery_status_simple;

-- Step 4: Set new default
ALTER TABLE delivery_orders 
ALTER COLUMN status SET DEFAULT 'at_spbu';

-- Step 5: Clean up old enum
DROP TYPE delivery_status;
ALTER TYPE delivery_status_simple RENAME TO delivery_status;

-- Step 6: Add new timestamp column
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS departed_from_spbu_at TIMESTAMP WITH TIME ZONE;

-- Step 7: Migrate timestamp data
UPDATE delivery_orders 
SET departed_from_spbu_at = COALESCE(
    departed_to_load_location_at, 
    arrived_at_load_location_at, 
    departed_from_load_location_at
)
WHERE departed_from_spbu_at IS NULL;

-- Step 8: Drop old timestamp columns
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS departed_to_load_location_at;
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS arrived_at_load_location_at;
ALTER TABLE delivery_orders DROP COLUMN IF EXISTS departed_from_load_location_at;

-- Step 9: Update indexes
DROP INDEX IF EXISTS idx_active_delivery_orders_per_driver_id;
DROP INDEX IF EXISTS idx_active_delivery_orders_per_vehicle;

CREATE UNIQUE INDEX idx_active_delivery_orders_per_driver_id 
ON delivery_orders(driver_id) 
WHERE status IN ('at_spbu', 'otw_to_unload_location', 'at_unload_location');

CREATE UNIQUE INDEX idx_active_delivery_orders_per_vehicle 
ON delivery_orders(vehicle_id) 
WHERE status IN ('at_spbu', 'otw_to_unload_location', 'at_unload_location');
