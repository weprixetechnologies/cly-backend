const cartModel = require('../models/cartModel');
const orderModel = require('../models/orderModel');

// Get current user's cart
const getCart = async (req, res) => {
    try {
        const { uid } = req.params;
        const cart = await cartModel.getCartByUser(uid);
        res.status(200).json({ success: true, data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch cart', error: error.message });
    }
};

// Add item to cart (incremental)
const addToCart = async (req, res) => {
    try {
        const { uid } = req.params;
        const item = req.body;
        if (!item || !item.productID || (!item.boxQty && !item.packQty && !item.units)) {
            return res.status(400).json({ success: false, message: 'Invalid cart item' });
        }
        await cartModel.upsertCartItem(uid, item);
        const cart = await cartModel.getCartByUser(uid);
        res.status(200).json({ success: true, message: 'Added to cart', data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add to cart', error: error.message });
    }
};

// Update cart item quantities (set)
const updateCartItem = async (req, res) => {
    try {
        const { uid, productID } = req.params;
        const { boxQty = 0, packQty = 0, units = 0 } = req.body;
        const ok = await cartModel.updateCartItem(uid, productID, { boxQty, packQty, units });
        if (!ok) return res.status(404).json({ success: false, message: 'Item not found' });
        const cart = await cartModel.getCartByUser(uid);
        res.status(200).json({ success: true, message: 'Cart updated', data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update cart', error: error.message });
    }
};

// Remove item
const removeCartItem = async (req, res) => {
    try {
        const { uid, productID } = req.params;
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
        const { uid } = req.params;
        await cartModel.clearCart(uid);
        res.status(200).json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to clear cart', error: error.message });
    }
};

// Checkout: create order from cart and optionally clear
const checkout = async (req, res) => {
    try {
        const { uid } = req.params;
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



