const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Public: anyone can fetch a setting (needed by user-facing site)
router.get('/:key', settingsController.getSetting);

// Role check: Only superadmin / manager can modify settings
const verifySuperAdminRole = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden. Only superadmin can modify settings.'
        });
    }
    next();
};

// Superadmin-only: update a setting
router.put('/:key', verifyAdminAccessToken, verifySuperAdminRole, settingsController.updateSetting);

module.exports = router;
