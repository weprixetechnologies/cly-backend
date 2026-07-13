const db = require('../utils/dbconnect');

/**
 * Ensures the site_settings table exists.
 * Called once at startup via settingsController init.
 */
async function ensureTable() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS site_settings (
            \`key\`       VARCHAR(100) PRIMARY KEY,
            \`value\`     TEXT         NOT NULL,
            updatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

/**
 * Get a setting by key.
 * @param {string} key
 * @returns {string|null} value or null if not found
 */
async function getSetting(key) {
    const [rows] = await db.execute(
        'SELECT `value` FROM site_settings WHERE `key` = ?',
        [key]
    );
    return rows.length > 0 ? rows[0].value : null;
}

/**
 * Upsert a setting.
 * @param {string} key
 * @param {string} value
 */
async function setSetting(key, value) {
    await db.execute(
        `INSERT INTO site_settings (\`key\`, \`value\`, updatedAt)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updatedAt = NOW()`,
        [key, String(value)]
    );
}

module.exports = { ensureTable, getSetting, setSetting };
