const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Get all users with pagination and filters
router.get('/', userController.getAllUsers);

// Get single user by ID
router.get('/:uid', userController.getUserById);

// Update user information (email not allowed to change)
router.put('/:uid', userController.updateUser);

// Delete user
router.delete('/:uid', userController.deleteUser);

module.exports = router;
