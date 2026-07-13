const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { verifyAdminAccessToken } = require('../middleware/adminAuthMiddleware');
const { verifyUserAccessToken } = require('../middleware/userAuthMiddleware');
const { uploadSingleImage } = require('../utils/multerConfig');

// Role checking middleware
const verifyAdminRole = (req, res, next) => {
    console.log('[verifyAdminRole] req.user:', req.user);
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden. You do not have permissions to perform this action.'
        });
    }
    next();
};

// --- PUBLIC BLOG ENDPOINTS ---
router.get('/blog/posts', blogController.getPublicPosts);
router.get('/blog/posts/:slug', blogController.getPublicPostBySlug);
router.post('/blog/posts/:slug/view', blogController.incrementPostView);
router.get('/blog/categories', blogController.getAllCategories);
router.get('/blog/tags', blogController.getAllTags);
router.get('/blog/sitemap-data', blogController.getSitemapData);
router.get('/blog/rss', blogController.getRSSFeed);

// --- ADMIN BLOG ENDPOINTS ---

// Apply authentication and role check to all admin routes
router.use('/admin/blog', verifyAdminAccessToken, verifyAdminRole);

// Categories
router.post('/admin/blog/categories', blogController.createCategory);
router.put('/admin/blog/categories/:id', blogController.updateCategory);
router.delete('/admin/blog/categories/:id', blogController.deleteCategory);

// Tags
router.post('/admin/blog/tags', blogController.createTag);
router.put('/admin/blog/tags/:id', blogController.updateTag);
router.delete('/admin/blog/tags/:id', blogController.deleteTag);

// Posts CRUD
router.post('/admin/blog/posts', blogController.createPost);
router.get('/admin/blog/posts', blogController.getAdminPosts);
router.get('/admin/blog/posts/:id', blogController.getPostById);
router.put('/admin/blog/posts/:id', blogController.updatePost);
router.patch('/admin/blog/posts/:id/status', blogController.updatePostStatus);
router.delete('/admin/blog/posts/:id', blogController.deletePost);

// Post links & tools
router.post('/admin/blog/posts/:id/products', blogController.linkPostProducts);
router.get('/admin/blog/posts/:id/seo-check', blogController.getPostSeoCheck);

// Inline editor image upload
router.post('/admin/blog/upload-image', uploadSingleImage, blogController.uploadBlogImage);

module.exports = router;
