const db = require('../utils/dbconnect');

// Get about us content
async function getAboutContent() {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM about_us WHERE id = 1'
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching about content: ${error.message}`);
    }
}

// Update about us content
async function updateAboutContent(contentData) {
    try {
        const { title, content, mission, vision, company_values, is_active = 1 } = contentData;
        
        // Check if record exists
        const existing = await getAboutContent();
        
        if (existing) {
            // Update existing record
            const [result] = await db.execute(
                'UPDATE about_us SET title = ?, content = ?, mission = ?, vision = ?, company_values = ?, is_active = ?, updatedAt = NOW() WHERE id = 1',
                [title, content, mission, vision, company_values, is_active]
            );
            return result.affectedRows > 0;
        } else {
            // Create new record
            const [result] = await db.execute(
                'INSERT INTO about_us (id, title, content, mission, vision, company_values, is_active, createdAt, updatedAt) VALUES (1, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [title, content, mission, vision, company_values, is_active]
            );
            return result.affectedRows > 0;
        }
    } catch (error) {
        throw new Error(`Error updating about content: ${error.message}`);
    }
}

module.exports = {
    getAboutContent,
    updateAboutContent
};
