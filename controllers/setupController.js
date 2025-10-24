const db = require('../utils/dbconnect');

// POST /api/setup/add-order-amount-column
// Adds order_amount column to orders table and updates existing orders
const addOrderAmountColumn = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if order_amount column already exists
        const [columns] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'cly' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_amount'"
        );

        if (columns.length === 0) {
            // Add the order_amount column
            await connection.execute(
                'ALTER TABLE orders ADD COLUMN order_amount DECIMAL(10,2) DEFAULT 0.00 AFTER couponCode'
            );

            // Add index for better performance
            await connection.execute(
                'CREATE INDEX idx_orders_amount ON orders(order_amount)'
            );
        } else {
            console.log('order_amount column already exists, updating existing orders...');
        }

        // Update existing orders with calculated amounts (sum all products with same orderID)
        await connection.execute(`
            UPDATE orders o1 
            SET order_amount = (
                SELECT COALESCE(SUM(o2.units * o2.productPrice), 0)
                FROM orders o2
                WHERE o2.orderID = o1.orderID
            )
            WHERE order_amount = 0.00
        `);

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'order_amount column added successfully and existing orders updated'
        });
    } catch (error) {
        await connection.rollback();
        console.error('[setupController] addOrderAmountColumn error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to add order_amount column',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// POST /api/setup/add-product-price-column
// Adds productPrice column to orders table and updates existing orders
const addProductPriceColumn = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if productPrice column already exists
        const [columns] = await connection.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'cly' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'productPrice'"
        );

        if (columns.length > 0) {
            return res.status(200).json({
                success: true,
                message: 'productPrice column already exists'
            });
        }

        // Add the productPrice column
        await connection.execute(
            'ALTER TABLE orders ADD COLUMN productPrice DECIMAL(10,2) DEFAULT 0.00 AFTER order_amount'
        );

        // Add index for better performance
        await connection.execute(
            'CREATE INDEX idx_orders_product_price ON orders(productPrice)'
        );

        // Update existing orders with product prices from products table
        await connection.execute(`
            UPDATE orders o 
            SET productPrice = (
                SELECT p.productPrice 
                FROM products p 
                WHERE p.productID = o.productID
            )
            WHERE productPrice = 0.00
        `);

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'productPrice column added successfully and existing orders updated'
        });
    } catch (error) {
        await connection.rollback();
        console.error('[setupController] addProductPriceColumn error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to add productPrice column',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    addOrderAmountColumn,
    addProductPriceColumn
};