const db = require('../utils/dbconnect');

/**
 * Ensure the leads table exists (idempotent, called on startup).
 */
async function ensureTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS leads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            address TEXT NULL,
            requirement TEXT NOT NULL,
            source VARCHAR(50) NOT NULL DEFAULT 'floating_form',
            status ENUM('new', 'contacted', 'in_progress', 'converted', 'closed') NOT NULL DEFAULT 'new',
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status_created (status, created_at),
            INDEX idx_source (source)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

/**
 * Create a new lead inquiry.
 * @param {Object} data
 * @param {string} data.name
 * @param {string} data.phone
 * @param {string|null} data.address
 * @param {string} data.requirement
 * @param {string} [data.source='floating_form']
 * @returns {Promise<{ id: number }>}
 */
async function createLead({ name, phone, address, requirement, source = 'floating_form' }) {
    const query = `
        INSERT INTO leads (name, phone, address, requirement, source, status)
        VALUES (?, ?, ?, ?, ?, 'new')
    `;
    const [result] = await db.execute(query, [
        name.trim(),
        phone.trim(),
        address ? address.trim() : null,
        requirement.trim(),
        source.trim()
    ]);
    return { id: result.insertId };
}

/**
 * Get leads with pagination, search and filters.
 * @param {Object} params
 */
async function getLeads({ page = 1, limit = 20, status = 'all', source = 'all', search = '' } = {}) {
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const whereConditions = [];
    const values = [];

    if (status && status !== 'all') {
        whereConditions.push('status = ?');
        values.push(status);
    }

    if (source && source !== 'all') {
        whereConditions.push('source = ?');
        values.push(source);
    }

    if (search && search.trim()) {
        whereConditions.push('(name LIKE ? OR phone LIKE ? OR requirement LIKE ? OR address LIKE ?)');
        const searchPattern = `%${search.trim()}%`;
        values.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) AS total FROM leads ${whereClause}`;
    const [countRows] = await db.execute(countSql, values);
    const total = countRows[0]?.total || 0;

    // Data query
    const dataSql = `
        SELECT id, name, phone, address, requirement, source, status, notes, created_at, updated_at
        FROM leads
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${safeLimit} OFFSET ${offset}
    `;
    const [rows] = await db.execute(dataSql, values);

    return {
        leads: rows,
        pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit) || 1
        }
    };
}

/**
 * Get quick lead stats (counts by status)
 */
async function getLeadStats() {
    const [rows] = await db.execute(`
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
            SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) AS contacted_count,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
            SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted_count,
            SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_count
        FROM leads
    `);
    const r = rows[0] || {};
    return {
        total: Number(r.total || 0),
        new: Number(r.new_count || 0),
        contacted: Number(r.contacted_count || 0),
        in_progress: Number(r.in_progress_count || 0),
        converted: Number(r.converted_count || 0),
        closed: Number(r.closed_count || 0)
    };
}

/**
 * Get single lead by ID
 */
async function getLeadById(id) {
    const [rows] = await db.execute(
        `SELECT id, name, phone, address, requirement, source, status, notes, created_at, updated_at
         FROM leads WHERE id = ?`,
        [id]
    );
    return rows[0] || null;
}

/**
 * Update lead status and/or notes
 */
async function updateLead(id, { status, notes }) {
    const updates = [];
    const values = [];

    if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
    }
    if (notes !== undefined) {
        updates.push('notes = ?');
        values.push(notes);
    }

    if (updates.length === 0) return false;

    values.push(id);
    const sql = `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`;
    const [result] = await db.execute(sql, values);
    return result.affectedRows > 0;
}

/**
 * Delete a lead
 */
async function deleteLead(id) {
    const [result] = await db.execute(`DELETE FROM leads WHERE id = ?`, [id]);
    return result.affectedRows > 0;
}

module.exports = {
    ensureTable,
    createLead,
    getLeads,
    getLeadStats,
    getLeadById,
    updateLead,
    deleteLead
};
