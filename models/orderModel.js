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
            const prev = productIdToTotals.get(key) || { productID: item.productID, productName: item.productName, featuredImage: item.featuredImage || '', units: 0 };
            prev.units += Number(item.units || 0);
            // prefer first non-empty name/image
            if (!prev.productName && item.productName) prev.productName = item.productName;
            if (!prev.featuredImage && item.featuredImage) prev.featuredImage = item.featuredImage;
            productIdToTotals.set(key, prev);
        }

        // Calculate total order amount and prepare product data
        let totalOrderAmount = 0;
        const productData = [];

        for (const consolidated of productIdToTotals.values()) {
            const { productID, productName, units = 0, featuredImage } = consolidated;
            const product = await productModel.getProductById(productID);
            const productPrice = product?.productPrice || 0;
            const productBoxQty = product?.boxQty || 1;
            const requiredBoxes = Math.ceil(units / productBoxQty);
            const itemTotal = units * productPrice;

            totalOrderAmount += itemTotal;

            productData.push({
                productID,
                productName,
                units,
                featuredImage,
                productPrice,
                requiredBoxes
            });
        }

        // Insert one row per unique productID with individual product pricing
        for (const product of productData) {
            const { productID, productName, units, featuredImage, productPrice, requiredBoxes } = product;

            // Prepare address fields
            const deliveryName = address?.name || '';
            const deliveryPhone = address?.phone || '';

            // Determine payment status based on payment mode
            const paymentStatus = (paymentMode === 'PREPAID' || paymentMode === 'PHONEPE') ? 'paid' : 'not_paid';
            const paymentDate = paymentStatus === 'paid' ? new Date() : null;

            await connection.execute(
                'INSERT INTO orders (orderID, productID, productName, boxes, units, requested_units, accepted_units, acceptance_status, featuredImage, uid, orderStatus, addressName, addressPhone, addressLine1, addressLine2, addressCity, addressState, addressPincode, paymentMode, couponCode, order_amount, productPrice, payment_status, payment_date)\n                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [orderID, productID, productName, requiredBoxes, units, units, 0, 'pending', featuredImage || '', uid, 'pending', deliveryName, deliveryPhone, address?.addressLine1 || '', address?.addressLine2 || '', address?.city || '', address?.state || '', address?.pincode || '', paymentMode || 'COD', couponCode || '', totalOrderAmount, productPrice, paymentStatus, paymentDate]
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
            'SELECT o.*, p.sku FROM orders o LEFT JOIN products p ON p.productID = o.productID WHERE o.uid = ? ORDER BY o.orderID DESC',
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
            'SELECT o.*, u.name as userName, p.sku, p.inventory FROM orders o LEFT JOIN users u ON u.uid = o.uid LEFT JOIN products p ON p.productID = o.productID WHERE o.orderID = ? ORDER BY o.productID',
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

// Update order with partial acceptance
async function updateOrderAcceptance(orderID, productID, acceptedUnits, adminNotes = '') {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get the requested units for this product
        const [rows] = await connection.execute(
            'SELECT requested_units FROM orders WHERE orderID = ? AND productID = ?',
            [orderID, productID]
        );

        if (rows.length === 0) {
            throw new Error('Order item not found');
        }

        const requestedUnits = rows[0].requested_units;
        let acceptanceStatus = 'pending';

        if (acceptedUnits === 0) {
            acceptanceStatus = 'rejected';
        } else if (acceptedUnits === requestedUnits) {
            acceptanceStatus = 'full';
        } else if (acceptedUnits < requestedUnits) {
            acceptanceStatus = 'partial';
        }

        // Update the specific product in the order
        const [result] = await connection.execute(
            'UPDATE orders SET accepted_units = ?, acceptance_status = ?, admin_notes = ? WHERE orderID = ? AND productID = ?',
            [acceptedUnits, acceptanceStatus, adminNotes, orderID, productID]
        );

        // Update the overall order status based on all products
        const [allItems] = await connection.execute(
            'SELECT acceptance_status FROM orders WHERE orderID = ?',
            [orderID]
        );

        let overallStatus = 'pending';
        const hasRejected = allItems.some(item => item.acceptance_status === 'rejected');
        const hasPartial = allItems.some(item => item.acceptance_status === 'partial');
        const allFull = allItems.every(item => item.acceptance_status === 'full');

        if (hasRejected && !allItems.some(item => item.acceptance_status === 'pending')) {
            overallStatus = 'rejected';
        } else if (allFull) {
            overallStatus = 'accepted';
        } else if (hasPartial || allItems.some(item => item.acceptance_status === 'pending')) {
            overallStatus = 'pending';
        }

        await connection.execute(
            'UPDATE orders SET orderStatus = ? WHERE orderID = ?',
            [overallStatus, orderID]
        );

        await connection.commit();
        return result.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        throw new Error(`Error updating order acceptance: ${error.message}`);
    } finally {
        connection.release();
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
            whereConditions.push('o.orderStatus = ?');
            params.push(status);
        }

        // Payment mode filter
        if (paymentMode && paymentMode !== 'all') {
            whereConditions.push('o.paymentMode = ?');
            params.push(paymentMode);
        }

        // Search filter (orderID, uid, userName, productName)
        if (search) {
            whereConditions.push('(o.orderID LIKE ? OR o.uid LIKE ? OR u.name LIKE ? OR o.productName LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Date range filter
        if (dateFrom) {
            whereConditions.push('DATE(o.createdAt) >= ?');
            params.push(dateFrom);
        }
        if (dateTo) {
            whereConditions.push('DATE(o.createdAt) <= ?');
            params.push(dateTo);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(DISTINCT o.orderID) as total 
            FROM orders o
            LEFT JOIN users u ON u.uid = o.uid
            ${whereClause.replace('orders', 'o')}
        `;
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total;

        // Get orders with pagination - add LIMIT and OFFSET to params
        const ordersQuery = `
            SELECT 
                o.orderID,
                MIN(o.uid) as uid,
                MIN(u.name) as userName,
                MIN(o.orderStatus) as orderStatus,
                MIN(o.paymentMode) as paymentMode,
                MIN(o.addressName) as addressName,
                MIN(o.addressCity) as addressCity,
                MIN(o.addressState) as addressState,
                MIN(o.createdAt) as createdAt,
                MIN(o.order_amount) as order_amount,
                SUM(o.requested_units) as total_requested,
                SUM(o.accepted_units) as total_accepted,
                COUNT(*) as items
            FROM orders o
            LEFT JOIN users u ON u.uid = o.uid
            ${whereClause.replace('orders', 'o')}
            GROUP BY o.orderID
            ORDER BY o.orderID DESC
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
            'SELECT units, productPrice FROM orders WHERE orderID = ?',
            [orderID]
        );

        let total = 0;
        for (const r of rows) {
            const qty = r.units || 0;
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


// Get orders by user ID (for admin edit user page)
async function getOrdersByUserId(uid) {
    try {
        const [rows] = await db.execute(
            `SELECT 
                orderID,
                MIN(createdAt) as createdAt,
                MIN(orderStatus) as orderStatus,
                MIN(paymentMode) as paymentMode,
                MIN(payment_status) as payment_status,
                MIN(payment_date) as payment_date,
                MIN(order_amount) as order_amount,
                SUM(requested_units) as total_requested,
                SUM(accepted_units) as total_accepted,
                COUNT(*) as items
            FROM orders 
            WHERE uid = ? 
            GROUP BY orderID 
            ORDER BY createdAt DESC`,
            [uid]
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching user orders: ${error.message}`);
    }
}

// Get order payment details
async function getOrderPayment(orderID) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM order_payments WHERE orderID = ? ORDER BY createdAt DESC',
            [orderID]
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching order payment: ${error.message}`);
    }
}

// Update paid amount for entire order
async function updateOrderPayment(orderID, paidAmount, adminUid, notes = '') {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get order details to calculate total amount
        const [orderRows] = await db.execute(
            'SELECT * FROM orders WHERE orderID = ?',
            [orderID]
        );

        if (orderRows.length === 0) {
            throw new Error('Order not found');
        }

        // Get total order amount (order_amount is the same for all items in an order)
        const totalOrderAmount = parseFloat(orderRows[0]?.order_amount || 0);
        const newPaidAmount = parseFloat(paidAmount);

        // Validate paid amount
        if (newPaidAmount < 0) {
            throw new Error('Paid amount cannot be negative');
        }
        if (newPaidAmount > totalOrderAmount) {
            throw new Error('Paid amount cannot exceed total order amount');
        }

        // Get current total paid amount
        const [paymentRows] = await connection.execute(
            'SELECT SUM(paid_amount) as total_paid FROM order_payments WHERE orderID = ?',
            [orderID]
        );
        const currentTotalPaid = parseFloat(paymentRows[0]?.total_paid || 0);
        const paidDifference = newPaidAmount - currentTotalPaid;

        // Insert or update payment record
        await connection.execute(
            'INSERT INTO order_payments (orderID, paid_amount, admin_uid, notes) VALUES (?, ?, ?, ?)',
            [orderID, newPaidAmount, adminUid, notes]
        );

        // Update payment status in orders table
        // Calculate total accumulated payments (including the new payment)
        const totalAccumulatedPayments = newPaidAmount; // newPaidAmount is the total amount to be paid

        let paymentStatus = 'not_paid';
        if (totalAccumulatedPayments >= totalOrderAmount) {
            paymentStatus = 'paid';
        } else if (totalAccumulatedPayments > 0) {
            paymentStatus = 'partially_paid';
        }

        await connection.execute(
            'UPDATE orders SET payment_status = ? WHERE orderID = ?',
            [paymentStatus, orderID]
        );

        // Update user outstanding if there's a difference
        if (paidDifference !== 0) {
            const uid = orderRows[0].uid;
            if (paidDifference > 0) {
                // Reduce outstanding (payment received)
                await subtractOutstanding(uid, paidDifference, connection);
            } else {
                // Increase outstanding (payment reversed)
                await addOutstanding(uid, Math.abs(paidDifference), connection);
            }
        }

        await connection.commit();
        return {
            success: true,
            paidAmount: newPaidAmount,
            totalOrderAmount: totalOrderAmount,
            outstandingChange: paidDifference
        };
    } catch (error) {
        await connection.rollback();
        throw new Error(`Error updating order payment: ${error.message}`);
    } finally {
        connection.release();
    }
}

module.exports = {
    createOrderFromCart,
    getOrdersByUser,
    getOrderById,
    updateOrderStatus,
    updateOrderAcceptance,
    getAllOrders,
    calculateOrderTotal,
    addOutstanding,
    subtractOutstanding,
    getOrdersByUserId,
    getOrderPayment,
    updateOrderPayment
};



