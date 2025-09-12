-- Migration: Add nota_photo_url field to delivery_orders table
-- This field will store the URL(s) of nota photos uploaded by drivers when they arrive at customer location

ALTER TABLE delivery_orders 
ADD COLUMN IF NOT EXISTS nota_photo_url TEXT[];

-- Add comment to explain the field
COMMENT ON COLUMN delivery_orders.nota_photo_url IS 'Array of URLs for nota (receipt) photos uploaded by driver when arriving at customer location';

-- Create index for better query performance if needed
CREATE INDEX IF NOT EXISTS idx_delivery_orders_nota_photo 
ON delivery_orders USING GIN (nota_photo_url) 
WHERE nota_photo_url IS NOT NULL;
