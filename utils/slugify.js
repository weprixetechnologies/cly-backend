/**
 * Convert a string into a clean, URL-friendly, lowercased, and hyphenated SEO slug
 * @param {string} text - Title or name to be slugified
 * @returns {string} - The slugified string
 */
function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars (except -)
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

module.exports = slugify;
