const userService = require('../services/userService');

// Get all users with pagination and filters
const getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            role = 'all'
        } = req.query;

        const result = await userService.getAllUsers({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            status,
            role
        });

        res.status(200).json({
            success: true,
            users: result.users,
            totalUsers: result.totalUsers,
            totalPages: result.totalPages,
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error getting all users:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get single user by ID
const getUserById = async (req, res) => {
    try {
        const { uid } = req.params;

        const user = await userService.getUserById(uid);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error getting user by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update user information
const updateUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const updateData = req.body;

        // Remove email from update data if present (not allowed to change)
        if (updateData.emailID) {
            delete updateData.emailID;
        }

        // Remove password from update data (use separate endpoint for password change)
        if (updateData.password) {
            delete updateData.password;
        }

        const updatedUser = await userService.updateUser(uid, updateData);

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const { uid } = req.params;

        const deleted = await userService.deleteUser(uid);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
};
