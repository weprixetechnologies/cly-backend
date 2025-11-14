-- Complete Orders Table Migration
-- This script creates all necessary columns for the orders table

-- First, let's check if the orders table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS orders (
    orderID VARCHAR(50) PRIMARY KEY,
    productID VARCHAR(50) NOT NULL,
    productName VARCHAR(255) NOT NULL,
    uid VARCHAR(50) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    orderStatus ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (productID) REFERENCES products(productID) ON DELETE CASCADE
);

-- Add all the necessary columns that might be missing
-- Address fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS addressName VARCHAR(255) DEFAULT NULL AFTER orderStatus,
ADD COLUMN IF NOT EXISTS addressPhone VARCHAR(20) DEFAULT NULL AFTER addressName,
ADD COLUMN IF NOT EXISTS addressLine1 TEXT DEFAULT NULL AFTER addressPhone,
ADD COLUMN IF NOT EXISTS addressLine2 TEXT DEFAULT NULL AFTER addressLine1,
ADD COLUMN IF NOT EXISTS addressCity VARCHAR(100) DEFAULT NULL AFTER addressLine2,
ADD COLUMN IF NOT EXISTS addressState VARCHAR(100) DEFAULT NULL AFTER addressCity,
ADD COLUMN IF NOT EXISTS addressPincode VARCHAR(10) DEFAULT NULL AFTER addressState;

-- Payment fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paymentMode ENUM('COD', 'PREPAID', 'PHONEPE') DEFAULT 'COD' AFTER addressPincode,
ADD COLUMN IF NOT EXISTS couponCode VARCHAR(50) DEFAULT NULL AFTER paymentMode,
ADD COLUMN IF NOT EXISTS order_amount DECIMAL(10,2) DEFAULT 0.00 AFTER couponCode,
ADD COLUMN IF NOT EXISTS productPrice DECIMAL(10,2) DEFAULT 0.00 AFTER order_amount;

-- Payment status fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status ENUM('paid', 'not_paid', 'partially_paid') DEFAULT 'not_paid' AFTER productPrice,
ADD COLUMN IF NOT EXISTS payment_date DATETIME DEFAULT NULL AFTER payment_status,
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255) DEFAULT NULL AFTER payment_date;

-- Quantity fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS boxes INT DEFAULT 0 AFTER payment_reference,
ADD COLUMN IF NOT EXISTS units INT DEFAULT 0 AFTER boxes,
ADD COLUMN IF NOT EXISTS requested_units INT DEFAULT 0 AFTER units,
ADD COLUMN IF NOT EXISTS accepted_units INT DEFAULT 0 AFTER requested_units;

-- Acceptance fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS acceptance_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending' AFTER accepted_units,
ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL AFTER acceptance_status,
ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT NULL AFTER admin_notes;

-- Image field
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS featuredImage TEXT DEFAULT NULL AFTER remarks;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_uid ON orders(uid);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(orderStatus);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_acceptance_status ON orders(acceptance_status);
CREATE INDEX IF NOT EXISTS idx_orders_amount ON orders(order_amount);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(createdAt);

-- Update existing orders to set default values where needed
UPDATE orders SET 
    requested_units = COALESCE(requested_units, units, 0),
    accepted_units = COALESCE(accepted_units, 0),
    boxes = COALESCE(boxes, 0),
    order_amount = COALESCE(order_amount, 0.00),
    productPrice = COALESCE(productPrice, 0.00)
WHERE requested_units IS NULL OR accepted_units IS NULL OR boxes IS NULL OR order_amount IS NULL OR productPrice IS NULL;

-- Verify the table structure
DESCRIBE orders;
