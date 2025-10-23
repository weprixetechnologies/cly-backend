const db = require('../utils/dbconnect');

// Create new category
async function createCategory(categoryData, connection = null) {
    try {
        const { categoryID, categoryName, image, productCount } = categoryData;

        const query = `INSERT INTO categories (categoryID, categoryName, image, productCount, createdAt) 
                       VALUES ('${categoryID}', '${categoryName}', '${image}', ${productCount || 0}, NOW())`;

        let result;
        if (connection) {
            [result] = await connection.execute(query);
        } else {
            [result] = await db.execute(query);
        }

        return {
            categoryID,
            categoryName,
            image,
            productCount: productCount || 0,
            createdAt: new Date()
        };
    } catch (error) {
        throw new Error(`Error creating category: ${error.message}`);
    }
}

// Get all categories
async function getAllCategories() {
    try {
        const query = `SELECT * FROM categories ORDER BY createdAt DESC`;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        throw new Error(`Error getting all categories: ${error.message}`);
    }
}

// Get category by ID
async function getCategoryById(categoryID) {
    try {
        const query = `SELECT * FROM categories WHERE categoryID = '${categoryID}'`;
        const [rows] = await db.execute(query);
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error getting category by ID: ${error.message}`);
    }
}

// Update category
async function updateCategory(categoryID, updateData, connection = null) {
    try {
        const allowedFields = ['categoryName', 'image', 'productCount'];
        const updateFields = [];
        const values = [];

        // Only update allowed fields
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                updateFields.push(`${key} = '${updateData[key]}'`);
            }
        });

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        // Note: updatedAt field not available in categories table

        const query = `
            UPDATE categories 
            SET ${updateFields.join(', ')} 
            WHERE categoryID = ?
        `;

        if (connection) {
            const [result] = await connection.execute(query, [categoryID]);
            return result.affectedRows > 0;
        } else {
            const [result] = await db.execute(query, [categoryID]);
            return result.affectedRows > 0;
        }
    } catch (error) {
        throw new Error(`Error updating category: ${error.message}`);
    }
}

// Delete category
async function deleteCategory(categoryID, connection = null) {
    try {
        const query = `DELETE FROM categories WHERE categoryID = '${categoryID}'`;

        if (connection) {
            const [result] = await connection.execute(query);
            return result.affectedRows > 0;
        } else {
            const [result] = await db.execute(query);
            return result.affectedRows > 0;
        }
    } catch (error) {
        throw new Error(`Error deleting category: ${error.message}`);
    }
}

// Check if category name exists
async function checkCategoryNameExists(categoryName, excludeId = null) {
    try {
        let query = `SELECT categoryID FROM categories WHERE categoryName = '${categoryName}'`;

        if (excludeId) {
            query += ` AND categoryID != '${excludeId}'`;
        }

        const [rows] = await db.execute(query);
        return rows.length > 0;
    } catch (error) {
        throw new Error(`Error checking category name: ${error.message}`);
    }
}

// Update product count for a category
async function updateProductCount(categoryID, increment = true) {
    try {
        const operation = increment ? '+' : '-';
        const query = `UPDATE categories SET productCount = productCount ${operation} 1 WHERE categoryID = '${categoryID}'`;
        const [result] = await db.execute(query);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating product count: ${error.message}`);
    }
}

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    checkCategoryNameExists,
    updateProductCount
};
