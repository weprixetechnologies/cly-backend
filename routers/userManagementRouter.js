const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagementController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Role check: Only superadmin / manager can manage users
const verifySuperAdminRole = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden. Only administrators can access user management.'
        });
    }
    next();
};

// Apply admin authentication and superadmin check to all routes
router.use(verifyAdminAccessToken, verifySuperAdminRole);

// Create user (bypasses OTP)
router.post('/', userManagementController.createUser);

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

// Reset password
router.put('/:uid/reset-password', userManagementController.resetUserPassword);

module.exports = router;
