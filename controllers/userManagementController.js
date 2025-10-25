const authModel = require('../models/authModel');
const orderModel = require('../models/orderModel');

// Get all pending users
async function getPendingUsers(req, res) {
    try {
        const users = await authModel.getUsersByApprovalStatus('pending');
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get pending users error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending users',
            error: error.message
        });
    }
}

// Get all users with approval status
async function getAllUsers(req, res) {
    try {
        const users = await authModel.getAllUsers();
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get all users error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
}

// Approve user
async function approveUser(req, res) {
    try {
        const { uid } = req.params;
        const adminUid = req.user.uid; // From middleware

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const result = await authModel.updateUserApproval(uid, 'approved', adminUid);

        if (result) {
            res.status(200).json({
                success: true,
                message: 'User approved successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Approve user error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to approve user',
            error: error.message
        });
    }
}

// Reject user
async function rejectUser(req, res) {
    try {
        const { uid } = req.params;
        const adminUid = req.user.uid; // From middleware

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const result = await authModel.updateUserApproval(uid, 'rejected', adminUid);

        if (result) {
            res.status(200).json({
                success: true,
                message: 'User rejected successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Reject user error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to reject user',
            error: error.message
        });
    }
}

// Get user details
async function getUserDetails(req, res) {
    try {
        const { uid } = req.params;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const user = await authModel.getUserByUid(uid);

        if (user) {
            res.status(200).json({
                success: true,
                data: user
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Get user details error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details',
            error: error.message
        });
    }
}

// Update user details
async function updateUser(req, res) {
    try {
        const { uid } = req.params;
        const { name, emailID, phoneNumber, gstin, approval_status, photo, outstanding, status, role } = req.body;
        const adminUid = req.user.uid; // From middleware

        console.log('Update user request body:', req.body);
        console.log('Extracted fields:', { name, emailID, phoneNumber, gstin, approval_status, photo, outstanding, status, role });

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Validate required fields
        if (!name || !emailID || !phoneNumber) {
            console.log('Validation failed:', { name: !!name, emailID: !!emailID, phoneNumber: !!phoneNumber });
            return res.status(400).json({
                success: false,
                message: 'Name, email, and phone number are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailID)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if email already exists for another user
        const existingUser = await authModel.getUserByEmail(emailID);
        if (existingUser && existingUser.uid !== uid) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists for another user'
            });
        }

        const updateData = {
            name,
            emailID,
            phoneNumber,
            gstin: gstin || null,
            approval_status: approval_status || 'pending'
        };

        // Add optional fields if provided
        if (photo !== undefined) {
            updateData.photo = photo;
        }

        if (outstanding !== undefined) {
            updateData.outstanding = outstanding === '' || outstanding === null ? 0 : parseFloat(outstanding) || 0;
        }

        if (status !== undefined) {
            updateData.status = status;
        }

        if (role !== undefined) {
            updateData.role = role;
        }

        // If approval status is being changed, update approval fields
        if (approval_status && approval_status !== 'pending') {
            updateData.approved_by = adminUid;
            updateData.approved_at = new Date();
        }

        const result = await authModel.updateUser(uid, updateData);

        if (result) {
            res.status(200).json({
                success: true,
                message: 'User updated successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('Update user error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
}

// Get user orders
async function getUserOrders(req, res) {
    try {
        const { uid } = req.params;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const orders = await orderModel.getOrdersByUserId(uid);

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Get user orders error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user orders',
            error: error.message
        });
    }
}

// Get user statistics
async function getUserStatistics(req, res) {
    try {
        const { uid } = req.params;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const statistics = await orderModel.getUserStatistics(uid);

        res.status(200).json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Get user statistics error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user statistics',
            error: error.message
        });
    }
}

module.exports = {
    getPendingUsers,
    getAllUsers,
    approveUser,
    rejectUser,
    getUserDetails,
    updateUser,
    getUserOrders,
    getUserStatistics
};
