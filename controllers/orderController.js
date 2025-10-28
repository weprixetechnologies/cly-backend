const orderModel = require('../models/orderModel');
const cartModel = require('../models/cartModel');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// POST /:uid/place-order
// Creates an order from provided items or from the user's cart
const placeOrder = async (req, res) => {
    try {
        const { uid } = req.params;

        // Ensure the authenticated user matches the uid in params
        if (!req.user || req.user.uid !== uid) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Accept items from body; if not provided, fallback to cart
        let items = Array.isArray(req.body?.items) ? req.body.items : null;
        const shouldClear = req.body?.clear !== false; // default true

        if (!items) {
            const cart = await cartModel.getCartByUser(uid);
            items = cart.items || [];
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items to place order' });
        }

        // Extract order details from request body
        const { address, paymentMode, couponCode } = req.body;

        // Validate required fields
        if (!address) {
            return res.status(400).json({ success: false, message: 'Delivery address is required' });
        }

        if (!paymentMode) {
            return res.status(400).json({ success: false, message: 'Payment mode is required' });
        }

        const orderData = {
            uid,
            items,
            address,
            paymentMode,
            couponCode: couponCode || null
        };

        const { orderID } = await orderModel.createOrderFromCart(orderData);

        if (shouldClear) {
            try { await cartModel.clearCart(uid); } catch (_) { }
        }

        return res.status(201).json({
            success: true,
            message: 'Order created',
            data: {
                orderID,
                paymentMode: paymentMode
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to place order', error: error.message });
    }
};

// GET /:uid/orders
const getOrders = async (req, res) => {
    try {
        const { uid } = req.params;

        if (!req.user || req.user.uid !== uid) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const orders = await orderModel.getOrdersByUser(uid);
        return res.status(200).json({ success: true, data: orders });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
    }
};

// GET /:uid/orders/detailed
const getDetailedOrders = async (req, res) => {
    try {
        const { uid } = req.params;

        if (!req.user || req.user.uid !== uid) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const orders = await orderModel.getDetailedOrdersByUser(uid);
        return res.status(200).json({ success: true, data: orders });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch detailed orders', error: error.message });
    }
};

// GET /:orderID
const getOrderById = async (req, res) => {
    try {
        const { orderID } = req.params;

        const rows = await orderModel.getOrderById(orderID);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Ensure the requester owns this order
        const orderOwnerUid = rows[0].uid;
        if (!req.user || req.user.uid !== orderOwnerUid) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
    }
};

// PUT /:orderID/status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderID } = req.params;
        const { orderStatus } = req.body || {};

        if (!orderStatus) {
            return res.status(400).json({ success: false, message: 'orderStatus is required' });
        }

        // Only order owner can update, for now.
        const rows = await orderModel.getOrderById(orderID);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const orderOwnerUid = rows[0].uid;
        if (!req.user || req.user.uid !== orderOwnerUid) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const ok = await orderModel.updateOrderStatus(orderID, orderStatus);
        if (!ok) {
            return res.status(400).json({ success: false, message: 'Failed to update order status' });
        }
        return res.status(200).json({ success: true, message: 'Order status updated' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update order status', error: error.message });
    }
};

// Update order with partial acceptance
const updateOrderAcceptance = async (req, res) => {
    try {
        const { orderID, productID, acceptedUnits, adminNotes } = req.body;

        if (!orderID || !productID || acceptedUnits === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Order ID, Product ID, and accepted units are required'
            });
        }

        if (acceptedUnits < 0) {
            return res.status(400).json({
                success: false,
                message: 'Accepted units cannot be negative'
            });
        }

        const result = await orderModel.updateOrderAcceptance(
            orderID,
            productID,
            parseInt(acceptedUnits),
            adminNotes || ''
        );

        if (result && result.success) {
            return res.status(200).json({
                success: true,
                message: 'Order acceptance updated successfully',
                data: {
                    newOrderAmount: result.newOrderAmount,
                    paymentStatus: result.paymentStatus
                }
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }
    } catch (error) {
        console.error('[orderController] updateOrderAcceptance error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update order acceptance',
            error: error.message
        });
    }
};

// Update paid amount for entire order
const updateOrderPayment = async (req, res) => {
    try {
        const { orderID } = req.params;
        const { paidAmount, notes } = req.body;
        const adminUid = req.user.uid;

        if (!orderID) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        if (!paidAmount || isNaN(parseFloat(paidAmount))) {
            return res.status(400).json({
                success: false,
                message: 'Valid paid amount is required'
            });
        }

        const result = await orderModel.updateOrderPayment(orderID, paidAmount, adminUid, notes || '');

        res.status(200).json({
            success: true,
            message: 'Order payment updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Update order payment error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update order payment',
            error: error.message
        });
    }
};

// Get order payment details
const getOrderPayment = async (req, res) => {
    try {
        const { orderID } = req.params;

        if (!orderID) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const payments = await orderModel.getOrderPayment(orderID);

        res.status(200).json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error('Get order payment error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order payment',
            error: error.message
        });
    }
};

// Update order remarks
const updateOrderRemarks = async (req, res) => {
    try {
        const { orderID } = req.params;
        const { remarks } = req.body;

        if (!orderID) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const updated = await orderModel.updateOrderRemarks(orderID, remarks || '');

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order remarks updated successfully'
        });
    } catch (error) {
        console.error('Update order remarks error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update order remarks',
            error: error.message
        });
    }
};

// Update specific payment entry
const updatePaymentEntry = async (req, res) => {
    try {
        const { orderID, paymentId } = req.params;
        const { paidAmount, notes } = req.body;
        const adminUid = req.user.uid;

        if (!orderID || !paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Payment ID are required'
            });
        }

        if (!paidAmount || isNaN(parseFloat(paidAmount))) {
            return res.status(400).json({
                success: false,
                message: 'Valid paid amount is required'
            });
        }

        const result = await orderModel.updatePaymentEntry(orderID, paymentId, paidAmount, adminUid, notes || '');

        res.status(200).json({
            success: true,
            message: 'Payment entry updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Update payment entry error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment entry',
            error: error.message
        });
    }
};

// Delete specific payment entry
const deletePaymentEntry = async (req, res) => {
    try {
        const { orderID, paymentId } = req.params;
        const adminUid = req.user.uid;

        if (!orderID || !paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Payment ID are required'
            });
        }

        const result = await orderModel.deletePaymentEntry(orderID, paymentId, adminUid);

        res.status(200).json({
            success: true,
            message: 'Payment entry deleted successfully',
            data: result
        });
    } catch (error) {
        console.error('Delete payment entry error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete payment entry',
            error: error.message
        });
    }
};

module.exports = {
    placeOrder,
    getOrders,
    getDetailedOrders,
    getOrderById,
    updateOrderStatus,
    updateOrderAcceptance,
    updateOrderPayment,
    getOrderPayment,
    updateOrderRemarks,
    updatePaymentEntry,
    deletePaymentEntry
};


