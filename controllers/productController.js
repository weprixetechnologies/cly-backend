const productModel = require('../models/productModel');
const categoryService = require('../services/categoryService');
const { appendLogLines } = require('../utils/errorTallyLogger');

// Add new product
const addProduct = async (req, res) => {
    try {
        const {
            productName,
            productPrice,
            sku,
            description,
            boxQty,
            minQty,
            categoryID,
            categoryName,
            themeCategory,
            featuredImages,
            galleryImages,
            inventory
        } = req.body;

        // Validate required fields
        if (!productName || !sku) {
            return res.status(400).json({
                success: false,
                message: 'Product name, price, and SKU are required'
            });
        }

        // Validate price
        if (productPrice != null && (isNaN(productPrice) || productPrice <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'Product price must be a valid positive number'
            });
        }

        // Validate quantities
        const quantities = { boxQty, minQty, inventory };
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
            minQty: parseInt(minQty) || 1,
            categoryID: categoryID || null,
            categoryName: categoryName || null,
            themeCategory: themeCategory || null,
            featuredImages: featuredImages || '',
            galleryImages: galleryImages || [],
            inventory: parseInt(inventory) || 0
        };

        const result = await productModel.createProduct(productData);

        // Increment category count if categoryID provided
        if (productData.categoryID) {
            try {
                await categoryService.updateCategoryProductCount(productData.categoryID, true);
            } catch (e) {
                console.warn('Failed to increment category count on product create:', e.message);
            }
        }

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
        const categoryID = req.query.categoryID || '';
        const minPrice = req.query.minPrice || null;
        const maxPrice = req.query.maxPrice || null;
        // Parse outOfStock - default to true (include all products)
        // If not provided or explicitly 'true', include all products. Only exclude when explicitly 'false'
        const outOfStock = req.query.outOfStock === undefined || req.query.outOfStock === 'true' || req.query.outOfStock === true;

        const result = await productModel.getAllProducts(page, limit, search, categoryID, minPrice, maxPrice, outOfStock);

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
            minQty,
            categoryID,
            categoryName,
            themeCategory,
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

        // Validate required fields (allow updates without forcing price; UI sends it but may be 0)
        if (!productName || !sku) {
            return res.status(400).json({
                success: false,
                message: 'Product name and SKU are required'
            });
        }

        // Validate price only if provided; allow 0
        if (productPrice !== undefined && productPrice !== null && productPrice !== '') {
            const priceNum = parseFloat(productPrice);
            if (isNaN(priceNum) || priceNum < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Product price must be a valid non-negative number'
                });
            }
        }

        const productData = {
            productName,
            productPrice: productPrice !== undefined && productPrice !== null && productPrice !== '' ? parseFloat(productPrice) : 0,
            sku,
            description: description || '',
            boxQty: parseInt(boxQty) || 0,
            minQty: parseInt(minQty) || 1,
            categoryID: categoryID || null,
            categoryName: categoryName || null,
            themeCategory: themeCategory || null,
            featuredImages: featuredImages || '',
            galleryImages: galleryImages || [],
            inventory: parseInt(inventory) || 0,
            status: status || 'active'
        };

        const oldCategoryID = existingProduct.categoryID || null;
        const newCategoryID = productData.categoryID || null;

        const result = await productModel.updateProduct(productID, productData);

        // Adjust category counts when category changes
        if (oldCategoryID !== newCategoryID) {
            try {
                if (oldCategoryID) await categoryService.updateCategoryProductCount(oldCategoryID, false);
                if (newCategoryID) await categoryService.updateCategoryProductCount(newCategoryID, true);
            } catch (e) {
                console.warn('Failed to adjust category counts on product update:', e.message);
            }
        }

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

        const existingCategoryID = existingProduct.categoryID || null;

        const result = await productModel.deleteProduct(productID);

        if (existingCategoryID) {
            try {
                await categoryService.updateCategoryProductCount(existingCategoryID, false);
            } catch (e) {
                console.warn('Failed to decrement category count on delete:', e.message);
            }
        }

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

// Delete all products (hard delete)
const deleteAllProducts = async (req, res) => {
    try {
        const result = await productModel.deleteAllProducts();
        res.status(200).json({
            success: true,
            message: 'All products deleted',
            affected: result.affectedRows
        });
    } catch (error) {
        console.error('Error deleting all products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete all products',
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

// Update inventory by SKU
const updateInventoryBySku = async (req, res) => {
    console.log(req.body);
    try {
        const { supplier_token, Data } = req.body;

        // Validate request structure
        if (!Data || !Array.isArray(Data)) {
            return res.status(400).json({
                success: false,
                message: 'Data must be an array of products'
            });
        }

        if (Data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data array cannot be empty'
            });
        }

        // Filter out items without SKU and track skipped items
        const validProducts = [];
        const skippedItems = [];

        Data.forEach((product, index) => {
            if (!product.sku || product.sku.trim() === '') {
                skippedItems.push({
                    index,
                    reason: 'Missing or empty SKU',
                    data: product
                });
            } else {
                validProducts.push(product);
            }
        });

        // Check if we have any valid products after filtering
        if (validProducts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'All products are missing required field: sku',
                skipped: skippedItems.length
            });
        }

        // Normalize product data: map BoxQty/MOQ and set defaults
        const normalizedData = validProducts.map((product) => {
            // Map BoxQty to boxQty and MOQ to minQty
            // Support both uppercase (BoxQty, MOQ) and lowercase (boxQty, minQty) formats
            const boxQty = product.BoxQty !== undefined ? product.BoxQty : (product.boxQty !== undefined ? product.boxQty : null);
            const minQty = product.MOQ !== undefined ? product.MOQ : (product.minQty !== undefined ? product.minQty : null);

            // Set default to 1 if empty or null
            const normalizedBoxQty = (boxQty === null || boxQty === undefined || boxQty === '' || isNaN(boxQty)) ? 1 : parseInt(boxQty);
            const normalizedMinQty = (minQty === null || minQty === undefined || minQty === '' || isNaN(minQty)) ? 1 : parseInt(minQty);

            // Map categoryName to themeCategory (handle empty string as null)
            const categoryNameValue = product.categoryName && product.categoryName.trim() !== '' ? product.categoryName : null;
            const themeCategoryValue = product.themeCategory && product.themeCategory.trim() !== '' ? product.themeCategory : null;
            const themeCategory = categoryNameValue || themeCategoryValue || null;

            // Create normalized product object
            return {
                ...product,
                boxQty: normalizedBoxQty,
                minQty: normalizedMinQty,
                themeCategory: themeCategory || null
            };
        });

        // Process bulk update/create - same logic as bulk-add
        const result = await productModel.bulkCreateProducts(normalizedData);

        // Prepare response with skipped items info
        const response = {
            success: true,
            message: `Bulk product update/create completed`,
            data: {
                ...result,
                skipped: skippedItems.length,
                skippedItems: skippedItems.length > 0 ? skippedItems.map(item => ({
                    index: item.index,
                    reason: item.reason
                })) : []
            }
        };

        // Log skipped items and per-item errors to errorTallySync.txt
        try {
            const logLines = [];
            if (skippedItems.length > 0) {
                skippedItems.forEach(si => {
                    const payload = (() => {
                        try { return JSON.stringify(si.data); } catch (_) { return '<<unserializable>>'; }
                    })();
                    logLines.push(`update-inventory | skipped | index=${si.index} | reason=${si.reason} | data=${payload}`);
                });
            }
            if (Array.isArray(result?.errors) && result.errors.length > 0) {
                result.errors.forEach(err => {
                    logLines.push(`update-inventory | error | index=${err.index} | sku=${err.sku} | msg=${err.error}`);
                });
            }
            appendLogLines(logLines);
        } catch (_) { }

        // If all products failed, return 400
        if (result.successful === 0) {
            return res.status(400).json({
                success: false,
                message: 'All products failed to process',
                data: result
            });
        }

        // If some products failed, return 207 (Multi-Status)
        if (result.failed > 0) {
            return res.status(207).json(response);
        }

        // If all products succeeded, return 200
        res.status(200).json(response);

    } catch (error) {
        console.error('Error updating inventory by SKU:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update/create products',
            error: error.message
        });
    }
};

// Bulk add products (for supplier integration)
const bulkAddProducts = async (req, res) => {
    console.log(req.body);

    try {
        const { supplier_token, Data } = req.body;

        // Validate request structure
        if (!Data || !Array.isArray(Data)) {
            return res.status(400).json({
                success: false,
                message: 'Data must be an array of products'
            });
        }

        if (Data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data array cannot be empty'
            });
        }

        // Filter out items without SKU and track skipped items
        const validProducts = [];
        const skippedItems = [];

        Data.forEach((product, index) => {
            if (!product.sku || product.sku.trim() === '') {
                skippedItems.push({
                    index,
                    reason: 'Missing or empty SKU',
                    data: product
                });
            } else {
                validProducts.push(product);
            }
        });

        // Check if we have any valid products after filtering
        if (validProducts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'All products are missing required field: sku',
                skipped: skippedItems.length
            });
        }

        // Validate remaining products for other required fields
        for (let i = 0; i < validProducts.length; i++) {
            const product = validProducts[i];
            if (!product.productName) {
                return res.status(400).json({
                    success: false,
                    message: `Product at index ${i} (after filtering) is missing required field: productName`
                });
            }
        }

        // Normalize product data: map BoxQty/MOQ and set defaults
        const normalizedData = validProducts.map((product) => {
            // Map BoxQty to boxQty and MOQ to minQty
            // Support both uppercase (BoxQty, MOQ) and lowercase (boxQty, minQty) formats
            const boxQty = product.BoxQty !== undefined ? product.BoxQty : (product.boxQty !== undefined ? product.boxQty : null);
            const minQty = product.MOQ !== undefined ? product.MOQ : (product.minQty !== undefined ? product.minQty : null);

            // Set default to 1 if empty or null
            const normalizedBoxQty = (boxQty === null || boxQty === undefined || boxQty === '' || isNaN(boxQty)) ? 1 : parseInt(boxQty);
            const normalizedMinQty = (minQty === null || minQty === undefined || minQty === '' || isNaN(minQty)) ? 1 : parseInt(minQty);

            // Map categoryName to themeCategory (handle empty string as null)
            const categoryNameValue = product.categoryName && product.categoryName.trim() !== '' ? product.categoryName : null;
            const themeCategoryValue = product.themeCategory && product.themeCategory.trim() !== '' ? product.themeCategory : null;
            const themeCategory = categoryNameValue || themeCategoryValue || null;

            // Create normalized product object
            return {
                ...product,
                boxQty: normalizedBoxQty,
                minQty: normalizedMinQty,
                themeCategory: themeCategory || null
            };
        });

        // Process bulk creation
        const result = await productModel.bulkCreateProducts(normalizedData);

        // Prepare response with skipped items info
        const response = {
            success: true,
            message: `Bulk product creation completed`,
            data: {
                ...result,
                skipped: skippedItems.length,
                skippedItems: skippedItems.length > 0 ? skippedItems.map(item => ({
                    index: item.index,
                    reason: item.reason
                })) : []
            }
        };

        // Log skipped items and per-item errors to errorTallySync.txt
        try {
            const logLines = [];
            if (skippedItems.length > 0) {
                skippedItems.forEach(si => {
                    const payload = (() => {
                        try { return JSON.stringify(si.data); } catch (_) { return '<<unserializable>>'; }
                    })();
                    logLines.push(`bulk-add | skipped | index=${si.index} | reason=${si.reason} | data=${payload}`);
                });
            }
            if (Array.isArray(result?.errors) && result.errors.length > 0) {
                result.errors.forEach(err => {
                    logLines.push(`bulk-add | error | index=${err.index} | sku=${err.sku} | msg=${err.error}`);
                });
            }
            appendLogLines(logLines);
        } catch (_) { }

        // If all products failed, return 400
        if (result.successful === 0) {
            return res.status(400).json({
                success: false,
                message: 'All products failed to create',
                data: result
            });
        }

        // If some products failed, return 207 (Multi-Status)
        if (result.failed > 0) {
            return res.status(207).json(response);
        }

        // If all products succeeded, return 201
        res.status(201).json(response);

    } catch (error) {
        console.error('Error in bulk product creation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create products in bulk',
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
    createCategory,
    updateInventoryBySku,
    bulkAddProducts,
    deleteAllProducts
};
