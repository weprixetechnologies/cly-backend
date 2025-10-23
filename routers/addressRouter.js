const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { verifyUserAccessToken } = require('../middleware/userAuthMiddleware');

// All routes require authentication
router.use(verifyUserAccessToken);

// Address routes
router.post('/', addressController.createAddress);
router.get('/', addressController.getUserAddresses);
router.get('/:addressID', addressController.getAddressById);
router.put('/:addressID', addressController.updateAddress);
router.delete('/:addressID', addressController.deleteAddress);
router.put('/:addressID/set-default', addressController.setDefaultAddress);

module.exports = router;
