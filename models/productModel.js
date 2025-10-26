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
            featuredImages,
            galleryImages,
            inventory
        } = productData;

        const [result] = await db.execute(
            'INSERT INTO products (\n                productID, productName, productPrice, sku, description, \n                boxQty, minQty, categoryID, categoryName, \n                featuredImages, galleryImages, inventory\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
async function getAllProducts(page = 1, limit = 10, search = '') {
    try {
        // Ensure page and limit are integers
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        let query = 'SELECT * FROM products WHERE 1=1';
        let params = [];

        if (search) {
            query += ` AND (productName LIKE ? OR sku LIKE ? OR categoryName LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(limitNum, offset);

        const [rows] = await db.execute(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
        let countParams = [];

        if (search) {
            countQuery += ` AND (productName LIKE ? OR sku LIKE ? OR categoryName LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
            featuredImages,
            galleryImages,
            inventory,
            status
        } = productData;

        const [result] = await db.execute(
            'UPDATE products SET \n                productName = ?, productPrice = ?, sku = ?, description = ?,\n                boxQty = ?, minQty = ?, categoryID = ?, categoryName = ?,\n                featuredImages = ?, galleryImages = ?, inventory = ?, status = ?,\n                updatedAt = CURRENT_TIMESTAMP\n            WHERE productID = ?',
            [
                productName,
                productPrice,
                sku,
                description,
                boxQty,
                minQty,
                categoryID,
                categoryName,
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
                    errors.push({
                        index: i,
                        sku: productData.sku,
                        error: 'SKU already exists',
                        action: 'skipped'
                    });
                    continue;
                }

                // Generate unique product ID
                const productID = await generateUniqueProductID();

                // Map incoming data to database columns
                const {
                    sku,
                    productName,
                    productPrice,
                    description = '',
                    inventory = 0
                } = productData;

                // Insert product
                const [result] = await db.execute(
                    'INSERT INTO products (productID, productName, productPrice, sku, description, inventory) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        productID,
                        productName,
                        productPrice || 0,

                        sku,
                        description,
                        inventory
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
                    error: `Failed to create product: ${productError.message}`
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
