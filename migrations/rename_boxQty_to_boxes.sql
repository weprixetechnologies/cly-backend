-- Migration to rename boxQty to boxes in orders table
-- This migration renames the boxQty column to boxes for better clarity

-- First, add the new boxes column
ALTER TABLE orders ADD COLUMN boxes INT DEFAULT 0 AFTER boxQty;

-- Copy data from boxQty to boxes
UPDATE orders SET boxes = boxQty;

-- Drop the old boxQty column
ALTER TABLE orders DROP COLUMN boxQty;

-- Add index for better performance
CREATE INDEX idx_orders_boxes ON orders(boxes);
