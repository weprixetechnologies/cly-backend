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
            packQty,
            minQty,
            categoryID,
            categoryName,
            featuredImages,
            galleryImages,
            inventory
        } = productData;

        const [result] = await db.execute(
            `INSERT INTO products (
                productID, productName, productPrice, sku, description, 
                boxQty, packQty, minQty, categoryID, categoryName, 
                featuredImages, galleryImages, inventory
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                productID, productName, productPrice, sku, description,
                boxQty, packQty, minQty, categoryID, categoryName,
                featuredImages, JSON.stringify(galleryImages), inventory
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
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM products WHERE 1=1';
        let params = [];

        if (search) {
            query += ' AND (productName LIKE ? OR sku LIKE ? OR categoryName LIKE ?)';
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm];
        }

        query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.execute(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
        let countParams = [];

        if (search) {
            countQuery += ' AND (productName LIKE ? OR sku LIKE ? OR categoryName LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams = [searchTerm, searchTerm, searchTerm];
        }

        const [countResult] = await db.execute(countQuery, countParams);
        const total = countResult[0].total;

        return {
            products: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
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
            packQty,
            minQty,
            categoryID,
            categoryName,
            featuredImages,
            galleryImages,
            inventory,
            status
        } = productData;

        const [result] = await db.execute(
            `UPDATE products SET 
                productName = ?, productPrice = ?, sku = ?, description = ?,
                boxQty = ?, packQty = ?, minQty = ?, categoryID = ?, categoryName = ?,
                featuredImages = ?, galleryImages = ?, inventory = ?, status = ?,
                updatedAt = CURRENT_TIMESTAMP
            WHERE productID = ?`,
            [
                productName, productPrice, sku, description,
                boxQty, packQty, minQty, categoryID, categoryName,
                featuredImages, JSON.stringify(galleryImages), inventory, status,
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

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getCategories,
    createCategory
};
