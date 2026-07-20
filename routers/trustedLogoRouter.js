const express = require('express');
const router = express.Router();
const trustedLogoController = require('../controllers/trustedLogoController');

// Public route to fetch active logos for homepage
router.get('/', trustedLogoController.getActiveLogos);

// Admin routes
router.get('/all', trustedLogoController.getAllLogos);
router.post('/', trustedLogoController.createLogo);
router.put('/:id', trustedLogoController.updateLogo);
router.delete('/:id', trustedLogoController.deleteLogo);

module.exports = router;
