const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyUserAccessToken } = require('../middleware/userAuthMiddleware');

router.use(verifyUserAccessToken);

// Cart routes by user id
router.get('/:uid', cartController.getCart);
router.post('/:uid/add', cartController.addToCart);
router.put('/:uid/item/:productID', cartController.updateCartItem);
router.delete('/:uid/item/:productID', cartController.removeCartItem);
router.delete('/:uid/clear', cartController.clearCart);
router.post('/:uid/checkout', cartController.checkout);

module.exports = router;



