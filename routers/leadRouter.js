const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
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

// Public endpoint: Submit inquiry / lead
router.post('/leads', leadController.createLead);

// Admin endpoints
router.get('/admin/leads/stats', verifyAdminAccessToken, verifyAdminRole, leadController.getLeadStats);
router.get('/admin/leads', verifyAdminAccessToken, verifyAdminRole, leadController.getLeads);
router.put('/admin/leads/:id', verifyAdminAccessToken, verifyAdminRole, leadController.updateLead);
router.delete('/admin/leads/:id', verifyAdminAccessToken, verifyAdminRole, leadController.deleteLead);

module.exports = router;
