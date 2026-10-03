const db = require('../utils/dbconnect');

// Generate base slug
function generateBaseSlug(text) {
    if (!text) return 'product';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

// Check if slug exists
async function checkSlugExists(slug, excludeProductID = null) {
    try {
        let query = 'SELECT productID FROM products WHERE slug = ?';
        let params = [slug];
        
        if (excludeProductID) {
            query += ' AND productID != ?';
            params.push(excludeProductID);
        }
        
        const [rows] = await db.execute(query, params);
        return rows.length > 0;
    } catch (error) {
        throw new Error(`Error checking slug: ${error.message}`);
    }
}

// Generate unique slug
async function generateUniqueSlug(seoName, productName, excludeProductID = null) {
    const baseName = seoName || productName || 'product';
    let baseSlug = generateBaseSlug(baseName);
    
    // If empty after stripping, default to product
    if (!baseSlug) baseSlug = 'product';
    
    let uniqueSlug = baseSlug;
    let counter = 1;
    
    while (await checkSlugExists(uniqueSlug, excludeProductID)) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
    }
    
    return uniqueSlug;
}

module.exports = {
    generateUniqueSlug,
    checkSlugExists
};
