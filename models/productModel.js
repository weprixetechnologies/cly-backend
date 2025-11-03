const db = require('../utils/dbconnect');

// Generate unique product ID
function generateProductID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'PRD';
    for (let i = 0; i < 9; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Generate unique product ID with collision checking
async function generateUniqueProductID() {
    let productID;
    let attempts = 0;
    const maxAttempts = 10;

    do {
        productID = generateProductID();
        attempts++;

        if (attempts > maxAttempts) {
            throw new Error('Unable to generate unique product ID after multiple attempts');
        }
    } while (await checkProductIDExists(productID));

    return productID;
}

// Check if product ID exists
async function checkProductIDExists(productID) {
    try {
        const [rows] = await db.execute(
            'SELECT productID FROM products WHERE productID = ?',
            [productID]
        );
        return rows.length > 0;
    } catch (error) {
        throw new Error(`Error checking product ID: ${error.message}`);
    }
}

// Create a new product
async function createProduct(productData) {
    try {
        const productID = await generateUniqueProductID();

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
        } = productData;

        const [result] = await db.execute(
            'INSERT INTO products (\n                productID, productName, productPrice, sku, description, \n                boxQty, minQty, categoryID, categoryName, themeCategory, \n                featuredImages, galleryImages, inventory\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                productID,
                productName,
                productPrice,
                sku,
                description,
                boxQty,
                minQty,
                categoryID,
                categoryName,
                themeCategory || null,
                featuredImages,
                JSON.stringify(galleryImages),
                inventory
            ]
        );

        return {
            productID,
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error creating product: ${error.message}`);
    }
}

// Get all products with pagination
async function getAllProducts(page = 1, limit = 10, search = '', categoryID = '', minPrice = null, maxPrice = null, outOfStock = true) {
    try {
        // Ensure page and limit are integers
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        let query = 'SELECT * FROM products WHERE status = "active"';
        let params = [];

        if (search) {
            query += ` AND (productName LIKE ? OR sku LIKE ? OR categoryName LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (categoryID) {
            query += ` AND categoryID = ?`;
            params.push(categoryID);
        }

        if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
            query += ` AND productPrice >= ?`;
            params.push(parseFloat(minPrice));
        }

        if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
            query += ` AND productPrice <= ?`;
            params.push(parseFloat(maxPrice));
        }

        // Filter out-of-stock products if outOfStock is false
        if (outOfStock === false || outOfStock === 'false') {
            query += ` AND inventory > 0`;
        }

        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(limitNum, offset);

        const [rows] = await db.execute(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE status = "active"';
        let countParams = [];

        if (search) {
            countQuery += ` AND (productName LIKE ? OR sku LIKE ? OR categoryName LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (categoryID) {
            countQuery += ` AND categoryID = ?`;
            countParams.push(categoryID);
        }

        if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
            countQuery += ` AND productPrice >= ?`;
            countParams.push(parseFloat(minPrice));
        }

        if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
            countQuery += ` AND productPrice <= ?`;
            countParams.push(parseFloat(maxPrice));
        }

        // Filter out-of-stock products in count query if outOfStock is false
        if (outOfStock === false || outOfStock === 'false') {
            countQuery += ` AND inventory > 0`;
        }

        const [countResult] = await db.execute(countQuery, countParams);
        const total = countResult[0].total;

        return {
            products: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        };
    } catch (error) {
        throw new Error(`Error fetching products: ${error.message}`);
    }
}

// Get product by ID
async function getProductById(productID) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM products WHERE productID = ?',
            [productID]
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching product: ${error.message}`);
    }
}

// Delete all products (dangerous operation)
async function deleteAllProducts() {
    try {
        // Hard delete all products. Foreign keys should cascade as per schema.
        const [result] = await db.execute('DELETE FROM products');
        return { affectedRows: result.affectedRows };
    } catch (error) {
        throw new Error(`Error deleting all products: ${error.message}`);
    }
}

// Update product
async function updateProduct(productID, productData) {
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
            inventory,
            status
        } = productData;

        const [result] = await db.execute(
            'UPDATE products SET \n                productName = ?, productPrice = ?, sku = ?, description = ?,\n                boxQty = ?, minQty = ?, categoryID = ?, categoryName = ?, themeCategory = ?,\n                featuredImages = ?, galleryImages = ?, inventory = ?, status = ?,\n                updatedAt = CURRENT_TIMESTAMP\n            WHERE productID = ?',
            [
                productName,
                productPrice,
                sku,
                description,
                boxQty,
                minQty,
                categoryID,
                categoryName,
                themeCategory || null,
                featuredImages,
                JSON.stringify(galleryImages),
                inventory,
                status,
                productID
            ]
        );

        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        throw new Error(`Error updating product: ${error.message}`);
    }
}

// Delete product
async function deleteProduct(productID) {
    try {
        const [result] = await db.execute(
            'DELETE FROM products WHERE productID = ?',
            [productID]
        );
        return {
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error deleting product: ${error.message}`);
    }
}

// Get categories
async function getCategories() {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM categories ORDER BY categoryName ASC'
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching categories: ${error.message}`);
    }
}

// Get products by category
async function getProductsByCategory(categoryID, page = 1, limit = 24) {
    try {
        // Ensure page and limit are integers
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 24;
        const offset = (pageNum - 1) * limitNum;

        const query = `SELECT * FROM products WHERE categoryID = ? AND status = 'active' ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        const [rows] = await db.execute(query, [categoryID, limitNum, offset]);

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM products WHERE categoryID = ? AND status = 'active'`;
        const [countResult] = await db.execute(countQuery, [categoryID]);
        const total = countResult[0].total;

        return {
            products: rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        };
    } catch (error) {
        throw new Error(`Error fetching products by category: ${error.message}`);
    }
}

// Create category
async function createCategory(categoryData) {
    try {
        const categoryID = `CAT${Date.now()}`;
        const { categoryName, image } = categoryData;

        const [result] = await db.execute(
            'INSERT INTO categories (categoryID, categoryName, image) VALUES (?, ?, ?)',
            [categoryID, categoryName, image]
        );

        return {
            categoryID,
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error creating category: ${error.message}`);
    }
}

// Update inventory by SKU
async function updateInventoryBySku(sku, inventory) {
    try {
        const [result] = await db.execute(
            'UPDATE products SET inventory = ?, updatedAt = CURRENT_TIMESTAMP WHERE sku = ?',
            [inventory, sku]
        );

        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        throw new Error(`Error updating inventory by SKU: ${error.message}`);
    }
}

// Check if SKU exists
async function checkSkuExists(sku) {
    try {
        const [rows] = await db.execute(
            'SELECT productID, productName, sku, inventory FROM products WHERE sku = ?',
            [sku]
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error checking SKU: ${error.message}`);
    }
}

// Update product fields by SKU
async function updateProductBySku(sku, updateFields) {
    try {
        const fields = [];
        const values = [];

        // Build dynamic update query
        for (const [key, value] of Object.entries(updateFields)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        // Add updatedAt timestamp
        fields.push('updatedAt = CURRENT_TIMESTAMP');
        values.push(sku);

        const query = `UPDATE products SET ${fields.join(', ')} WHERE sku = ?`;
        const [result] = await db.execute(query, values);

        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        throw new Error(`Error updating product by SKU: ${error.message}`);
    }
}

// Bulk create products (for supplier integration)
async function bulkCreateProducts(productsData) {
    try {
        const results = [];
        const errors = [];

        for (let i = 0; i < productsData.length; i++) {
            const productData = productsData[i];
            try {
                // Check if SKU already exists
                const existingProduct = await checkSkuExists(productData.sku);

                if (existingProduct) {
                    // SKU exists, override ALL data with request data
                    // The controller has already normalized the data (boxQty, minQty, themeCategory)
                    const {
                        productName,
                        productPrice,
                        description = '',
                        inventory = 0,
                        boxQty = 1,
                        minQty = 1,
                        categoryID = null,
                        categoryName = null,
                        themeCategory = null,
                        featuredImages = '',
                        galleryImages = []
                    } = productData;

                    // Prepare all update fields - override with request data
                    const updateFields = {
                        productName: productName || '',
                        productPrice: (productPrice !== undefined && productPrice !== null && !isNaN(productPrice)) ? parseFloat(productPrice) : 0,
                        description: description || '',
                        inventory: (inventory !== undefined && inventory !== null && !isNaN(inventory)) ? parseInt(inventory) : 0,
                        boxQty: (boxQty !== undefined && boxQty !== null && !isNaN(boxQty) && parseInt(boxQty) >= 1) ? parseInt(boxQty) : 1,
                        minQty: (minQty !== undefined && minQty !== null && !isNaN(minQty) && parseInt(minQty) >= 1) ? parseInt(minQty) : 1,
                        categoryID: categoryID || null,
                        categoryName: categoryName || null,
                        themeCategory: (themeCategory && themeCategory.trim() !== '') ? themeCategory.trim() : null,
                        featuredImages: featuredImages || ''
                    };

                    // Handle galleryImages (array should be JSON stringified)
                    if (Array.isArray(galleryImages)) {
                        updateFields.galleryImages = JSON.stringify(galleryImages);
                    } else if (typeof galleryImages === 'string') {
                        updateFields.galleryImages = galleryImages;
                    } else {
                        updateFields.galleryImages = JSON.stringify([]);
                    }

                    // Update all fields - complete override
                    await updateProductBySku(productData.sku, updateFields);

                    results.push({
                        index: i,
                        sku: productData.sku,
                        productID: existingProduct.productID,
                        productName: updateFields.productName,
                        oldInventory: existingProduct.inventory,
                        newInventory: updateFields.inventory,
                        status: 'updated'
                    });
                    continue;
                }

                // Generate unique product ID
                const productID = await generateUniqueProductID();

                // Map incoming data to database columns
                // boxQty and minQty should already be normalized in controller (default to 1)
                const {
                    sku,
                    productName,
                    productPrice,
                    description = '',
                    inventory = 0,
                    boxQty = 1,
                    minQty = 1,
                    themeCategory = null
                } = productData;

                // Ensure boxQty and minQty are at least 1
                const finalBoxQty = (boxQty !== null && boxQty !== undefined && !isNaN(boxQty) && parseInt(boxQty) >= 1) ? parseInt(boxQty) : 1;
                const finalMinQty = (minQty !== null && minQty !== undefined && !isNaN(minQty) && parseInt(minQty) >= 1) ? parseInt(minQty) : 1;

                // Insert product
                const [result] = await db.execute(
                    'INSERT INTO products (productID, productName, productPrice, sku, description, inventory, boxQty, minQty, themeCategory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        productID,
                        productName,
                        productPrice || 0,
                        sku,
                        description,
                        inventory,
                        finalBoxQty,
                        finalMinQty,
                        themeCategory || null
                    ]
                );

                results.push({
                    index: i,
                    sku,
                    productID,
                    productName,
                    status: 'created'
                });

            } catch (productError) {
                errors.push({
                    index: i,
                    sku: productData.sku || 'undefined',
                    error: `Failed to process: ${productError.message}`
                });
            }
        }

        return {
            total: productsData.length,
            successful: results.length,
            failed: errors.length,
            results,
            errors
        };

    } catch (error) {
        throw new Error(`Error creating products in bulk: ${error.message}`);
    }
}

module.exports = {
    createProduct,
    getAllProducts,
    deleteAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getCategories,
    createCategory,
    getProductsByCategory,
    updateInventoryBySku,
    updateProductBySku,
    checkSkuExists,
    bulkCreateProducts
};
