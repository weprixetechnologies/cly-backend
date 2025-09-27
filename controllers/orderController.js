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

        const { orderID } = await orderModel.createOrderFromCart(uid, items);

        if (shouldClear) {
            try { await cartModel.clearCart(uid); } catch (_) { }
        }

        return res.status(201).json({ success: true, message: 'Order created', data: { orderID } });
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

module.exports = {
    placeOrder,
    getOrders,
    getOrderById,
    updateOrderStatus
};


