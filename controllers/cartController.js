const cartModel = require('../models/cartModel');
const orderModel = require('../models/orderModel');
const productModel = require('../models/productModel');

// Get current user's cart
const getCart = async (req, res) => {
    try {
        const uid = req.user?.uid || req.params?.uid;
        if (!uid) {
            return res.status(401).json({ success: false, message: 'Unauthorized: missing uid' });
        }
        const cart = await cartModel.getCartByUser(uid);
        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch cart', error: error.message });
    }
};

// Validate quantity against minQty
const validateQuantity = async (productID, totalQuantity) => {
    try {
        const product = await productModel.getProductById(productID);
        if (!product) {
            throw new Error('Product not found');
        }

        const minQty = product.minQty || 1;
        if (totalQuantity % minQty !== 0) {
            throw new Error(`Quantity must be a multiple of ${minQty}`);
        }

        return true;
    } catch (error) {
        throw new Error(`Validation failed: ${error.message}`);
    }
};

// Add item to cart (incremental)
const addToCart = async (req, res) => {
    try {
        const uid = req.user?.uid || req.params?.uid;
        if (!uid) {
            return res.status(401).json({ success: false, message: 'Unauthorized: missing uid' });
        }
        const item = req.body;
        if (!item || !item.productID || !item.units || item.units <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid cart item - units must be greater than 0' });
        }

        // Get current cart to check if item already exists
        const currentCart = await cartModel.getCartByUser(uid);
        const existingItem = currentCart.items.find(cartItem => cartItem.productID === item.productID);

        let totalQuantity = item.units;
        if (existingItem) {
            // Item already exists, calculate total quantity
            totalQuantity = (existingItem.units || 0) + item.units;
        }

        // Validate total quantity against minQty
        await validateQuantity(item.productID, totalQuantity);

        const result = await cartModel.upsertCartItem(uid, item);
        const cart = await cartModel.getCartByUser(uid);

        const message = result.action === 'updated'
            ? 'Quantity updated in cart'
            : 'Added to cart';

        res.status(200).json({ success: true, message, data: cart });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update cart item quantities (set)
const updateCartItem = async (req, res) => {
    try {
        const uid = req.user?.uid || req.params?.uid;
        const { productID } = req.params;
        if (!uid) {
            return res.status(401).json({ success: false, message: 'Unauthorized: missing uid' });
        }
        const { units = 0 } = req.body;

        // If units is 0, remove the item from cart
        if (units <= 0) {
            const ok = await cartModel.removeCartItem(uid, productID);
            if (!ok) return res.status(404).json({ success: false, message: 'Item not found' });
            const cart = await cartModel.getCartByUser(uid);
            return res.status(200).json({ success: true, message: 'Item removed from cart', data: cart });
        }

        // Validate quantity against minQty
        await validateQuantity(productID, units);

        const ok = await cartModel.updateCartItem(uid, productID, { units });
        if (!ok) return res.status(404).json({ success: false, message: 'Item not found' });
        const cart = await cartModel.getCartByUser(uid);
        res.status(200).json({ success: true, message: 'Cart updated', data: cart });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Remove item
const removeCartItem = async (req, res) => {
    try {
        const uid = req.user?.uid || req.params?.uid;
        const { productID } = req.params;
        if (!uid) {
            return res.status(401).json({ success: false, message: 'Unauthorized: missing uid' });
        }
        const ok = await cartModel.removeCartItem(uid, productID);
        if (!ok) return res.status(404).json({ success: false, message: 'Item not found' });
        const cart = await cartModel.getCartByUser(uid);
        res.status(200).json({ success: true, message: 'Item removed', data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to remove item', error: error.message });
    }
};

// Clear cart
const clearCart = async (req, res) => {
    try {
        const uid = req.user?.uid || req.params?.uid;
        if (!uid) {
            return res.status(401).json({ success: false, message: 'Unauthorized: missing uid' });
        }
        await cartModel.clearCart(uid);
        res.status(200).json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to clear cart', error: error.message });
    }
};

// Checkout: create order from cart and optionally clear
const checkout = async (req, res) => {
    try {
        const uid = req.user?.uid || req.params?.uid;
        if (!uid) {
            return res.status(401).json({ success: false, message: 'Unauthorized: missing uid' });
        }
        const { clear = true } = req.body || {};
        const cart = await cartModel.getCartByUser(uid);
        if (!cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }
        const { orderID } = await orderModel.createOrderFromCart(uid, cart.items);
        if (clear) await cartModel.clearCart(uid);
        res.status(201).json({ success: true, message: 'Order created', data: { orderID } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Checkout failed', error: error.message });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    checkout
};



