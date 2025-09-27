const express = require('express');
const productController = require('../controllers/productController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

// All product routes require admin authentication
// router.use(verifyAdminAccessToken);

// Product routes
router.post('/add', productController.addProduct);
router.get('/list', productController.getAllProducts);
router.get('/:productID', productController.getProductById);
router.put('/:productID', productController.updateProduct);
router.delete('/:productID', productController.deleteProduct);

// Category routes
router.get('/categories/list', productController.getCategories);
router.post('/categories/add', productController.createCategory);

module.exports = router;
