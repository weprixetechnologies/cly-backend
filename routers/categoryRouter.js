const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Get all categories
router.get('/', categoryController.getAllCategories);

// Get single category by ID
router.get('/:categoryID', categoryController.getCategoryById);

// Create new category
router.post('/', categoryController.createCategory);

// Update category
router.put('/:categoryID', categoryController.updateCategory);

// Delete category
router.delete('/:categoryID', categoryController.deleteCategory);

// Update category product count
router.patch('/:categoryID/product-count', categoryController.updateCategoryProductCount);
router.patch('/:categoryID/remove-from-products', categoryController.removeCategoryFromProducts);

module.exports = router;
