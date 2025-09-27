const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register admin
router.post('/register/admin', authController.registerAdmin);

// Register user
router.post('/register/user', authController.registerUser);

// Login admin
router.post('/login/admin', authController.loginAdmin);

// Login user
router.post('/login/user', authController.loginUser);

// Refresh access token
router.post('/refresh-token', authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

// Get user profile (placeholder)
router.get('/profile', authController.getProfile);

module.exports = router;
