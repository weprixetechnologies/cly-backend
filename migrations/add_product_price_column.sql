-- Add productPrice column to orders table
-- This migration adds a productPrice column to store individual product prices

-- Add the productPrice column
ALTER TABLE orders ADD COLUMN productPrice DECIMAL(10,2) DEFAULT 0.00 AFTER order_amount;

-- Add index for better performance on productPrice queries
CREATE INDEX idx_orders_product_price ON orders(productPrice);

-- Update existing orders with product prices from products table
UPDATE orders o 
SET productPrice = (
    SELECT p.productPrice 
    FROM products p 
    WHERE p.productID = o.productID
)
WHERE productPrice = 0.00;
