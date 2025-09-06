-- Migration to add SPBG category to existing cash_categories table
-- This script adds the missing SPBG category for SPBG transactions

-- Check if SPBG category already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM cash_categories 
        WHERE category_name = 'SPBG Gas Filling'
    ) THEN
        -- Add SPBG category if it doesn't exist
        INSERT INTO cash_categories (category_name, category_type, description) 
        VALUES ('SPBG Gas Filling', 'expense', 'Pengisian gas di Stasiun Pengisian Bahan Bakar Gas');
        
        RAISE NOTICE 'SPBG category added successfully!';
    ELSE
        RAISE NOTICE 'SPBG category already exists!';
    END IF;
END $$;

-- Verify the category exists and show its details
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM cash_categories WHERE category_name = 'SPBG Gas Filling') 
        THEN 'SPBG category is available!' 
        ELSE 'SPBG category was not found!' 
    END as status,
    id, 
    category_name, 
    category_type, 
    description 
FROM cash_categories 
WHERE category_name = 'SPBG Gas Filling';
