-- Add HSN, tax, and brand columns to products table
-- This migration adds additional fields for product information

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS productMRP DECIMAL(10,2) DEFAULT NULL AFTER productPrice,
ADD COLUMN IF NOT EXISTS tax DECIMAL(5,2) DEFAULT NULL AFTER productMRP,
ADD COLUMN IF NOT EXISTS brand VARCHAR(255) DEFAULT NULL AFTER tax,
ADD COLUMN IF NOT EXISTS hsn VARCHAR(50) DEFAULT NULL AFTER brand;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_products_hsn ON products(hsn);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

