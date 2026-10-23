const db = require('../utils/dbconnect');
const slugify = require('../utils/slugify');

// Check if category name exists
async function checkCategoryNameExists(categoryName, excludeId = null) {
    try {
        let query = `SELECT categoryID FROM categories WHERE categoryName = ?`;
        const params = [categoryName];

        if (excludeId) {
            query += ` AND categoryID != ?`;
            params.push(excludeId);
        }

        const [rows] = await db.execute(query, params);
        return rows.length > 0;
    } catch (error) {
        throw new Error(`Error checking category name: ${error.message}`);
    }
}

// Check if category slug exists
async function checkCategorySlugExists(slug, excludeId = null) {
    try {
        if (!slug) return false;
        let query = `SELECT categoryID FROM categories WHERE slug = ?`;
        const params = [slug];

        if (excludeId) {
            query += ` AND categoryID != ?`;
            params.push(excludeId);
        }

        const [rows] = await db.execute(query, params);
        return rows.length > 0;
    } catch (error) {
        throw new Error(`Error checking category slug: ${error.message}`);
    }
}

// Generate a unique category slug
async function generateUniqueCategorySlug(nameOrSlug, excludeId = null) {
    try {
        const baseSlug = slugify(nameOrSlug) || 'category';
        let uniqueSlug = baseSlug;
        let counter = 1;

        while (await checkCategorySlugExists(uniqueSlug, excludeId)) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }

        return uniqueSlug;
    } catch (error) {
        throw new Error(`Error generating unique slug: ${error.message}`);
    }
}

// Create new category
async function createCategory(categoryData, connection = null) {
    try {
        const { categoryID, categoryName, image, productCount, slug } = categoryData;
        const finalSlug = slug || await generateUniqueCategorySlug(categoryName);

        const query = `INSERT INTO categories (categoryID, categoryName, slug, image, productCount, createdAt) 
                       VALUES (?, ?, ?, ?, ?, NOW())`;
        const values = [categoryID, categoryName, finalSlug, image || null, productCount || 0];

        let result;
        if (connection) {
            [result] = await connection.execute(query, values);
        } else {
            [result] = await db.execute(query, values);
        }

        return {
            categoryID,
            categoryName,
            slug: finalSlug,
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

// Get category by ID or Slug
async function getCategoryById(identifier) {
    try {
        const query = `SELECT * FROM categories WHERE categoryID = ? OR slug = ? LIMIT 1`;
        const [rows] = await db.execute(query, [identifier, identifier]);
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error getting category: ${error.message}`);
    }
}

// Update category
async function updateCategory(categoryID, updateData, connection = null) {
    try {
        const allowedFields = ['categoryName', 'slug', 'image', 'productCount'];
        const updateFields = [];
        const values = [];

        // Only update allowed fields
        allowedFields.forEach(key => {
            if (updateData[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(categoryID);
        const query = `
            UPDATE categories 
            SET ${updateFields.join(', ')} 
            WHERE categoryID = ?
        `;

        const executor = connection || db;
        const [result] = await executor.execute(query, values);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating category: ${error.message}`);
    }
}

// Delete category
async function deleteCategory(categoryID, connection = null) {
    try {
        const query = `DELETE FROM categories WHERE categoryID = ?`;

        const executor = connection || db;
        const [result] = await executor.execute(query, [categoryID]);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error deleting category: ${error.message}`);
    }
}

// Update product count for a category
async function updateProductCount(categoryID, increment = true) {
    try {
        const operation = increment ? '+' : '-';
        const query = `UPDATE categories SET productCount = productCount ${operation} 1 WHERE categoryID = ?`;
        const [result] = await db.execute(query, [categoryID]);
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
    checkCategorySlugExists,
    generateUniqueCategorySlug,
    updateProductCount
};
