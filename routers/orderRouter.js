const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyUserAccessToken } = require('../middleware/userAuthMiddleware');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Apply authentication middleware to all routes
router.use('/user', verifyUserAccessToken);
router.use('/admin', verifyAdminAccessToken);

// User order routes
router.post('/user/:uid/place-order', orderController.placeOrder);
router.get('/user/:uid/orders', orderController.getOrders);
router.get('/user/:orderID', orderController.getOrderById);
router.put('/user/:orderID/status', orderController.updateOrderStatus);

// Admin order routes
// list all orders with filters and pagination: /api/order/admin?status=pending|accepted|rejected|all&page=1&limit=10&search=term&paymentMode=COD&dateFrom=2024-01-01&dateTo=2024-12-31
router.get('/admin', async (req, res) => {
    try {
        const filters = {
            status: req.query.status || 'all',
            page: req.query.page || 1,
            limit: req.query.limit || 10,
            search: req.query.search || '',
            paymentMode: req.query.paymentMode || 'all',
            dateFrom: req.query.dateFrom || '',
            dateTo: req.query.dateTo || ''
        };

        const result = await require('../models/orderModel').getAllOrders(filters);
        return res.status(200).json({
            success: true,
            data: result.orders,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('[orderRouter] /admin list error:', error.message);
        // Return 200 with error payload to avoid UI hard failure, surface message to client
        return res.status(200).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message,
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        });
    }
});

// update status by orderID
router.put('/admin/:orderID/status', async (req, res) => {
    try {
        const { orderID } = req.params;
        const { orderStatus } = req.body || {};
        if (!orderStatus) return res.status(200).json({ success: false, message: 'orderStatus is required' });
        const allowed = ['pending', 'accepted', 'rejected'];
        if (!allowed.includes(String(orderStatus))) {
            return res.status(200).json({ success: false, message: 'Invalid orderStatus value' });
        }
        const orderModel = require('../models/orderModel');
        // Read previous status before update
        const before = await orderModel.getOrderById(orderID);
        const previousStatus = before?.[0]?.orderStatus;

        const ok = await orderModel.updateOrderStatus(orderID, orderStatus);
        if (!ok) return res.status(200).json({ success: false, message: 'Failed to update order status' });

        // On accept, add order total to user's outstanding
        if (orderStatus === 'accepted' && previousStatus !== 'accepted') {
            try {
                const items = await orderModel.getOrderById(orderID);
                const uid = items?.[0]?.uid;
                if (uid) {
                    const total = await orderModel.calculateOrderTotal(orderID);
                    await orderModel.addOutstanding(uid, total);
                }
            } catch (e) {
                console.error('[orderRouter] outstanding update failed:', e.message);
                // proceed without failing request
            }
        }

        // If forcing from accepted -> rejected, subtract outstanding (use captured previousStatus)
        if (orderStatus === 'rejected' && previousStatus === 'accepted') {
            try {
                const items = await orderModel.getOrderById(orderID);
                const uid = items?.[0]?.uid;
                if (uid) {
                    const total = await orderModel.calculateOrderTotal(orderID);
                    await orderModel.subtractOutstanding(uid, total);
                }
            } catch (e) {
                console.error('[orderRouter] outstanding decrease failed:', e.message);
                // proceed without failing request
            }
        }
        return res.status(200).json({ success: true, message: 'Order status updated' });
    } catch (error) {
        console.error('[orderRouter] /admin/:orderID/status error:', error.message);
        return res.status(200).json({ success: false, message: 'Failed to update order status', error: error.message });
    }
});

// Admin: get single order details by orderID
router.get('/admin/:orderID', async (req, res) => {
    try {
        const { orderID } = req.params;
        const orderRows = await require('../models/orderModel').getOrderById(orderID);
        if (!orderRows || orderRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        return res.status(200).json({ success: true, data: orderRows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
    }
});

module.exports = router;

