const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyUserAccessToken } = require('../middleware/userAuthMiddleware');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');
const smsService = require('../services/smsService');

// Apply authentication middleware to all routes
router.use('/user', verifyUserAccessToken);
router.use('/admin', verifyAdminAccessToken);

// User order routes
router.post('/user/:uid/place-order', orderController.placeOrder);
router.get('/user/:uid/orders', orderController.getOrders);
router.get('/user/:uid/orders/detailed', orderController.getDetailedOrders);
router.get('/user/:orderID', orderController.getOrderById);
router.get('/user/:orderID/payment', orderController.getOrderPayment);
router.put('/user/:orderID/status', orderController.updateOrderStatus);

// Admin order routes

// Get order statistics (must come before /admin/:orderID routes)
router.get('/admin/statistics', async (req, res) => {
    try {
        const filters = {
            status: req.query.status || 'all',
            paymentMode: req.query.paymentMode || 'all',
            dateFrom: req.query.dateFrom || '',
            dateTo: req.query.dateTo || ''
        };

        const orderModel = require('../models/orderModel');
        const statistics = await orderModel.getOrderStatistics(filters);

        res.status(200).json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('[orderRouter] /admin/statistics error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order statistics',
            error: error.message
        });
    }
});

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
                console.error('[orderRouter] accept side-effects failed:', e.message);
                // proceed without failing request
            }
        }

        // If forcing from accepted -> rejected, subtract outstanding
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

// Admin: update order with partial acceptance
router.put('/admin/acceptance', async (req, res) => {
    try {
        const { orderID, productID, acceptedUnits, adminNotes, customPrice } = req.body;

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

        const orderModel = require('../models/orderModel');
        // Disallow edits when order is accepted
        const statusRows = await orderModel.getOrderById(orderID);
        const currentStatus = String(statusRows?.[0]?.orderStatus || 'pending');
        if (currentStatus === 'accepted') {
            return res.status(200).json({ success: false, message: 'Order is accepted. Change status to pending to edit.' });
        }
        const result = await orderModel.updateOrderAcceptance(
            orderID,
            productID,
            parseInt(acceptedUnits),
            adminNotes || '',
            customPrice !== undefined && customPrice !== null && customPrice !== '' ? parseFloat(customPrice) : null
        );

        if (result) {
            return res.status(200).json({
                success: true,
                message: 'Order acceptance updated successfully'
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Order item not found'
            });
        }
    } catch (error) {
        console.error('[orderRouter] /admin/acceptance error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to update order acceptance',
            error: error.message
        });
    }
});

// Update paid amount for entire order
router.put('/admin/:orderID/payment', orderController.updateOrderPayment);

// Update shipping charge for entire order
router.put('/admin/:orderID/shipping', orderController.updateOrderShipping);

// Get order payment details
router.get('/admin/:orderID/payment', orderController.getOrderPayment);

// Update specific payment entry
router.put('/admin/:orderID/payment/:paymentId', orderController.updatePaymentEntry);

// Delete specific payment entry
router.delete('/admin/:orderID/payment/:paymentId', orderController.deletePaymentEntry);

// Update order remarks
router.put('/admin/:orderID/remarks', orderController.updateOrderRemarks);

// ─── Dispatch Order ───────────────────────────────────────────────────────────
// POST /api/order/admin/:orderID/dispatch
// Body: { trackingLink: string, awbNumber?: string, companyName?: string }
//
// Admin enters these 3 fields from the panel:
//   - trackingLink  → the full tracking URL sent in the SMS
//   - awbNumber     → the courier tracking / AWB code (saved for records)
//   - companyName   → the courier company name      (saved for records)
//
// Sets orderStatus → 'dispatched', saves all three fields in admin_notes,
// and fires the approved dispatch SMS with the trackingLink.
router.post('/admin/:orderID/dispatch', async (req, res) => {
    try {
        const { orderID } = req.params;
        const { trackingLink, awbNumber, companyName } = req.body || {};

        if (!trackingLink) {
            return res.status(400).json({
                success: false,
                message: 'trackingLink is required'
            });
        }

        const orderModel = require('../models/orderModel');
        const rows = await orderModel.getOrderById(orderID);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const firstItem = rows[0];
        const uid       = firstItem.uid;
        const addrPhone = firstItem.addressPhone;

        // Save details to the new columns in the orders table
        const db = require('../utils/dbconnect');
        await db.execute(
            `UPDATE orders 
             SET isDispatched = 1, 
                 awbNumber = ?, 
                 companyName = ?, 
                 trackingLink = ? 
             WHERE orderID = ?`,
            [awbNumber || null, companyName || null, trackingLink, orderID]
        );


        // ── Send Dispatch SMS (non-blocking) ─────────────────────────────────
        // DLT Template: "Dear {name}, Your order {orderID} has been dispatched
        //                and is on its way. Track your shipment here: {trackingLink}.
        //                Thank you for shopping with us. Cursive Letters LY"
        try {
            const authModel = require('../models/authModel');
            const userRecord = await authModel.getUserByUID(uid);
            const customerPhone = addrPhone || userRecord?.phoneNumber;
            const customerName  = userRecord?.name || userRecord?.username || 'Customer';

            if (customerPhone) {
                smsService.sendDispatchSMS(customerPhone, customerName, orderID, awbNumber || trackingLink)
                    .then(r => r.success
                        ? console.log(`[SMS] ✅ Dispatch SMS sent for ${orderID}`)
                        : console.warn(`[SMS] ⚠️  Dispatch SMS failed: ${r.error}`)
                    )
                    .catch(e => console.warn('[SMS] ⚠️  Dispatch SMS error:', e.message));
            } else {
                console.warn(`[SMS] No phone number found for order ${orderID} — dispatch SMS skipped`);
            }
        } catch (smsErr) {
            console.warn('[SMS] Dispatch SMS setup error (non-fatal):', smsErr.message);
        }
        // ─────────────────────────────────────────────────────────────────────

        return res.status(200).json({
            success: true,
            message: 'Order dispatched and SMS sent',
            data: { orderID, trackingLink, awbNumber: awbNumber || null, companyName: companyName || null }
        });
    } catch (error) {
        console.error('[orderRouter] /admin/:orderID/dispatch error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to dispatch order',
            error: error.message
        });
    }
});

// Manual trigger for sending/resending dispatch SMS
router.post('/admin/:orderID/send-dispatch-sms', async (req, res) => {
    try {
        const { orderID } = req.params;
        const orderModel = require('../models/orderModel');
        const rows = await orderModel.getOrderById(orderID);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const firstItem = rows[0];
        const uid       = firstItem.uid;
        const addrPhone = firstItem.addressPhone;
        const trackingLink = firstItem.trackingLink;
        const awbNumber = firstItem.awbNumber;

        if (!firstItem.isDispatched || (!awbNumber && !trackingLink)) {
            return res.status(400).json({
                success: false,
                message: 'Order has not been dispatched yet. Please dispatch it first.'
            });
        }

        const authModel = require('../models/authModel');
        const userRecord = await authModel.getUserByUID(uid);
        const customerPhone = addrPhone || userRecord?.phoneNumber;
        const customerName  = userRecord?.name || userRecord?.username || 'Customer';

        if (!customerPhone) {
            return res.status(400).json({
                success: false,
                message: 'No mobile phone number linked to this order/account.'
            });
        }

        console.log(`[SMS] Manually triggering dispatch SMS for order ${orderID} to ${customerPhone}`);
        const smsResult = await smsService.sendDispatchSMS(customerPhone, customerName, orderID, awbNumber || trackingLink);

        if (smsResult.success) {
            return res.status(200).json({
                success: true,
                message: `Dispatch SMS sent successfully! (JobId: ${smsResult.jobId})`
            });
        } else {
            return res.status(500).json({
                success: false,
                message: `Gateway returned error: ${smsResult.error || 'Unknown failure'}`
            });
        }
    } catch (error) {
        console.error('[orderRouter] /admin/:orderID/send-dispatch-sms error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to send dispatch SMS',
            error: error.message
        });
    }
});

module.exports = router;



