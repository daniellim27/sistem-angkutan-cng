-- Migration to add SPBG fields to existing database
-- This script adds the missing SPBG columns to existing tables

-- Add SPBG fields to cash_transactions table
ALTER TABLE cash_transactions 
ADD COLUMN IF NOT EXISTS spbg_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS gas_volume_m3 NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(10) CHECK (calculation_method IN ('jisdor', 'fixed')) DEFAULT 'jisdor',
ADD COLUMN IF NOT EXISTS jisdor_rate NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS gas_filling_cost NUMERIC(15, 2);

-- Add SPBG fields to deposit_groups table
ALTER TABLE deposit_groups 
ADD COLUMN IF NOT EXISTS group_type VARCHAR(10) DEFAULT 'general' CHECK (group_type IN ('general', 'spbg')),
ADD COLUMN IF NOT EXISTS spbg_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS spbg_operator VARCHAR(100),
ADD COLUMN IF NOT EXISTS gas_type VARCHAR(10) CHECK (gas_type IN ('cng', 'lng', 'lpg'));

-- Add gas filling fields to delivery_orders table (if not already present)
ALTER TABLE delivery_orders 
ADD COLUMN IF NOT EXISTS gas_volume_m3 NUMERIC(10, 2) CHECK (gas_volume_m3 >= 0),
ADD COLUMN IF NOT EXISTS spbg_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(10) CHECK (calculation_method IN ('jisdor', 'fixed')) DEFAULT 'jisdor',
ADD COLUMN IF NOT EXISTS jisdor_rate NUMERIC(10, 2) CHECK (jisdor_rate >= 0),
ADD COLUMN IF NOT EXISTS gas_filling_cost NUMERIC(15, 2) CHECK (gas_filling_cost >= 0);

-- Add comments to the new columns
COMMENT ON COLUMN cash_transactions.spbg_location IS 'SPBG (Stasiun Pengisian Bahan Bakar Gas) location';
COMMENT ON COLUMN cash_transactions.gas_volume_m3 IS 'Gas volume in cubic meters';
COMMENT ON COLUMN cash_transactions.calculation_method IS 'Method for calculating gas filling cost (jisdor or fixed)';
COMMENT ON COLUMN cash_transactions.jisdor_rate IS 'JISDOR rate in IDR per cubic meter';
COMMENT ON COLUMN cash_transactions.gas_filling_cost IS 'Calculated gas filling cost';

COMMENT ON COLUMN deposit_groups.group_type IS 'Type of deposit group (general or spbg)';
COMMENT ON COLUMN deposit_groups.spbg_location IS 'SPBG location for this group';
COMMENT ON COLUMN deposit_groups.spbg_operator IS 'SPBG operator company name';
COMMENT ON COLUMN deposit_groups.gas_type IS 'Type of gas (cng, lng, or lpg)';

COMMENT ON COLUMN delivery_orders.gas_volume_m3 IS 'Gas volume in cubic meters';
COMMENT ON COLUMN delivery_orders.spbg_location IS 'SPBG location for gas filling';
COMMENT ON COLUMN delivery_orders.calculation_method IS 'Method for calculating gas filling cost';
COMMENT ON COLUMN delivery_orders.jisdor_rate IS 'JISDOR rate in IDR per cubic meter';
COMMENT ON COLUMN delivery_orders.gas_filling_cost IS 'Calculated gas filling cost';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cash_transactions_spbg_location ON cash_transactions(spbg_location);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_gas_volume ON cash_transactions(gas_volume_m3);
CREATE INDEX IF NOT EXISTS idx_deposit_groups_group_type ON deposit_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_deposit_groups_spbg_location ON deposit_groups(spbg_location);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_spbg_location ON delivery_orders(spbg_location);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_gas_volume ON delivery_orders(gas_volume_m3);

-- Update existing records to have default values
UPDATE cash_transactions SET 
    spbg_location = NULL,
    gas_volume_m3 = NULL,
    calculation_method = 'jisdor',
    jisdor_rate = NULL,
    gas_filling_cost = NULL
WHERE spbg_location IS NULL;

UPDATE deposit_groups SET 
    group_type = 'general',
    spbg_location = NULL,
    spbg_operator = NULL,
    gas_type = NULL
WHERE group_type IS NULL;

UPDATE delivery_orders SET 
    gas_volume_m3 = NULL,
    spbg_location = NULL,
    calculation_method = 'jisdor',
    jisdor_rate = NULL,
    gas_filling_cost = NULL
WHERE gas_volume_m3 IS NULL;

-- Verify the changes
SELECT 'Migration completed successfully!' as status;

