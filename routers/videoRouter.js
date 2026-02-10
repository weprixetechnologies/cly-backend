const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

// Public route for homepage videos
router.get('/', videoController.getHomepageVideos);

// Admin-protected routes for managing videos
router.post('/', verifyAdminAccessToken, videoController.addHomepageVideo);
router.put('/:videoID', verifyAdminAccessToken, videoController.updateHomepageVideo);
router.delete('/:videoID', verifyAdminAccessToken, videoController.deleteHomepageVideo);

module.exports = router;

