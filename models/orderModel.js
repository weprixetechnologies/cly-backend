const db = require('../utils/dbconnect');
const productModel = require('./productModel');

function generateOrderID() {
    return `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// Create order from cart items
async function createOrderFromCart(orderData) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const orderID = generateOrderID();
        const { uid, items, address, paymentMode, couponCode } = orderData;

        // Consolidate duplicate products (sum quantities) to satisfy unique (orderID, productID)
        const productIdToTotals = new Map();
        for (const item of items || []) {
            const key = String(item.productID);
            const prev = productIdToTotals.get(key) || { productID: item.productID, productName: item.productName, featuredImage: item.featuredImage || '', boxQty: 0, units: 0 };
            prev.boxQty += Number(item.boxQty || 0);
            prev.units += Number(item.units || 0);
            // prefer first non-empty name/image
            if (!prev.productName && item.productName) prev.productName = item.productName;
            if (!prev.featuredImage && item.featuredImage) prev.featuredImage = item.featuredImage;
            productIdToTotals.set(key, prev);
        }

        // Insert one row per unique productID with address and payment details
        for (const consolidated of productIdToTotals.values()) {
            const { productID, productName, boxQty = 0, units = 0, featuredImage } = consolidated;

            // Prepare address fields
            const deliveryName = address?.name || '';
            const deliveryPhone = address?.phone || '';
            const deliveryAddress = [
                address?.addressLine1 || '',
                address?.addressLine2 || '',
                address?.city || '',
                address?.state || '',
                address?.pincode || ''
            ].filter(Boolean).join(', ');

            await connection.execute(
                'INSERT INTO orders (orderID, productID, productName, boxQty, units, featuredImage, uid, orderStatus, addressName, addressPhone, addressLine1, addressLine2, addressCity, addressState, addressPincode, paymentMode, couponCode)\n                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [orderID, productID, productName, boxQty, units, featuredImage || '', uid, 'pending', deliveryName, deliveryPhone, address?.addressLine1 || '', address?.addressLine2 || '', address?.city || '', address?.state || '', address?.pincode || '', paymentMode || 'COD', couponCode || '']
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
            'SELECT * FROM orders WHERE uid = ? ORDER BY orderID DESC',
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
            'SELECT * FROM orders WHERE orderID = ?',
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
            'UPDATE orders SET orderStatus = ? WHERE orderID = ?',
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

        // Ensure page and limit are integers
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

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
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

        // Get orders with pagination - add LIMIT and OFFSET to params
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

        const [rows] = await db.execute(ordersQuery, [...params, limitNum, offset]);

        return {
            orders: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: parseInt(total),
                totalPages: Math.ceil(total / limitNum)
            }
        };
    } catch (error) {
        throw new Error(`Error fetching all orders: ${error.message}`);
    }
}


// Calculate total amount for an order by summing quantity * productPrice
async function calculateOrderTotal(orderID) {
    try {
        const [rows] = await db.execute(
            'SELECT o.productID, o.boxQty, o.units, p.productPrice\n             FROM orders o\n             JOIN products p ON p.productID = o.productID\n             WHERE o.orderID = ?',
            [orderID]
        );

        let total = 0;
        for (const r of rows) {
            const qty = (r.units || 0) + (r.boxQty || 0);
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
            'UPDATE users SET outstanding = COALESCE(outstanding,0) + ? WHERE uid = ?',
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
            'UPDATE users SET outstanding = GREATEST(COALESCE(outstanding,0) - ?, 0) WHERE uid = ?',
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
    calculateOrderTotal,
    addOutstanding,
    subtractOutstanding
};



