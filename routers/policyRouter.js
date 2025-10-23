const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Public routes (no authentication required)
router.get('/active', policyController.getActivePolicies);
router.get('/type/:type', policyController.getPolicyByType);

// Admin routes (authentication required)
router.get('/', verifyAdminAccessToken, policyController.getAllPolicies);
router.get('/:id', verifyAdminAccessToken, policyController.getPolicyById);
router.post('/', verifyAdminAccessToken, policyController.createPolicy);
router.put('/:id', verifyAdminAccessToken, policyController.updatePolicy);
router.put('/:id/activate', verifyAdminAccessToken, policyController.activatePolicy);
router.delete('/:id', verifyAdminAccessToken, policyController.deletePolicy);

module.exports = router;
