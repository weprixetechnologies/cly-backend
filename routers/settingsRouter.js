const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Public: anyone can fetch a setting (needed by user-facing site)
router.get('/:key', settingsController.getSetting);

// Admin-only: update a setting
router.put('/:key', verifyAdminAccessToken, settingsController.updateSetting);

module.exports = router;
