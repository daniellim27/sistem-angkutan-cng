-- Migration to add unique constraint to cash_categories.category_name
-- This fixes the ON CONFLICT clause issue in test data insertion

-- Add unique constraint to category_name column
ALTER TABLE cash_categories 
ADD CONSTRAINT unique_cash_category_name UNIQUE (category_name);

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'cash_categories'::regclass 
AND conname = 'unique_cash_category_name';
