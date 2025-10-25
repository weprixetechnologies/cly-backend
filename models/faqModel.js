const db = require('../utils/dbconnect');

// Get all FAQs
async function getAllFAQs() {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM faqs WHERE is_active = 1 ORDER BY display_order ASC, createdAt DESC'
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching FAQs: ${error.message}`);
    }
}

// Get FAQ by ID
async function getFAQById(id) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM faqs WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching FAQ: ${error.message}`);
    }
}

// Create new FAQ
async function createFAQ(faqData) {
    try {
        const { question, answer, display_order = 0, is_active = 1 } = faqData;

        const [result] = await db.execute(
            'INSERT INTO faqs (question, answer, display_order, is_active, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [question, answer, display_order, is_active]
        );

        return result.insertId;
    } catch (error) {
        throw new Error(`Error creating FAQ: ${error.message}`);
    }
}

// Update FAQ
async function updateFAQ(id, faqData) {
    try {
        const { question, answer, display_order, is_active } = faqData;

        const [result] = await db.execute(
            'UPDATE faqs SET question = ?, answer = ?, display_order = ?, is_active = ?, updatedAt = NOW() WHERE id = ?',
            [question, answer, display_order, is_active, id]
        );

        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error updating FAQ: ${error.message}`);
    }
}

// Delete FAQ
async function deleteFAQ(id) {
    try {
        const [result] = await db.execute(
            'DELETE FROM faqs WHERE id = ?',
            [id]
        );

        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(`Error deleting FAQ: ${error.message}`);
    }
}

// Update FAQ display order
async function updateFAQOrder(updates) {
    try {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const update of updates) {
                await connection.execute(
                    'UPDATE faqs SET display_order = ? WHERE id = ?',
                    [update.display_order, update.id]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        throw new Error(`Error updating FAQ order: ${error.message}`);
    }
}

module.exports = {
    getAllFAQs,
    getFAQById,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    updateFAQOrder
};
