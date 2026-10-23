const categoryModel = require('../models/categoryModel');
const slugify = require('../utils/slugify');

// Get all categories
const getAllCategories = async () => {
    try {
        const categories = await categoryModel.getAllCategories();
        return categories;
    } catch (error) {
        console.error('Error in getAllCategories service:', error);
        throw error;
    }
};

// Get category by ID or slug
const getCategoryById = async (categoryID) => {
    try {
        const category = await categoryModel.getCategoryById(categoryID);
        return category;
    } catch (error) {
        console.error('Error in getCategoryById service:', error);
        throw error;
    }
};

// Create new category
const createCategory = async (categoryData) => {
    try {
        // Check if category name already exists
        const nameExists = await categoryModel.checkCategoryNameExists(categoryData.categoryName);
        if (nameExists) {
            throw new Error('Category name already exists');
        }

        // Determine and validate slug
        let slug = categoryData.slug ? slugify(categoryData.slug) : slugify(categoryData.categoryName);
        if (slug) {
            const slugExists = await categoryModel.checkCategorySlugExists(slug);
            if (slugExists) {
                if (categoryData.slug) {
                    throw new Error('Category slug already exists');
                } else {
                    slug = await categoryModel.generateUniqueCategorySlug(slug);
                }
            }
        } else {
            slug = await categoryModel.generateUniqueCategorySlug('category');
        }

        // Generate unique category ID
        const categoryID = `CAT_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const newCategoryData = {
            ...categoryData,
            categoryID,
            slug
        };

        const category = await categoryModel.createCategory(newCategoryData);
        return category;
    } catch (error) {
        console.error('Error in createCategory service:', error);
        throw error;
    }
};

// Update category
const updateCategory = async (categoryID, updateData) => {
    try {
        // Check if category exists
        const existingCategory = await categoryModel.getCategoryById(categoryID);
        if (!existingCategory) {
            throw new Error('Category not found');
        }

        // Check if new name conflicts with existing categories (if name is being updated)
        if (updateData.categoryName && updateData.categoryName !== existingCategory.categoryName) {
            const nameExists = await categoryModel.checkCategoryNameExists(updateData.categoryName, categoryID);
            if (nameExists) {
                throw new Error('Category name already exists');
            }
        }

        // Handle slug
        if (updateData.slug !== undefined && updateData.slug !== null && updateData.slug !== '') {
            const finalSlug = slugify(updateData.slug);
            if (!finalSlug) {
                throw new Error('Invalid category slug');
            }
            const slugExists = await categoryModel.checkCategorySlugExists(finalSlug, categoryID);
            if (slugExists) {
                throw new Error('Category slug already exists');
            }
            updateData.slug = finalSlug;
        } else if (!existingCategory.slug) {
            // If existing category doesn't have a slug, generate one
            updateData.slug = await categoryModel.generateUniqueCategorySlug(
                updateData.categoryName || existingCategory.categoryName,
                categoryID
            );
        }

        const updated = await categoryModel.updateCategory(categoryID, updateData);
        if (!updated) {
            throw new Error('Failed to update category');
        }

        // Return updated category
        return await categoryModel.getCategoryById(categoryID);
    } catch (error) {
        console.error('Error in updateCategory service:', error);
        throw error;
    }
};

// Delete category
const deleteCategory = async (categoryID) => {
    try {
        // Check if category exists
        const existingCategory = await categoryModel.getCategoryById(categoryID);
        if (!existingCategory) {
            throw new Error('Category not found');
        }

        // Check if category has products
        if (existingCategory.productCount > 0) {
            throw new Error('Cannot delete category with existing products');
        }

        const deleted = await categoryModel.deleteCategory(categoryID);
        if (!deleted) {
            throw new Error('Failed to delete category');
        }

        return true;
    } catch (error) {
        console.error('Error in deleteCategory service:', error);
        throw error;
    }
};

// Update product count for category
const updateCategoryProductCount = async (categoryID, increment = true) => {
    try {
        // Check if category exists
        const existingCategory = await categoryModel.getCategoryById(categoryID);
        if (!existingCategory) {
            throw new Error('Category not found');
        }

        const updated = await categoryModel.updateProductCount(categoryID, increment);
        if (!updated) {
            throw new Error('Failed to update product count');
        }

        return true;
    } catch (error) {
        console.error('Error in updateCategoryProductCount service:', error);
        throw error;
    }
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    updateCategoryProductCount
};
