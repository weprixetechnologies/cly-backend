const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliateController');
const { verifyUserAccessToken } = require('../middleware/userAuthMiddleware');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Public routes
router.get('/resolve/:slug', affiliateController.resolveLink);

// User Auth Required routes
router.post('/attribute', verifyUserAccessToken, affiliateController.createAttribution);
// Affiliate User Routes
router.get('/me', verifyUserAccessToken, affiliateController.getMyAffiliateProfile);
router.post('/links', verifyUserAccessToken, affiliateController.createLink);
router.get('/links', verifyUserAccessToken, affiliateController.getMyLinks);
router.get('/commissions', verifyUserAccessToken, affiliateController.getMyCommissions);

// Admin Auth Required routes
// Check if admin auth exists, otherwise we will skip middleware or implement it. 
// Assuming it exists as `adminAuthMiddleware`.
router.get('/admin/settings', verifyAdminAccessToken, affiliateController.getSettings);
router.post('/admin/settings', verifyAdminAccessToken, affiliateController.updateSettings);
router.get('/admin/affiliates', verifyAdminAccessToken, affiliateController.getAllAffiliates);
router.patch('/admin/affiliates/:id/status', verifyAdminAccessToken, affiliateController.updateAffiliateStatus);
router.get('/admin/enroll-all', verifyAdminAccessToken, affiliateController.getUnenrolledUsers);
router.post('/admin/enroll-all', verifyAdminAccessToken, affiliateController.bulkEnrollUsersAsAffiliates);
router.post('/admin/enroll/:uid', verifyAdminAccessToken, affiliateController.enrollUserAsAffiliate);
router.get('/admin/commissions', verifyAdminAccessToken, affiliateController.getAllCommissions);
router.get('/admin/order-commission/:orderID', verifyAdminAccessToken, affiliateController.getOrderCommission);
router.get('/admin/payouts/pending', verifyAdminAccessToken, affiliateController.getPendingPayouts);
router.post('/admin/payouts', verifyAdminAccessToken, affiliateController.createPayout);

module.exports = router;
