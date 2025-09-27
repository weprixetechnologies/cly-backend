const categoryService = require('../services/categoryService');

// Get all categories
const getAllCategories = async (req, res) => {
    try {
        const categories = await categoryService.getAllCategories();

        res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error getting all categories:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
    try {
        const { categoryID } = req.params;

        const category = await categoryService.getCategoryById(categoryID);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            category
        });
    } catch (error) {
        console.error('Error getting category by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Create new category
const createCategory = async (req, res) => {
    try {
        const { categoryName, image } = req.body;

        // Validate required fields
        if (!categoryName || categoryName.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const categoryData = {
            categoryName: categoryName.trim(),
            image: image || null
        };

        const category = await categoryService.createCategory(categoryData);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category
        });
    } catch (error) {
        console.error('Error creating category:', error);

        if (error.message === 'Category name already exists') {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { categoryID } = req.params;
        const updateData = req.body;

        // Validate category name if provided
        if (updateData.categoryName && updateData.categoryName.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Category name cannot be empty'
            });
        }

        // Clean up the data
        if (updateData.categoryName) {
            updateData.categoryName = updateData.categoryName.trim();
        }

        const updatedCategory = await categoryService.updateCategory(categoryID, updateData);

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            category: updatedCategory
        });
    } catch (error) {
        console.error('Error updating category:', error);

        if (error.message === 'Category not found') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Category name already exists') {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const { categoryID } = req.params;

        await categoryService.deleteCategory(categoryID);

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);

        if (error.message === 'Category not found') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Cannot delete category with existing products') {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update category product count
const updateCategoryProductCount = async (req, res) => {
    try {
        const { categoryID } = req.params;
        const { increment = true } = req.body;

        await categoryService.updateCategoryProductCount(categoryID, increment);

        res.status(200).json({
            success: true,
            message: 'Category product count updated successfully'
        });
    } catch (error) {
        console.error('Error updating category product count:', error);

        if (error.message === 'Category not found') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
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
