const express = require('express');
const router = express.Router();
const sliderController = require('../controllers/sliderController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');
const { uploadSingleImage } = require('../utils/multerConfig');

// Public GET routes for fetching sliders
router.get('/desktop', sliderController.getAllDesktopSliders);
router.get('/desktop/:sliderID', sliderController.getDesktopSliderById);
router.get('/mobile', sliderController.getAllMobileSliders);
router.get('/mobile/:sliderID', sliderController.getMobileSliderById);

// Admin-protected write routes
router.post('/desktop', verifyAdminAccessToken, sliderController.addDesktopSlider);
router.put('/desktop/:sliderID', verifyAdminAccessToken, sliderController.updateDesktopSlider);
router.delete('/desktop/:sliderID', verifyAdminAccessToken, sliderController.deleteDesktopSlider);
router.post('/desktop/upload', verifyAdminAccessToken, uploadSingleImage, sliderController.uploadDesktopSliderFile);

// Mobile Slider Routes
router.post('/mobile', verifyAdminAccessToken, sliderController.addMobileSlider);
router.put('/mobile/:sliderID', verifyAdminAccessToken, sliderController.updateMobileSlider);
router.delete('/mobile/:sliderID', verifyAdminAccessToken, sliderController.deleteMobileSlider);
router.post('/mobile/upload', verifyAdminAccessToken, uploadSingleImage, sliderController.uploadMobileSliderFile);

module.exports = router;
