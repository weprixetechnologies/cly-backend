const express = require('express');
const productController = require('../controllers/productController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');
const settingsModel = require('../models/settingsModel');

const router = express.Router();

/**
 * Access control for product management:
 * - Admin / Manager: Always allowed.
 * - Editor: Allowed ONLY IF 'editor_products_access' is 'open' via superadmin setting.
 * - Others: Forbidden.
 */
const verifyProductAccess = async (req, res, next) => {
    try {
        const userRole = req.user?.role;
        if (!userRole) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        if (userRole === 'admin' || userRole === 'manager') {
            return next();
        }

        if (userRole === 'editor') {
            const access = await settingsModel.getSetting('editor_products_access');
            if (access === 'open') {
                return next();
            }
            return res.status(403).json({
                success: false,
                message: 'Products access is currently closed for editors by superadmin.'
            });
        }

        return res.status(403).json({
            success: false,
            message: 'Forbidden. You do not have permissions to manage products.'
        });
    } catch (error) {
        console.error('[verifyProductAccess] Error:', error);
        return res.status(500).json({ success: false, message: 'Server error checking product permissions' });
    }
};

// Check for bulk operations if token is provided
const checkBulkProductAccess = async (req, res, next) => {
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const jwt = require('jsonwebtoken');
            const jwtSecret = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-change-in-production-2024';
            const decoded = jwt.verify(token, jwtSecret);
            if (decoded.role === 'editor') {
                const access = await settingsModel.getSetting('editor_products_access');
                if (access !== 'open') {
                    return res.status(403).json({
                        success: false,
                        message: 'Products access is currently closed for editors by superadmin.'
                    });
                }
            }
        } catch (e) {
            // ignore invalid token for background scripts if unauthenticated
        }
    }
    next();
};

// Public read routes
router.get('/list', productController.getAllProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/by-category/:categoryID', productController.getProductsByCategory);
router.get('/categories/list', productController.getCategories);
router.get('/:productID', productController.getProductById);

// Protected product management routes (Admin/Manager always; Editor if opened by superadmin)
router.post('/add', verifyAdminAccessToken, verifyProductAccess, productController.addProduct);
router.post('/bulk-add', checkBulkProductAccess, productController.bulkAddProducts);
router.post('/update-inventory', checkBulkProductAccess, productController.bulkAddProducts);
router.delete('/all', verifyAdminAccessToken, verifyProductAccess, productController.deleteAllProducts);
router.get('/stats', verifyAdminAccessToken, verifyProductAccess, productController.getProductStats);
router.put('/:productID', verifyAdminAccessToken, verifyProductAccess, productController.updateProduct);
router.put('/:productID/regenerate-slug', verifyAdminAccessToken, verifyProductAccess, productController.regenerateSlug);
router.delete('/:productID', verifyAdminAccessToken, verifyProductAccess, productController.deleteProduct);

// Category management
router.post('/categories/add', verifyAdminAccessToken, verifyProductAccess, productController.createCategory);

module.exports = router;
