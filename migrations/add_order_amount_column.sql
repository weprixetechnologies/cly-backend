-- Add order_amount column to orders table
-- This migration adds an order_amount column to store the total order amount

-- Add the order_amount column
ALTER TABLE orders ADD COLUMN order_amount DECIMAL(10,2) DEFAULT 0.00 AFTER couponCode;

-- Add index for better performance on order_amount queries
CREATE INDEX idx_orders_amount ON orders(order_amount);

-- Update existing orders with calculated amounts
-- This will calculate the order amount for existing orders based on their items
UPDATE orders o1 
SET order_amount = (
    SELECT COALESCE(SUM(o2.units * p.productPrice), 0)
    FROM orders o2
    JOIN products p ON p.productID = o2.productID
    WHERE o2.orderID = o1.orderID
)
WHERE order_amount = 0.00;
