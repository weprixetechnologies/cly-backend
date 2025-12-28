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
        const { uid, items, address, paymentMode, couponCode, customerComment, themeCategory } = orderData;

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
                'INSERT INTO orders (orderID, productID, productName, boxes, units, requested_units, accepted_units, acceptance_status, featuredImage, uid, orderStatus, addressName, addressPhone, addressLine1, addressLine2, addressCity, addressState, addressPincode, paymentMode, couponCode, order_amount, productPrice, pItemPrice, final_price, payment_status, payment_date, customer_comment, themeCategory)\n                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [orderID, productID, productName, requiredBoxes, units, units, 0, 'pending', featuredImage || '', uid, 'pending', deliveryName, deliveryPhone, address?.addressLine1 || '', address?.addressLine2 || '', address?.city || '', address?.state || '', address?.pincode || '', paymentMode || 'COD', couponCode || '', totalOrderAmount, productPrice, productPrice, productPrice, paymentStatus, paymentDate, customerComment || null, themeCategory || null]
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
            `SELECT 
                o.*, 
                u.name as userName, 
                p.sku, 
                p.inventory,
                (GREATEST(COALESCE(o.accepted_units, o.units, 0), 0) * o.pItemPrice) as itemTotal
            FROM orders o 
            LEFT JOIN users u ON u.uid = o.uid 
            LEFT JOIN products p ON p.productID = o.productID 
            WHERE o.orderID = ? 
            ORDER BY o.productID`,
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

// Update order with partial acceptance and optional custom price
async function updateOrderAcceptance(orderID, productID, acceptedUnits, adminNotes = '', customPrice = null) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get the requested units and current item prices for this product
        const [rows] = await connection.execute(
            'SELECT requested_units, pItemPrice, final_price FROM orders WHERE orderID = ? AND productID = ?',
            [orderID, productID]
        );

        if (rows.length === 0) {
            throw new Error('Order item not found');
        }

        const requestedUnits = rows[0].requested_units;
        const existingPrice = parseFloat(rows[0].pItemPrice || 0);
        let effectivePrice = rows[0].final_price != null ? parseFloat(rows[0].final_price) : existingPrice;

        // If a custom price is provided, override the effective price
        if (customPrice !== null && customPrice !== '' && !isNaN(customPrice)) {
            const parsedCustom = parseFloat(customPrice);
            if (parsedCustom < 0) {
                throw new Error('Custom price cannot be negative');
            }
            effectivePrice = parsedCustom;
        }
        let acceptanceStatus = 'pending';

        if (acceptedUnits === 0) {
            acceptanceStatus = 'rejected';
        } else if (acceptedUnits > requestedUnits) {
            acceptanceStatus = 'increased';
        } else if (acceptedUnits === requestedUnits) {
            acceptanceStatus = 'full';
        } else if (acceptedUnits < requestedUnits) {
            acceptanceStatus = 'partial';
        }

        // Update only the specific product in the order (item-level status)
        const [result] = await connection.execute(
            'UPDATE orders SET accepted_units = ?, acceptance_status = ?, admin_notes = ?, final_price = ? WHERE orderID = ? AND productID = ?',
            [acceptedUnits, acceptanceStatus, adminNotes, effectivePrice, orderID, productID]
        );

        // Recalculate order amount based on accepted units for all products in this order
        const [allOrderItems] = await connection.execute(
            'SELECT productID, accepted_units, final_price, pItemPrice FROM orders WHERE orderID = ?',
            [orderID]
        );

        let itemsTotal = 0;
        allOrderItems.forEach((item) => {
            const accepted = parseInt(item.accepted_units || 0);
            const price = item.final_price != null
                ? parseFloat(item.final_price)
                : parseFloat(item.pItemPrice || 0);
            if (Number.isFinite(accepted) && Number.isFinite(price)) {
                itemsTotal += accepted * price;
            }
        });

        // Get current shipping charge (per order, same for all rows)
        const [shippingRows] = await connection.execute(
            'SELECT shipping_charge FROM orders WHERE orderID = ? LIMIT 1',
            [orderID]
        );
        const shippingCharge = shippingRows.length > 0 ? parseFloat(shippingRows[0].shipping_charge || 0) : 0;
        const newOrderAmount = itemsTotal + (Number.isFinite(shippingCharge) ? shippingCharge : 0);

        // Update the order amount for all items in this order (includes shipping)
        await connection.execute(
            'UPDATE orders SET order_amount = ? WHERE orderID = ?',
            [newOrderAmount, orderID]
        );

        // Recalculate payment status based on new order amount
        const [paymentRows] = await connection.execute(
            'SELECT SUM(paid_amount) as total_paid FROM order_payments WHERE orderID = ?',
            [orderID]
        );
        const currentTotalPaid = parseFloat(paymentRows[0]?.total_paid || 0);

        let paymentStatus = 'not_paid';
        if (currentTotalPaid >= newOrderAmount && newOrderAmount > 0) {
            paymentStatus = 'paid';
        } else if (currentTotalPaid > 0) {
            paymentStatus = 'partially_paid';
        }

        await connection.execute(
            'UPDATE orders SET payment_status = ? WHERE orderID = ?',
            [paymentStatus, orderID]
        );

        // IMPORTANT: Do NOT change overall orderStatus here.
        // Order status (pending/accepted/rejected) will be controlled explicitly
        // via the /admin/:orderID/status endpoint, not inferred from item-level acceptance.

        await connection.commit();
        return {
            success: true,
            affectedRows: result.affectedRows,
            newOrderAmount: newOrderAmount,
            paymentStatus: paymentStatus
        };
    } catch (error) {
        await connection.rollback();
        throw new Error(`Error updating order acceptance: ${error.message}`);
    } finally {
        connection.release();
    }
}

// Update order remarks
async function updateOrderRemarks(orderID, remarks, remarksPhotos = null) {
    try {
        let query = 'UPDATE orders SET remarks = ?';
        let params = [remarks];

        if (remarksPhotos !== null) {
            query += ', remarks_photos = ?';
            params.push(JSON.stringify(remarksPhotos));
        }

        query += ' WHERE orderID = ?';
        params.push(orderID);

        const [result] = await db.execute(query, params);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating order remarks: ${error.message}`);
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


// Calculate total amount for an order (items + shipping)
async function calculateOrderTotal(orderID) {
    try {
        // order_amount is stored per row but identical for all rows of an order
        const [rows] = await db.execute(
            'SELECT order_amount FROM orders WHERE orderID = ? LIMIT 1',
            [orderID]
        );
        if (!rows || rows.length === 0) return 0;
        return Number(Number(rows[0].order_amount || 0).toFixed(2));
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

// Update shipping charge for an order and recompute totals
async function updateOrderShipping(orderID, shippingCharge) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const charge = Number(shippingCharge || 0);
        if (!Number.isFinite(charge) || charge < 0) {
            throw new Error('Invalid shipping charge');
        }

        // Recalculate items total using accepted units and final_price (fallback to pItemPrice)
        const [items] = await connection.execute(
            'SELECT accepted_units, final_price, pItemPrice FROM orders WHERE orderID = ?',
            [orderID]
        );
        if (!items || items.length === 0) {
            throw new Error('Order not found');
        }

        let itemsTotal = 0;
        items.forEach((row) => {
            const qty = parseInt(row.accepted_units || 0);
            const price = row.final_price != null
                ? parseFloat(row.final_price)
                : parseFloat(row.pItemPrice || 0);
            if (Number.isFinite(qty) && Number.isFinite(price)) {
                itemsTotal += qty * price;
            }
        });

        const newOrderAmount = itemsTotal + charge;

        // Update shipping_charge and order_amount
        await connection.execute(
            'UPDATE orders SET shipping_charge = ?, order_amount = ? WHERE orderID = ?',
            [charge, newOrderAmount, orderID]
        );

        // Recalculate payment status based on new order amount
        const [paymentRows] = await connection.execute(
            'SELECT SUM(paid_amount) as total_paid FROM order_payments WHERE orderID = ?',
            [orderID]
        );
        const currentTotalPaid = parseFloat(paymentRows[0]?.total_paid || 0);

        let paymentStatus = 'not_paid';
        if (currentTotalPaid >= newOrderAmount && newOrderAmount > 0) {
            paymentStatus = 'paid';
        } else if (currentTotalPaid > 0) {
            paymentStatus = 'partially_paid';
        }

        await connection.execute(
            'UPDATE orders SET payment_status = ? WHERE orderID = ?',
            [paymentStatus, orderID]
        );

        await connection.commit();
        return {
            success: true,
            orderAmount: newOrderAmount,
            paymentStatus
        };
    } catch (error) {
        await connection.rollback();
        throw new Error(`Error updating order shipping: ${error.message}`);
    } finally {
        connection.release();
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

// Get detailed orders by user ID (for user profile page with item details)
async function getDetailedOrdersByUser(uid) {
    try {
        const [rows] = await db.execute(
            `SELECT 
                o.*,
                p.sku,
                (GREATEST(COALESCE(o.accepted_units, o.units, 0), 0) * o.pItemPrice) as itemTotal
            FROM orders o 
            LEFT JOIN products p ON p.productID = o.productID 
            WHERE o.uid = ? 
            ORDER BY o.orderID DESC, o.productID`,
            [uid]
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching detailed user orders: ${error.message}`);
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

        // Treat newPaidAmount as the amount of THIS payment (delta), not total-to-date.
        if (newPaidAmount < 0) {
            throw new Error('Paid amount cannot be negative');
        }

        // Get current total paid amount
        const [paymentRows] = await connection.execute(
            'SELECT SUM(paid_amount) as total_paid FROM order_payments WHERE orderID = ?',
            [orderID]
        );
        const currentTotalPaid = parseFloat(paymentRows[0]?.total_paid || 0);

        // Make sure we don't exceed total order amount
        if (currentTotalPaid + newPaidAmount > totalOrderAmount) {
            throw new Error('Paid amount cannot exceed total order amount');
        }

        // Insert this payment as a new entry (delta)
        if (newPaidAmount !== 0) {
            await connection.execute(
                'INSERT INTO order_payments (orderID, paid_amount, admin_uid, notes) VALUES (?, ?, ?, ?)',
                [orderID, newPaidAmount, adminUid, notes]
            );
        }

        // Update payment status in orders table based on accumulated payments
        const totalAccumulatedPayments = currentTotalPaid + newPaidAmount;

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

        // Update user outstanding based on this payment
        if (newPaidAmount !== 0) {
            const uid = orderRows[0].uid;
            // Payment received -> reduce outstanding
            await subtractOutstanding(uid, newPaidAmount, connection);
        }

        await connection.commit();
        return {
            success: true,
            paidAmount: newPaidAmount,
            totalOrderAmount: totalOrderAmount,
            outstandingChange: newPaidAmount
        };
    } catch (error) {
        await connection.rollback();
        throw new Error(`Error updating order payment: ${error.message}`);
    } finally {
        connection.release();
    }
}

// Update specific payment entry
async function updatePaymentEntry(orderID, paymentId, paidAmount, adminUid, notes = '') {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get order details to calculate total amount
        const [orderRows] = await connection.execute(
            'SELECT * FROM orders WHERE orderID = ?',
            [orderID]
        );

        if (orderRows.length === 0) {
            throw new Error('Order not found');
        }

        const totalOrderAmount = parseFloat(orderRows[0]?.order_amount || 0);
        const newPaidAmount = parseFloat(paidAmount);

        // Validate paid amount
        if (newPaidAmount < 0) {
            throw new Error('Paid amount cannot be negative');
        }
        if (newPaidAmount > totalOrderAmount) {
            throw new Error('Paid amount cannot exceed total order amount');
        }

        // Get the old payment amount
        const [oldPaymentRows] = await connection.execute(
            'SELECT paid_amount FROM order_payments WHERE id = ? AND orderID = ?',
            [paymentId, orderID]
        );

        if (oldPaymentRows.length === 0) {
            throw new Error('Payment entry not found');
        }

        const oldPaidAmount = parseFloat(oldPaymentRows[0].paid_amount);
        const paidDifference = newPaidAmount - oldPaidAmount;

        // Update the payment entry
        await connection.execute(
            'UPDATE order_payments SET paid_amount = ?, notes = ?, admin_uid = ?, updatedAt = NOW() WHERE id = ? AND orderID = ?',
            [newPaidAmount, notes, adminUid, paymentId, orderID]
        );

        // Recalculate payment status
        const [paymentRows] = await connection.execute(
            'SELECT SUM(paid_amount) as total_paid FROM order_payments WHERE orderID = ?',
            [orderID]
        );
        const totalAccumulatedPayments = parseFloat(paymentRows[0]?.total_paid || 0);

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
                // Reduce outstanding (payment increased)
                await subtractOutstanding(uid, paidDifference, connection);
            } else {
                // Increase outstanding (payment decreased)
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
        throw new Error(`Error updating payment entry: ${error.message}`);
    } finally {
        connection.release();
    }
}

// Delete specific payment entry
async function deletePaymentEntry(orderID, paymentId, adminUid) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get order details
        const [orderRows] = await connection.execute(
            'SELECT * FROM orders WHERE orderID = ?',
            [orderID]
        );

        if (orderRows.length === 0) {
            throw new Error('Order not found');
        }

        const totalOrderAmount = parseFloat(orderRows[0]?.order_amount || 0);

        // Get the payment amount to be deleted
        const [paymentRows] = await connection.execute(
            'SELECT paid_amount FROM order_payments WHERE id = ? AND orderID = ?',
            [paymentId, orderID]
        );

        if (paymentRows.length === 0) {
            throw new Error('Payment entry not found');
        }

        const deletedAmount = parseFloat(paymentRows[0].paid_amount);

        // Delete the payment entry
        await connection.execute(
            'DELETE FROM order_payments WHERE id = ? AND orderID = ?',
            [paymentId, orderID]
        );

        // Recalculate payment status
        const [remainingPayments] = await connection.execute(
            'SELECT SUM(paid_amount) as total_paid FROM order_payments WHERE orderID = ?',
            [orderID]
        );
        const totalAccumulatedPayments = parseFloat(remainingPayments[0]?.total_paid || 0);

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

        // Update user outstanding (increase by deleted amount)
        const uid = orderRows[0].uid;
        await addOutstanding(uid, deletedAmount, connection);

        await connection.commit();
        return {
            success: true,
            deletedAmount: deletedAmount,
            totalOrderAmount: totalOrderAmount,
            outstandingChange: deletedAmount
        };
    } catch (error) {
        await connection.rollback();
        throw new Error(`Error deleting payment entry: ${error.message}`);
    } finally {
        connection.release();
    }
}

// Get user statistics (total orders amount, paid, remaining balance)
async function getUserStatistics(uid) {
    try {
        // Get total orders amount (sum of all order amounts)
        const [totalOrdersAmountResult] = await db.execute(
            'SELECT SUM(order_amount) as totalOrdersAmount FROM orders WHERE uid = ?',
            [uid]
        );
        const totalOrdersAmount = totalOrdersAmountResult[0]?.totalOrdersAmount || 0;

        // Get total paid amount from order_payments table
        const [paidResult] = await db.execute(
            `SELECT SUM(op.paid_amount) as totalPaid 
             FROM order_payments op 
             INNER JOIN orders o ON o.orderID = op.orderID 
             WHERE o.uid = ?`,
            [uid]
        );
        const totalPaid = paidResult[0]?.totalPaid || 0;

        // Calculate remaining amount (total orders amount - total paid)
        const remainingAmount = Math.max(0, totalOrdersAmount - totalPaid);

        return {
            totalOrdersAmount: parseFloat(totalOrdersAmount),
            totalPaid: parseFloat(totalPaid),
            remainingAmount: parseFloat(remainingAmount)
        };
    } catch (error) {
        throw new Error(`Error fetching user statistics: ${error.message}`);
    }
}

// Get comprehensive order statistics for admin
async function getOrderStatistics(filters = {}) {
    try {
        const {
            dateFrom = '',
            dateTo = '',
            status = 'all',
            paymentMode = 'all'
        } = filters;

        const params = [];
        let whereConditions = [];

        // Date range filter
        if (dateFrom) {
            whereConditions.push('DATE(o.createdAt) >= ?');
            params.push(dateFrom);
        }
        if (dateTo) {
            whereConditions.push('DATE(o.createdAt) <= ?');
            params.push(dateTo);
        }

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

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total orders count
        const [totalOrdersResult] = await db.execute(
            `SELECT COUNT(DISTINCT o.orderID) as totalOrders FROM orders o ${whereClause}`,
            params
        );
        const totalOrders = totalOrdersResult[0]?.totalOrders || 0;

        // Get orders by status
        const [statusStatsResult] = await db.execute(
            `SELECT 
                o.orderStatus,
                COUNT(DISTINCT o.orderID) as count,
                SUM(o.order_amount) as totalAmount
            FROM orders o 
            ${whereClause}
            GROUP BY o.orderStatus`,
            params
        );

        const statusStats = {};
        statusStatsResult.forEach(stat => {
            statusStats[stat.orderStatus] = {
                count: parseInt(stat.count),
                totalAmount: parseFloat(stat.totalAmount || 0)
            };
        });

        // Get total order amount
        const [totalAmountResult] = await db.execute(
            `SELECT SUM(o.order_amount) as totalAmount FROM orders o ${whereClause}`,
            params
        );
        const totalAmount = totalAmountResult[0]?.totalAmount || 0;

        // Get pending amount (not_paid + partially_paid)
        const pendingWhereConditions = [...whereConditions];
        const pendingParams = [...params];
        pendingWhereConditions.push("o.payment_status IN ('not_paid', 'partially_paid')");
        const pendingWhereClause = pendingWhereConditions.length > 0 ? `WHERE ${pendingWhereConditions.join(' AND ')}` : '';

        const [pendingAmountResult] = await db.execute(
            `SELECT SUM(o.order_amount) as pendingAmount 
             FROM orders o 
             ${pendingWhereClause}`,
            pendingParams
        );
        const pendingAmount = pendingAmountResult[0]?.pendingAmount || 0;

        // Get paid amount
        const paidWhereConditions = [...whereConditions];
        const paidParams = [...params];
        paidWhereConditions.push("o.payment_status = 'paid'");
        const paidWhereClause = paidWhereConditions.length > 0 ? `WHERE ${paidWhereConditions.join(' AND ')}` : '';

        const [paidAmountResult] = await db.execute(
            `SELECT SUM(o.order_amount) as paidAmount 
             FROM orders o 
             ${paidWhereClause}`,
            paidParams
        );
        const paidAmount = paidAmountResult[0]?.paidAmount || 0;

        // Get partially paid amount
        const partiallyPaidWhereConditions = [...whereConditions];
        const partiallyPaidParams = [...params];
        partiallyPaidWhereConditions.push("o.payment_status = 'partially_paid'");
        const partiallyPaidWhereClause = partiallyPaidWhereConditions.length > 0 ? `WHERE ${partiallyPaidWhereConditions.join(' AND ')}` : '';

        const [partiallyPaidResult] = await db.execute(
            `SELECT SUM(o.order_amount) as partiallyPaidAmount 
             FROM orders o 
             ${partiallyPaidWhereClause}`,
            partiallyPaidParams
        );
        const partiallyPaidAmount = partiallyPaidResult[0]?.partiallyPaidAmount || 0;

        // Get orders by payment mode
        const [paymentModeStatsResult] = await db.execute(
            `SELECT 
                o.paymentMode,
                COUNT(DISTINCT o.orderID) as count,
                SUM(o.order_amount) as totalAmount
            FROM orders o 
            ${whereClause}
            GROUP BY o.paymentMode`,
            params
        );

        const paymentModeStats = {};
        paymentModeStatsResult.forEach(stat => {
            paymentModeStats[stat.paymentMode] = {
                count: parseInt(stat.count),
                totalAmount: parseFloat(stat.totalAmount || 0)
            };
        });

        // Get recent orders (last 7 days)
        const recentWhereConditions = [...whereConditions];
        const recentParams = [...params];
        recentWhereConditions.push("o.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        const recentWhereClause = recentWhereConditions.length > 0 ? `WHERE ${recentWhereConditions.join(' AND ')}` : '';

        const [recentOrdersResult] = await db.execute(
            `SELECT COUNT(DISTINCT o.orderID) as recentOrders 
             FROM orders o 
             ${recentWhereClause}`,
            recentParams
        );
        const recentOrders = recentOrdersResult[0]?.recentOrders || 0;

        // Get average order value
        const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;

        // Get top products by order count
        const [topProductsResult] = await db.execute(
            `SELECT 
                o.productName,
                COUNT(DISTINCT o.orderID) as orderCount,
                SUM(o.units) as totalUnits,
                SUM(o.order_amount) as totalAmount
            FROM orders o 
            ${whereClause}
            GROUP BY o.productID, o.productName
            ORDER BY orderCount DESC
            LIMIT 5`,
            params
        );

        return {
            overview: {
                totalOrders: parseInt(totalOrders),
                totalAmount: parseFloat(totalAmount),
                pendingAmount: parseFloat(pendingAmount),
                paidAmount: parseFloat(paidAmount),
                partiallyPaidAmount: parseFloat(partiallyPaidAmount),
                averageOrderValue: parseFloat(averageOrderValue),
                recentOrders: parseInt(recentOrders)
            },
            statusBreakdown: statusStats,
            paymentModeBreakdown: paymentModeStats,
            topProducts: topProductsResult.map(product => ({
                productName: product.productName,
                orderCount: parseInt(product.orderCount),
                totalUnits: parseInt(product.totalUnits),
                totalAmount: parseFloat(product.totalAmount)
            }))
        };
    } catch (error) {
        throw new Error(`Error fetching order statistics: ${error.message}`);
    }
}

module.exports = {
    createOrderFromCart,
    getOrdersByUser,
    getOrderById,
    updateOrderStatus,
    updateOrderAcceptance,
    updateOrderRemarks,
    getAllOrders,
    calculateOrderTotal,
    addOutstanding,
    subtractOutstanding,
    getOrdersByUserId,
    getDetailedOrdersByUser,
    getOrderPayment,
    updateOrderPayment,
    updatePaymentEntry,
    deletePaymentEntry,
    getUserStatistics,
    getOrderStatistics,
    updateOrderShipping
};



