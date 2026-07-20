const db = require('../utils/dbconnect');

/**
 * Ensures the trusted_logos table exists.
 */
async function ensureTable() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS trusted_logos (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            name        VARCHAR(255) NULL,
            logoUrl     TEXT NOT NULL,
            isActive    TINYINT(1) DEFAULT 1,
            sortOrder   INT DEFAULT 0,
            createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

// Create a new trusted logo
async function createLogo(logoData) {
    try {
        const { name, logoUrl, isActive = 1, sortOrder = 0 } = logoData;

        const [result] = await db.execute(
            `INSERT INTO trusted_logos (name, logoUrl, isActive, sortOrder) VALUES (?, ?, ?, ?)`,
            [name || null, logoUrl, isActive ? 1 : 0, parseInt(sortOrder) || 0]
        );

        return {
            id: result.insertId,
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error creating trusted logo: ${error.message}`);
    }
}

// Get active logos (ordered by sortOrder ASC, createdAt DESC)
async function getActiveLogos() {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM trusted_logos WHERE isActive = 1 ORDER BY sortOrder ASC, createdAt DESC'
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching active trusted logos: ${error.message}`);
    }
}

// Get all logos for admin
async function getAllLogos() {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM trusted_logos ORDER BY sortOrder ASC, createdAt DESC'
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching all trusted logos: ${error.message}`);
    }
}

// Get single logo by ID
async function getLogoById(id) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM trusted_logos WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching trusted logo by id: ${error.message}`);
    }
}

// Update logo
async function updateLogo(id, logoData) {
    try {
        const fields = [];
        const params = [];

        if (logoData.name !== undefined) {
            fields.push('name = ?');
            params.push(logoData.name || null);
        }
        if (logoData.logoUrl !== undefined) {
            fields.push('logoUrl = ?');
            params.push(logoData.logoUrl);
        }
        if (logoData.isActive !== undefined) {
            fields.push('isActive = ?');
            params.push(logoData.isActive ? 1 : 0);
        }
        if (logoData.sortOrder !== undefined) {
            fields.push('sortOrder = ?');
            params.push(parseInt(logoData.sortOrder) || 0);
        }

        if (fields.length === 0) {
            return { affectedRows: 0, changedRows: 0 };
        }

        params.push(id);

        const [result] = await db.execute(
            `UPDATE trusted_logos SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        throw new Error(`Error updating trusted logo: ${error.message}`);
    }
}

// Delete logo
async function deleteLogo(id) {
    try {
        const [result] = await db.execute(
            'DELETE FROM trusted_logos WHERE id = ?',
            [id]
        );
        return {
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error deleting trusted logo: ${error.message}`);
    }
}

module.exports = {
    ensureTable,
    createLogo,
    getActiveLogos,
    getAllLogos,
    getLogoById,
    updateLogo,
    deleteLogo
};
