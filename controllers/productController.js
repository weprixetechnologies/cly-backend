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
            minQty,
            categoryID,
            categoryName,
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

// Update inventory by SKU
const updateInventoryBySku = async (req, res) => {
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

        const results = [];
        const errors = [];

        // Process each product in the array
        for (let i = 0; i < Data.length; i++) {
            const product = Data[i];
            const { sku, inventory, productPrice, productMRP, tax, brand, hsn, boxQty, minQty } = product;

            try {
                // Validate required fields for this product
                if (!sku || inventory === undefined) {
                    errors.push({
                        index: i,
                        sku: sku || 'undefined',
                        error: 'SKU and inventory are required'
                    });
                    continue;
                }

                // Check if SKU exists
                const existingProduct = await productModel.checkSkuExists(sku);
                if (!existingProduct) {
                    errors.push({
                        index: i,
                        sku,
                        error: 'Product with SKU not found',
                        found: false
                    });
                    continue;
                }

                // Update inventory
                const inventoryResult = await productModel.updateInventoryBySku(sku, parseInt(inventory));

                if (inventoryResult.affectedRows === 0) {
                    errors.push({
                        index: i,
                        sku,
                        error: 'No changes made to the inventory'
                    });
                    continue;
                }

                // If additional fields are provided, update them too
                const updateFields = {};
                if (productPrice !== undefined) updateFields.productPrice = productPrice;
                // Optional quantities: accept if provided and numeric; ignore if null/undefined
                if (boxQty !== undefined && boxQty !== null && !isNaN(boxQty)) {
                    updateFields.boxQty = parseInt(boxQty);
                }
                if (minQty !== undefined && minQty !== null && !isNaN(minQty)) {
                    updateFields.minQty = parseInt(minQty);
                }


                // Update additional fields if any
                if (Object.keys(updateFields).length > 0) {
                    await productModel.updateProductBySku(sku, updateFields);
                }

                // Add to successful results
                results.push({
                    index: i,
                    sku,
                    productName: existingProduct.productName,
                    oldInventory: existingProduct.inventory,
                    newInventory: parseInt(inventory),
                    updated: true
                });

            } catch (productError) {
                errors.push({
                    index: i,
                    sku: sku || 'undefined',
                    error: `Failed to process: ${productError.message}`
                });
            }
        }

        // Prepare response
        const response = {
            success: true,
            message: `Processed ${Data.length} products`,
            data: {
                total: Data.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors
            }
        };

        // If all products failed, return 400
        if (results.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'All products failed to update',
                data: response.data
            });
        }

        // If some products failed, return 207 (Multi-Status)
        if (errors.length > 0) {
            return res.status(207).json(response);
        }

        // If all products succeeded, return 200
        res.status(200).json(response);

    } catch (error) {
        console.error('Error updating inventory by SKU:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update inventory',
            error: error.message
        });
    }
};

// Bulk add products (for supplier integration)
const bulkAddProducts = async (req, res) => {
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

        // Validate each product in the array
        for (let i = 0; i < Data.length; i++) {
            const product = Data[i];

            if (!product.sku) {
                return res.status(400).json({
                    success: false,
                    message: `Product at index ${i} is missing required field: sku`
                });
            }

            if (!product.productName) {
                return res.status(400).json({
                    success: false,
                    message: `Product at index ${i} is missing required field: productName`
                });
            }
        }

        // Process bulk creation
        const result = await productModel.bulkCreateProducts(Data);

        // Prepare response
        const response = {
            success: true,
            message: `Bulk product creation completed`,
            data: result
        };

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
    bulkAddProducts
};
