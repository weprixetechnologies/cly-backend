const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagementController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Apply admin authentication to all routes
router.use(verifyAdminAccessToken);

// Get all pending users
router.get('/pending', userManagementController.getPendingUsers);

// Get all users
router.get('/all', userManagementController.getAllUsers);

// Get user list statistics
router.get('/stats', userManagementController.getUserListStats);

// Get user details
router.get('/:uid', userManagementController.getUserDetails);

// Get user orders
router.get('/:uid/orders', userManagementController.getUserOrders);

// Get user statistics
router.get('/:uid/statistics', userManagementController.getUserStatistics);

// Update user
router.put('/:uid', userManagementController.updateUser);

// Approve user
router.put('/:uid/approve', userManagementController.approveUser);

// Reject user
router.put('/:uid/reject', userManagementController.rejectUser);

module.exports = router;
