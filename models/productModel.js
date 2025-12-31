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
            inventory,
            isFeatured
        } = productData;

        const [result] = await db.execute(
            'INSERT INTO products (\n                productID, productName, productPrice, sku, description, \n                boxQty, minQty, categoryID, categoryName, themeCategory, \n                featuredImages, galleryImages, inventory, isFeatured\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
                inventory,
                isFeatured ? 1 : 0
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
async function getAllProducts(page = 1, limit = 10, search = '', categoryID = '', minPrice = null, maxPrice = null, outOfStock = true, status = null, isFeatured = null) {
    try {
        // Ensure page and limit are integers
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        // Build WHERE clause - if status is provided, filter by it; otherwise show all
        let query = 'SELECT * FROM products WHERE 1=1';
        let params = [];

        // Filter by status if provided (active, inactive, or all)
        if (status && typeof status === 'string' && (status === 'active' || status === 'inactive')) {
            query += ` AND status = ?`;
            params.push(status);
        }

        // Validate and add search parameter
        if (search && typeof search === 'string' && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`;
            query += ` AND (productName LIKE ? OR sku LIKE ? OR categoryName LIKE ?)`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Validate and add categoryID parameter
        if (categoryID && typeof categoryID === 'string' && categoryID.trim() !== '') {
            query += ` AND categoryID = ?`;
            params.push(categoryID.trim());
        }

        // Validate and add minPrice parameter
        if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
            const minPriceNum = parseFloat(minPrice);
            if (!isNaN(minPriceNum) && isFinite(minPriceNum)) {
                query += ` AND productPrice >= ?`;
                params.push(minPriceNum);
            }
        }

        // Validate and add maxPrice parameter
        if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
            const maxPriceNum = parseFloat(maxPrice);
            if (!isNaN(maxPriceNum) && isFinite(maxPriceNum)) {
                query += ` AND productPrice <= ?`;
                params.push(maxPriceNum);
            }
        }

        // Filter out-of-stock products if outOfStock is false
        if (outOfStock === false || outOfStock === 'false') {
            query += ` AND inventory > 0`;
        }

        // Filter by isFeatured if provided (true/false)
        if (isFeatured !== null && isFeatured !== undefined && isFeatured !== '') {
            const isFeaturedValue = isFeatured === true || isFeatured === 'true' || isFeatured === 1 || isFeatured === '1' ? 1 : 0;
            query += ` AND isFeatured = ?`;
            params.push(isFeaturedValue);
        }

        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(limitNum, offset);

        const [rows] = await db.execute(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
        let countParams = [];

        // Filter by status if provided
        if (status && typeof status === 'string' && (status === 'active' || status === 'inactive')) {
            countQuery += ` AND status = ?`;
            countParams.push(status);
        }

        // Validate and add search parameter
        if (search && typeof search === 'string' && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`;
            countQuery += ` AND (productName LIKE ? OR sku LIKE ? OR categoryName LIKE ?)`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        // Validate and add categoryID parameter
        if (categoryID && typeof categoryID === 'string' && categoryID.trim() !== '') {
            countQuery += ` AND categoryID = ?`;
            countParams.push(categoryID.trim());
        }

        // Validate and add minPrice parameter
        if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
            const minPriceNum = parseFloat(minPrice);
            if (!isNaN(minPriceNum) && isFinite(minPriceNum)) {
                countQuery += ` AND productPrice >= ?`;
                countParams.push(minPriceNum);
            }
        }

        // Validate and add maxPrice parameter
        if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
            const maxPriceNum = parseFloat(maxPrice);
            if (!isNaN(maxPriceNum) && isFinite(maxPriceNum)) {
                countQuery += ` AND productPrice <= ?`;
                countParams.push(maxPriceNum);
            }
        }

        // Filter out-of-stock products in count query if outOfStock is false
        if (outOfStock === false || outOfStock === 'false') {
            countQuery += ` AND inventory > 0`;
        }

        // Filter by isFeatured in count query if provided
        if (isFeatured !== null && isFeatured !== undefined && isFeatured !== '') {
            const isFeaturedValue = isFeatured === true || isFeatured === 'true' || isFeatured === 1 || isFeatured === '1' ? 1 : 0;
            countQuery += ` AND isFeatured = ?`;
            countParams.push(isFeaturedValue);
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
            status,
            isFeatured
        } = productData;

        const [result] = await db.execute(
            'UPDATE products SET \n                productName = ?, productPrice = ?, sku = ?, description = ?,\n                boxQty = ?, minQty = ?, categoryID = ?, categoryName = ?, themeCategory = ?,\n                featuredImages = ?, galleryImages = ?, inventory = ?, status = ?, isFeatured = ?,\n                updatedAt = CURRENT_TIMESTAMP\n            WHERE productID = ?',
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
                isFeatured ? 1 : 0,
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
        console.log('updateFields', updateFields);

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

// Remove category assignment from all products in a category
async function clearCategoryFromProducts(categoryID) {
    try {
        const [result] = await db.execute(
            `UPDATE products SET categoryID = NULL, categoryName = NULL, updatedAt = CURRENT_TIMESTAMP WHERE categoryID = ?`,
            [categoryID]
        );
        return { affectedRows: result.affectedRows };
    } catch (error) {
        throw new Error(`Error clearing category from products: ${error.message}`);
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
                // Skip products with missing, null, or empty SKU
                const productSku = productData.sku;
                if (!productSku || productSku === null || productSku === undefined || String(productSku).trim() === '') {
                    errors.push({
                        index: i,
                        sku: 'undefined',
                        error: 'SKU is missing, null, or empty - product skipped'
                    });
                    continue;
                }

                // Check if SKU already exists
                const existingProduct = await checkSkuExists(productData.sku);

                if (existingProduct) {
                    // SKU exists, update only: productName, productPrice, inventory, boxQty, minQty
                    const {
                        productName,
                        productPrice,
                        inventory = 0,
                        boxQty = 1,
                        minQty = 1
                    } = productData;

                    // Prepare update fields - only update specified fields
                    const updateFields = {
                        productName: productName || '',
                        productPrice: (productPrice !== undefined && productPrice !== null && !isNaN(productPrice)) ? parseFloat(productPrice) : 0,
                        inventory: (inventory !== undefined && inventory !== null && !isNaN(inventory)) ? parseInt(inventory) : 0,
                        boxQty: (boxQty !== undefined && boxQty !== null && !isNaN(boxQty) && parseInt(boxQty) >= 1) ? parseInt(boxQty) : 1,
                        minQty: (minQty !== undefined && minQty !== null && !isNaN(minQty) && parseInt(minQty) >= 1) ? parseInt(minQty) : 1
                    };

                    // Update only specified fields (no category, description, themeCategory, images)
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
                    inventory = 0,
                    boxQty = 1,
                    minQty = 1
                } = productData;

                // Ensure boxQty and minQty are at least 1
                const finalBoxQty = (boxQty !== null && boxQty !== undefined && !isNaN(boxQty) && parseInt(boxQty) >= 1) ? parseInt(boxQty) : 1;
                const finalMinQty = (minQty !== null && minQty !== undefined && !isNaN(minQty) && parseInt(minQty) >= 1) ? parseInt(minQty) : 1;

                // Insert product - only insert specified fields
                const [result] = await db.execute(
                    'INSERT INTO products (productID, productName, productPrice, sku, inventory, boxQty, minQty) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        productID,
                        productName,
                        productPrice || 0,
                        sku,
                        inventory,
                        finalBoxQty,
                        finalMinQty
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

// Get featured products
async function getFeaturedProducts(limit = 20) {
    try {
        const limitNum = parseInt(limit) || 20;
        const query = `SELECT * FROM products WHERE isFeatured = 1 AND status = 'active' ORDER BY createdAt DESC LIMIT ?`;
        const [rows] = await db.execute(query, [limitNum]);
        return rows;
    } catch (error) {
        throw new Error(`Error fetching featured products: ${error.message}`);
    }
}

// Get product statistics with filters
async function getProductStats(search = '', categoryID = '', status = null, isFeatured = null) {
    try {
        // Build WHERE clause
        let whereClause = 'WHERE 1=1';
        let params = [];

        // Filter by status if provided
        if (status && (status === 'active' || status === 'inactive')) {
            whereClause += ` AND status = ?`;
            params.push(status);
        }

        if (search) {
            whereClause += ` AND (productName LIKE ? OR sku LIKE ? OR categoryName LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (categoryID) {
            whereClause += ` AND categoryID = ?`;
            params.push(categoryID);
        }

        // Filter by isFeatured if provided
        if (isFeatured !== null && isFeatured !== undefined && isFeatured !== '') {
            const isFeaturedValue = isFeatured === true || isFeatured === 'true' || isFeatured === 1 || isFeatured === '1' ? 1 : 0;
            whereClause += ` AND isFeatured = ?`;
            params.push(isFeaturedValue);
        }

        // Get total count
        const [totalResult] = await db.execute(
            `SELECT COUNT(*) as total FROM products ${whereClause}`,
            params
        );
        const total = totalResult[0].total;

        // Get active count (only if not filtering by inactive)
        let active = 0;
        if (status !== 'inactive') {
            const activeParams = [...params];
            const activeWhereClause = status === 'active' ? whereClause : whereClause + ` AND status = 'active'`;
            if (status !== 'active') {
                activeParams.push('active');
            }
            const [activeResult] = await db.execute(
                `SELECT COUNT(*) as total FROM products ${activeWhereClause}`,
                activeParams
            );
            active = activeResult[0].total;
        }

        // Get inactive count (only if not filtering by active)
        let inactive = 0;
        if (status !== 'active') {
            const inactiveParams = [...params];
            const inactiveWhereClause = status === 'inactive' ? whereClause : whereClause + ` AND status = 'inactive'`;
            if (status !== 'inactive') {
                inactiveParams.push('inactive');
            }
            const [inactiveResult] = await db.execute(
                `SELECT COUNT(*) as total FROM products ${inactiveWhereClause}`,
                inactiveParams
            );
            inactive = inactiveResult[0].total;
        }

        // Get low stock count (inventory < 10)
        const [lowStockResult] = await db.execute(
            `SELECT COUNT(*) as total FROM products ${whereClause} AND inventory > 0 AND inventory < 10`,
            params
        );
        const lowStock = lowStockResult[0].total;

        // Get out of stock count (inventory = 0)
        const [outOfStockResult] = await db.execute(
            `SELECT COUNT(*) as total FROM products ${whereClause} AND inventory = 0`,
            params
        );
        const outOfStock = outOfStockResult[0].total;

        // Get total categories count (distinct categories in filtered results)
        const [categoriesResult] = await db.execute(
            `SELECT COUNT(DISTINCT categoryID) as total FROM products ${whereClause} AND categoryID IS NOT NULL`,
            params
        );
        const totalCategories = categoriesResult[0].total;

        // Get total inventory value
        const [inventoryValueResult] = await db.execute(
            `SELECT SUM(inventory * productPrice) as total FROM products ${whereClause}`,
            params
        );
        const inventoryValue = inventoryValueResult[0].total || 0;

        return {
            total,
            active,
            inactive,
            lowStock,
            outOfStock,
            totalCategories,
            inventoryValue: parseFloat(inventoryValue)
        };
    } catch (error) {
        throw new Error(`Error fetching product stats: ${error.message}`);
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
    bulkCreateProducts,
    clearCategoryFromProducts,
    getProductStats,
    getFeaturedProducts
};
