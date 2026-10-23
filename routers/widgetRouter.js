const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widgetController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Role check for admin/manager
const verifyAdminRole = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden. Administrator privileges required.'
        });
    }
    next();
};

// Public: Get widget config & flow
router.get('/widget/config', widgetController.getWidgetConfig);

// Admin: Widget settings
router.get('/admin/widget/settings', verifyAdminAccessToken, verifyAdminRole, widgetController.getSettings);
router.put('/admin/widget/settings', verifyAdminAccessToken, verifyAdminRole, widgetController.updateSettings);
router.put('/admin/widget/chatbot-flow', verifyAdminAccessToken, verifyAdminRole, widgetController.updateChatbotFlow);

module.exports = router;
