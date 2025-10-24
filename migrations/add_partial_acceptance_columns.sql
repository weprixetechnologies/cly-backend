-- Add partial acceptance columns to orders table
-- This migration adds columns to track requested vs accepted quantities

-- Add columns for partial acceptance
ALTER TABLE orders ADD COLUMN requested_units INT DEFAULT 0 AFTER units;
ALTER TABLE orders ADD COLUMN accepted_units INT DEFAULT 0 AFTER requested_units;
ALTER TABLE orders ADD COLUMN acceptance_status ENUM('pending', 'partial', 'full', 'rejected') DEFAULT 'pending' AFTER accepted_units;
ALTER TABLE orders ADD COLUMN admin_notes TEXT AFTER acceptance_status;

-- Update existing orders to set requested_units = units and accepted_units = 0
UPDATE orders SET requested_units = units, accepted_units = 0 WHERE requested_units = 0;

-- Add indexes for better performance
CREATE INDEX idx_orders_acceptance_status ON orders(acceptance_status);
CREATE INDEX idx_orders_requested_units ON orders(requested_units);
CREATE INDEX idx_orders_accepted_units ON orders(accepted_units);
