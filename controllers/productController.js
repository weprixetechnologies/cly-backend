const productModel = require('../models/productModel');

// Add new product
const addProduct = async (req, res) => {
    try {
        const {
            productName,
            productPrice,
            sku,
            description,
            boxQty,
            packQty,
            minQty,
            categoryID,
            categoryName,
            featuredImages,
            galleryImages,
            inventory
        } = req.body;

        // Validate required fields
        if (!productName || !productPrice || !sku) {
            return res.status(400).json({
                success: false,
                message: 'Product name, price, and SKU are required'
            });
        }

        // Validate price
        if (isNaN(productPrice) || productPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Product price must be a valid positive number'
            });
        }

        // Validate quantities
        const quantities = { boxQty, packQty, minQty, inventory };
        for (const [key, value] of Object.entries(quantities)) {
            if (value !== undefined && (isNaN(value) || value < 0)) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be a valid non-negative number`
                });
            }
        }

        const productData = {
            productName,
            productPrice: parseFloat(productPrice),
            sku,
            description: description || '',
            boxQty: parseInt(boxQty) || 0,
            packQty: parseInt(packQty) || 0,
            minQty: parseInt(minQty) || 1,
            categoryID: categoryID || null,
            categoryName: categoryName || null,
            featuredImages: featuredImages || '',
            galleryImages: galleryImages || [],
            inventory: parseInt(inventory) || 0
        };

        const result = await productModel.createProduct(productData);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: {
                productID: result.productID
            }
        });

    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
};

// Get all products
const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const result = await productModel.getAllProducts(page, limit, search);

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
};

// Get product by ID
const getProductById = async (req, res) => {
    try {
        const { productID } = req.params;

        const product = await productModel.getProductById(productID);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Parse gallery images if it's a string
        if (product.galleryImages && typeof product.galleryImages === 'string') {
            try {
                product.galleryImages = JSON.parse(product.galleryImages);
            } catch (e) {
                product.galleryImages = [];
            }
        }

        res.status(200).json({
            success: true,
            data: product
        });

    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error.message
        });
    }
};

// Update product
const updateProduct = async (req, res) => {
    try {
        const { productID } = req.params;
        const {
            productName,
            productPrice,
            sku,
            description,
            boxQty,
            packQty,
            minQty,
            categoryID,
            categoryName,
            featuredImages,
            galleryImages,
            inventory,
            status
        } = req.body;

        // Check if product exists
        const existingProduct = await productModel.getProductById(productID);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Validate required fields
        if (!productName || !productPrice || !sku) {
            return res.status(400).json({
                success: false,
                message: 'Product name, price, and SKU are required'
            });
        }

        // Validate price
        if (isNaN(productPrice) || productPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Product price must be a valid positive number'
            });
        }

        const productData = {
            productName,
            productPrice: parseFloat(productPrice),
            sku,
            description: description || '',
            boxQty: parseInt(boxQty) || 0,
            packQty: parseInt(packQty) || 0,
            minQty: parseInt(minQty) || 1,
            categoryID: categoryID || null,
            categoryName: categoryName || null,
            featuredImages: featuredImages || '',
            galleryImages: galleryImages || [],
            inventory: parseInt(inventory) || 0,
            status: status || 'active'
        };

        const result = await productModel.updateProduct(productID, productData);

        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: 'No changes made to the product'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error.message
        });
    }
};

// Delete product
const deleteProduct = async (req, res) => {
    try {
        const { productID } = req.params;

        // Check if product exists
        const existingProduct = await productModel.getProductById(productID);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const result = await productModel.deleteProduct(productID);

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
    try {
        const { categoryID } = req.params;
        const { page = 1, limit = 24 } = req.query;

        if (!categoryID) {
            return res.status(400).json({
                success: false,
                message: 'Category ID is required'
            });
        }

        const result = await productModel.getProductsByCategory(categoryID, page, limit);

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error fetching products by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products by category',
            error: error.message
        });
    }
};

// Get categories
const getCategories = async (req, res) => {
    try {
        const categories = await productModel.getCategories();

        res.status(200).json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
};

// Create category
const createCategory = async (req, res) => {
    try {
        const { categoryName, image } = req.body;

        if (!categoryName) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const categoryData = {
            categoryName,
            image: image || ''
        };

        const result = await productModel.createCategory(categoryData);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: {
                categoryID: result.categoryID
            }
        });

    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
};

module.exports = {
    addProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getProductsByCategory,
    getCategories,
    createCategory
};
