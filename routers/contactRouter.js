const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Public routes (no authentication required)
router.get('/active', contactController.getActiveContactDetails);
router.get('/type/:type', contactController.getContactDetailsByType);

// Admin routes (authentication required)
router.get('/', verifyAdminAccessToken, contactController.getAllContactDetails);
router.get('/:id', verifyAdminAccessToken, contactController.getContactDetailById);
router.post('/', verifyAdminAccessToken, contactController.createContactDetail);
router.put('/:id', verifyAdminAccessToken, contactController.updateContactDetail);
router.put('/display-order', verifyAdminAccessToken, contactController.updateDisplayOrder);
router.delete('/:id', verifyAdminAccessToken, contactController.deleteContactDetail);

module.exports = router;
