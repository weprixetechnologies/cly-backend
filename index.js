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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


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

// Setup routes (for creating tables)
// Additional setup routes can be added here as needed




app.listen(3300, () => {
    console.log(`🔥🔥🔥 Server started on port 3300 - LOGGING IS WORKING! 🔥🔥🔥`);
});
