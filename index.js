require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

// Import routes
const authRouter = require('./routers/authRouter.js');
const userRouter = require('./routers/userRouter.js');
const productRouter = require('./routers/productRouter.js');
const analyticsRouter = require('./routers/analyticsRouter.js');
const categoryRouter = require('./routers/categoryRouter.js');
const sliderRouter = require('./routers/sliderRouter.js');
const cartRouter = require('./routers/cartRouter.js');
const orderRouter = require('./routers/orderRouter.js');
const policyRouter = require('./routers/policyRouter.js');
const contactRouter = require('./routers/contactRouter.js');
const addressRouter = require('./routers/addressRouter.js');
const setupRouter = require('./routers/setupRouter.js');
const userManagementRouter = require('./routers/userManagementRouter.js');
const faqRouter = require('./routers/faqRouter.js');
const aboutRouter = require('./routers/aboutRouter.js');
const invoiceRouter = require('./routers/invoiceRouter.js');
const passwordResetRouter = require('./routers/passwordResetRouter.js');
const visitorRouter = require('./routers/visitorRouter.js');
const videoRouter = require('./routers/videoRouter.js');
const affiliateRouter = require('./routers/affiliateRoutes.js');
const reviewRouter = require('./routers/reviewRouter.js');
const siteReviewRouter = require('./routers/siteReviewRouter.js');
const blogRouter = require('./routers/blogRouter.js');
const settingsRouter = require('./routers/settingsRouter.js');
const trustedLogoRouter = require('./routers/trustedLogoRouter.js');

// Middleware
app.use(cors());

// // Trust proxy for accurate IP detection
app.set('trust proxy', true);

app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));

// Health check endpoint
app.use('/health', (req, res) => {
    res.status(200).json({ message: 'Server is running - UPDATED CODE!' });
});

// Test endpoint
app.use('/test', (req, res) => {
    console.log('🧪 TEST ENDPOINT CALLED! 🧪');
    res.status(200).json({ message: 'Test endpoint working - logs should appear!' });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/products', productRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/sliders', sliderRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/policies', policyRouter);
app.use('/api/contact', contactRouter);
app.use('/api/addresses', addressRouter);
app.use('/api/setup', setupRouter);
app.use('/api/admin/users', userManagementRouter);
app.use('/api/faq', faqRouter);
app.use('/api/about', aboutRouter);
app.use('/api/invoice', invoiceRouter);
app.use('/api/password-reset', passwordResetRouter);
app.use('/api/visitors', visitorRouter);
app.use('/api/videos', videoRouter);
app.use('/api/affiliate', affiliateRouter);
app.use('/api', reviewRouter);
app.use('/api', siteReviewRouter);
app.use('/api', blogRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/trusted-logos', trustedLogoRouter);

// Setup routes (for creating tables)
// Additional setup routes can be added here as needed

// Start background worker for scheduled blog posts
// Ensure settings table exists on startup
const settingsModel = require('./models/settingsModel.js');
settingsModel.ensureTable().catch(err => console.error('❌ Failed to create site_settings table:', err));

const siteReviewModel = require('./models/siteReviewModel.js');
siteReviewModel.ensureTable().catch(err => console.error('❌ Failed to create site_reviews table:', err));

const trustedLogoModel = require('./models/trustedLogoModel.js');
trustedLogoModel.ensureTable().catch(err => console.error('❌ Failed to create trusted_logos table:', err));

const blogModel = require('./models/blogModel.js');
setInterval(async () => {
    try {
        await blogModel.publishScheduledPosts();
    } catch (err) {
        console.error('❌ Error running scheduled posts publishing job:', err);
    }
}, 5 * 60 * 1000); // Check every 5 minutes

app.listen(9878, () => {
    console.log(` Server started on port 9878 - LOGGING IS WORKING! `);
});
