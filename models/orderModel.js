const db = require('../utils/dbconnect');
const productModel = require('./productModel');

function generateOrderID() {
    return `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// Create order from cart items
async function createOrderFromCart(uid, items) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const orderID = generateOrderID();

        // Insert rows in orders table for each item
        for (const item of items) {
            const { productID, productName, boxQty = 0, packQty = 0, units = 0, featuredImage } = item;
            await connection.execute(
                `INSERT INTO orders (orderID, productID, productName, boxQty, packQty, units, featuredImage, uid, orderStatus)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [orderID, productID, productName, boxQty, packQty, units, featuredImage || '', uid]
            );
        }

        await connection.commit();
        return { orderID };
    } catch (error) {
        await connection.rollback();
        throw new Error(`Error creating order: ${error.message}`);
    } finally {
        connection.release();
    }
}

// Get order list for a user
async function getOrdersByUser(uid) {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM orders WHERE uid = ? ORDER BY orderID DESC`,
            [uid]
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching orders: ${error.message}`);
    }
}

// Get single order with its items
async function getOrderById(orderID) {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM orders WHERE orderID = ?`,
            [orderID]
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching order: ${error.message}`);
    }
}

// Update order status
async function updateOrderStatus(orderID, orderStatus) {
    try {
        const [result] = await db.execute(
            `UPDATE orders SET orderStatus = ? WHERE orderID = ?`,
            [orderStatus, orderID]
        );
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating order status: ${error.message}`);
    }
}

// Admin: Get all orders with filters and pagination
async function getAllOrders(filters = {}) {
    try {
        const {
            status = 'all',
            page = 1,
            limit = 10,
            search = '',
            paymentMode = 'all',
            dateFrom = '',
            dateTo = ''
        } = filters;

        const offset = (page - 1) * limit;
        const params = [];
        let whereConditions = [];

        // Status filter
        if (status && status !== 'all') {
            whereConditions.push('orderStatus = ?');
            params.push(status);
        }

        // Payment mode filter
        if (paymentMode && paymentMode !== 'all') {
            whereConditions.push('paymentMode = ?');
            params.push(paymentMode);
        }

        // Search filter (orderID, uid, productName)
        if (search) {
            whereConditions.push('(orderID LIKE ? OR uid LIKE ? OR productName LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Date range filter
        if (dateFrom) {
            whereConditions.push('DATE(createdAt) >= ?');
            params.push(dateFrom);
        }
        if (dateTo) {
            whereConditions.push('DATE(createdAt) <= ?');
            params.push(dateTo);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(DISTINCT orderID) as total 
            FROM orders 
            ${whereClause}
        `;
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total;

        // Get orders with pagination
        const ordersQuery = `
            SELECT 
                orderID,
                MIN(uid) as uid,
                MIN(orderStatus) as orderStatus,
                MIN(paymentMode) as paymentMode,
                MIN(addressName) as addressName,
                MIN(addressCity) as addressCity,
                MIN(addressState) as addressState,
                MIN(createdAt) as createdAt,
                COUNT(*) as items
            FROM orders
            ${whereClause}
            GROUP BY orderID
            ORDER BY orderID DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.execute(ordersQuery, [...params, limit, offset]);

        return {
            orders: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(total),
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        throw new Error(`Error fetching all orders: ${error.message}`);
    }
}

// Admin: Deduct inventory for all items in an order when accepting
async function deductInventoryForOrder(orderID) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get all line items for this order
        const [items] = await connection.execute(
            `SELECT productID, boxQty, packQty, units FROM orders WHERE orderID = ?`,
            [orderID]
        );

        // For each product, reduce inventory by total requested quantity
        for (const item of items) {
            const totalRequested = (item.units || 0) + (item.packQty || 0) + (item.boxQty || 0);
            if (totalRequested <= 0) continue;

            // Fetch current inventory
            const [prodRows] = await connection.execute(
                `SELECT inventory FROM products WHERE productID = ? FOR UPDATE`,
                [item.productID]
            );
            if (!prodRows || prodRows.length === 0) continue; // Skip missing products silently

            const currentInventory = Number(prodRows[0].inventory || 0);
            const newInventory = Math.max(0, currentInventory - totalRequested);

            await connection.execute(
                `UPDATE products SET inventory = ?, updatedAt = CURRENT_TIMESTAMP WHERE productID = ?`,
                [newInventory, item.productID]
            );
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw new Error(`Error deducting inventory: ${error.message}`);
    } finally {
        connection.release();
    }
}

// Calculate total amount for an order by summing quantity * productPrice
async function calculateOrderTotal(orderID) {
    try {
        const [rows] = await db.execute(
            `SELECT o.productID, o.boxQty, o.packQty, o.units, p.productPrice
             FROM orders o
             JOIN products p ON p.productID = o.productID
             WHERE o.orderID = ?`,
            [orderID]
        );

        let total = 0;
        for (const r of rows) {
            const qty = (r.units || 0) + (r.packQty || 0) + (r.boxQty || 0);
            const price = Number(r.productPrice || 0);
            total += qty * price;
        }
        return Number(total.toFixed(2));
    } catch (error) {
        throw new Error(`Error calculating order total: ${error.message}`);
    }
}

// Increment user's outstanding by amount
async function addOutstanding(uid, amount) {
    try {
        const inc = Number(amount || 0);
        if (!Number.isFinite(inc)) return false;
        const [result] = await db.execute(
            `UPDATE users SET outstanding = COALESCE(outstanding,0) + ? WHERE uid = ?`,
            [inc, uid]
        );
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating outstanding: ${error.message}`);
    }
}

// Decrement user's outstanding by amount, not going below zero
async function subtractOutstanding(uid, amount) {
    try {
        const dec = Number(amount || 0);
        if (!Number.isFinite(dec)) return false;
        const [result] = await db.execute(
            `UPDATE users SET outstanding = GREATEST(COALESCE(outstanding,0) - ?, 0) WHERE uid = ?`,
            [dec, uid]
        );
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error decreasing outstanding: ${error.message}`);
    }
}

module.exports = {
    createOrderFromCart,
    getOrdersByUser,
    getOrderById,
    updateOrderStatus,
    getAllOrders,
    deductInventoryForOrder,
    calculateOrderTotal,
    addOutstanding
    , subtractOutstanding
};



