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

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',                // for local dev
        'https://clyadmin.onrender.com'    // your deployed Next.js frontend
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.use('/health', (req, res) => {
    res.status(200).json({ message: 'Server is running' });
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




app.listen(process.env.PORT, () => {
    console.log(`Server started on port 3300`);
});
