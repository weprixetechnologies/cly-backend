const db = require('../utils/dbconnect');
const { v4: uuidv4 } = require('uuid');

// --- CATEGORIES ---

async function createCategory(categoryData) {
    const { name, slug, description } = categoryData;
    const id = uuidv4();
    await db.query(
        'INSERT INTO blog_categories (id, name, slug, description) VALUES (?, ?, ?, ?)',
        [id, name, slug, description || null]
    );
    return id;
}

async function getAllCategories() {
    const [rows] = await db.query(
        'SELECT id, name, slug, description, createdAt FROM blog_categories ORDER BY name ASC'
    );
    return rows;
}

async function getCategoryById(id) {
    const [rows] = await db.query(
        'SELECT id, name, slug, description, createdAt FROM blog_categories WHERE id = ?',
        [id]
    );
    return rows[0] || null;
}

async function getCategoryBySlug(slug) {
    const [rows] = await db.query(
        'SELECT id, name, slug, description, createdAt FROM blog_categories WHERE slug = ?',
        [slug]
    );
    return rows[0] || null;
}

async function updateCategory(id, categoryData) {
    const { name, slug, description } = categoryData;
    await db.query(
        'UPDATE blog_categories SET name = ?, slug = ?, description = ? WHERE id = ?',
        [name, slug, description || null, id]
    );
    return true;
}

async function deleteCategory(id) {
    await db.query('DELETE FROM blog_categories WHERE id = ?', [id]);
    return true;
}

// --- TAGS ---

async function createTag(tagData) {
    const { name, slug } = tagData;
    const id = uuidv4();
    await db.query(
        'INSERT INTO blog_tags (id, name, slug) VALUES (?, ?, ?)',
        [id, name, slug]
    );
    return id;
}

async function getAllTags() {
    const [rows] = await db.query(
        'SELECT id, name, slug, createdAt FROM blog_tags ORDER BY name ASC'
    );
    return rows;
}

async function getTagById(id) {
    const [rows] = await db.query(
        'SELECT id, name, slug FROM blog_tags WHERE id = ?',
        [id]
    );
    return rows[0] || null;
}

async function getTagBySlug(slug) {
    const [rows] = await db.query(
        'SELECT id, name, slug FROM blog_tags WHERE slug = ?',
        [slug]
    );
    return rows[0] || null;
}

async function updateTag(id, tagData) {
    const { name, slug } = tagData;
    await db.query(
        'UPDATE blog_tags SET name = ?, slug = ? WHERE id = ?',
        [name, slug, id]
    );
    return true;
}

async function deleteTag(id) {
    await db.query('DELETE FROM blog_tags WHERE id = ?', [id]);
    return true;
}

/**
 * Bulk resolve or insert tags from list of tag names and return their IDs.
 */
async function findOrCreateTags(tagNames) {
    if (!tagNames || tagNames.length === 0) return [];
    
    const slugify = require('../utils/slugify');
    const tagIds = [];

    for (let name of tagNames) {
        name = name.trim();
        if (!name) continue;
        const slug = slugify(name);

        const [existing] = await db.query('SELECT id FROM blog_tags WHERE slug = ?', [slug]);
        if (existing.length > 0) {
            tagIds.push(existing[0].id);
        } else {
            const id = uuidv4();
            await db.query('INSERT INTO blog_tags (id, name, slug) VALUES (?, ?, ?)', [id, name, slug]);
            tagIds.push(id);
        }
    }
    return tagIds;
}

// --- BLOG POSTS ---

async function createPost(postData) {
    const id = uuidv4();
    const {
        title, slug, excerpt, content, content_format, cover_image_url, cover_image_alt,
        author_id, category_id, status, published_at, scheduled_for,
        meta_title, meta_description, canonical_url, og_image_url, reading_time_min, is_featured
    } = postData;

    await db.query(`
        INSERT INTO blog_posts (
            id, title, slug, excerpt, content, content_format, cover_image_url, cover_image_alt,
            author_id, category_id, status, published_at, scheduled_for,
            meta_title, meta_description, canonical_url, og_image_url, reading_time_min, is_featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id, title, slug, excerpt || null, content, content_format || 'html', cover_image_url || null, cover_image_alt || null,
        author_id, category_id || null, status || 'draft', published_at || null, scheduled_for || null,
        meta_title || null, meta_description || null, canonical_url || null, og_image_url || null, reading_time_min || null, is_featured ? 1 : 0
    ]);

    return id;
}

async function getPostById(id) {
    const [rows] = await db.query(`
        SELECT p.*, c.name as categoryName, c.slug as categorySlug, u.name as authorName, u.photo as authorPhoto
        FROM blog_posts p
        LEFT JOIN blog_categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.author_id = u.uid
        WHERE p.id = ?
    `, [id]);
    return rows[0] || null;
}

async function getPostBySlug(slug) {
    const [rows] = await db.query(`
        SELECT p.*, c.name as categoryName, c.slug as categorySlug, u.name as authorName, u.photo as authorPhoto
        FROM blog_posts p
        LEFT JOIN blog_categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.author_id = u.uid
        WHERE p.slug = ?
    `, [slug]);
    return rows[0] || null;
}

async function getAdminPosts(filters = {}) {
    const { status, category_id, search, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = `
        SELECT p.id, p.title, p.slug, p.status, p.published_at, p.scheduled_for, p.is_featured, p.view_count, p.createdAt, p.updatedAt,
               c.name as categoryName, u.name as authorName
        FROM blog_posts p
        LEFT JOIN blog_categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.author_id = u.uid
        WHERE 1=1
    `;
    const params = [];

    if (status) {
        query += ' AND p.status = ?';
        params.push(status);
    }
    if (category_id) {
        query += ' AND p.category_id = ?';
        params.push(category_id);
    }
    if (search) {
        query += ' AND (p.title LIKE ? OR p.excerpt LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
    }

    // Get count query first
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS temp_count`;
    const [countRows] = await db.query(countQuery, params);
    const totalPosts = countRows[0]?.total || 0;

    query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);

    return {
        posts: rows,
        pagination: {
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit),
            currentPage: parseInt(page),
            limit: parseInt(limit)
        }
    };
}

async function getPublicPosts(filters = {}) {
    const { category_slug, tag_slug, search, page = 1, limit = 10, exclude_id } = filters;
    const offset = (page - 1) * limit;

    // Public view only returns published posts with publication date <= now
    let query = `
        SELECT DISTINCT p.id, p.title, p.slug, p.excerpt, p.cover_image_url, p.cover_image_alt, p.published_at, p.reading_time_min, p.is_featured, p.view_count,
                        c.name as categoryName, c.slug as categorySlug, u.name as authorName, u.photo as authorPhoto
        FROM blog_posts p
        LEFT JOIN blog_categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.author_id = u.uid
        LEFT JOIN blog_post_tags pt ON p.id = pt.post_id
        LEFT JOIN blog_tags t ON pt.tag_id = t.id
        WHERE p.status = 'published' AND p.published_at <= NOW()
    `;
    const params = [];

    if (exclude_id) {
        query += ' AND p.id != ?';
        params.push(exclude_id);
    }
    if (category_slug) {
        query += ' AND c.slug = ?';
        params.push(category_slug);
    }
    if (tag_slug) {
        query += ' AND t.slug = ?';
        params.push(tag_slug);
    }
    if (search) {
        // Fallback to simple matching if fulltext index matches fail on empty search criteria
        query += ' AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS temp_count`;
    const [countRows] = await db.query(countQuery, params);
    const totalPosts = countRows[0]?.total || 0;

    // featured posts first, then newest published
    query += ' ORDER BY p.is_featured DESC, p.published_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);

    return {
        posts: rows,
        pagination: {
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit),
            currentPage: parseInt(page),
            limit: parseInt(limit)
        }
    };
}

async function updatePost(id, postData) {
    const {
        title, slug, excerpt, content, content_format, cover_image_url, cover_image_alt,
        category_id, meta_title, meta_description, canonical_url, og_image_url, reading_time_min, is_featured
    } = postData;

    await db.query(`
        UPDATE blog_posts 
        SET title = ?, slug = ?, excerpt = ?, content = ?, content_format = ?, cover_image_url = ?, cover_image_alt = ?,
            category_id = ?, meta_title = ?, meta_description = ?, canonical_url = ?, og_image_url = ?, reading_time_min = ?, is_featured = ?
        WHERE id = ?
    `, [
        title, slug, excerpt || null, content, content_format || 'html', cover_image_url || null, cover_image_alt || null,
        category_id || null, meta_title || null, meta_description || null, canonical_url || null, og_image_url || null, reading_time_min || null, is_featured ? 1 : 0,
        id
    ]);
    return true;
}

async function updatePostStatus(id, status, publishedAt = null, scheduledFor = null) {
    await db.query(
        'UPDATE blog_posts SET status = ?, published_at = ?, scheduled_for = ? WHERE id = ?',
        [status, publishedAt, scheduledFor, id]
    );
    return true;
}

async function deletePost(id) {
    await db.query('DELETE FROM blog_posts WHERE id = ?', [id]);
    return true;
}

async function incrementViewCount(slug) {
    await db.query('UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = ?', [slug]);
    return true;
}

// --- SLUG HISTORY ---

async function createSlugHistory(postId, oldSlug) {
    const id = uuidv4();
    await db.query(
        'INSERT INTO blog_post_slug_history (id, post_id, old_slug) VALUES (?, ?, ?)',
        [id, postId, oldSlug]
    );
    return id;
}

async function getNewSlugFromHistory(oldSlug) {
    const [rows] = await db.query(`
        SELECT p.slug
        FROM blog_post_slug_history h
        INNER JOIN blog_posts p ON h.post_id = p.id
        WHERE h.old_slug = ? AND p.status = 'published'
        ORDER BY h.createdAt DESC LIMIT 1
    `, [oldSlug]);
    return rows[0]?.slug || null;
}

// --- POST PRODUCTS & TAGS ASSOCIATIONS ---

async function setPostProducts(postId, productIds) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Remove existing links
        await connection.query('DELETE FROM blog_post_product_links WHERE post_id = ?', [postId]);
        
        // Bulk insert new ones
        if (productIds && productIds.length > 0) {
            const values = productIds.map(pId => [postId, pId]);
            await connection.query(
                'INSERT INTO blog_post_product_links (post_id, product_id) VALUES ?',
                [values]
            );
        }
        
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getPostProducts(postId) {
    const [rows] = await db.query(`
        SELECT p.productID as id, p.productName as name, p.productPrice as price, p.featuredImages as image, p.minQty
        FROM blog_post_product_links l
        INNER JOIN products p ON l.product_id = p.productID
        WHERE l.post_id = ?
    `, [postId]);
    return rows;
}

async function setPostTags(postId, tagIds) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Remove existing tags mapping
        await connection.query('DELETE FROM blog_post_tags WHERE post_id = ?', [postId]);
        
        // Insert new ones
        if (tagIds && tagIds.length > 0) {
            const values = tagIds.map(tId => [postId, tId]);
            await connection.query(
                'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ?',
                [values]
            );
        }
        
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getPostTags(postId) {
    const [rows] = await db.query(`
        SELECT t.id, t.name, t.slug
        FROM blog_post_tags pt
        INNER JOIN blog_tags t ON pt.tag_id = t.id
        WHERE pt.post_id = ?
    `, [postId]);
    return rows;
}

async function getRelatedPosts(postId, categoryId, limit = 3) {
    // 1. Try fetching from the same category
    let [rows] = await db.query(`
        SELECT id, title, slug, excerpt, cover_image_url, cover_image_alt, published_at, reading_time_min
        FROM blog_posts
        WHERE status = 'published' AND published_at <= NOW() AND category_id = ? AND id != ?
        ORDER BY published_at DESC LIMIT ?
    `, [categoryId, postId, limit]);

    // 2. Fallback: fetch general latest posts if not enough category matches
    if (rows.length < limit) {
        const excludeIds = [postId, ...rows.map(r => r.id)];
        const needed = limit - rows.length;
        const [fallbackRows] = await db.query(`
            SELECT id, title, slug, excerpt, cover_image_url, cover_image_alt, published_at, reading_time_min
            FROM blog_posts
            WHERE status = 'published' AND published_at <= NOW() AND id NOT IN (?)
            ORDER BY published_at DESC LIMIT ?
        `, [excludeIds, needed]);
        rows = [...rows, ...fallbackRows];
    }
    return rows;
}

// --- SYNDICATION & PUBLISHER WORKER ---

async function getSitemapData() {
    const [rows] = await db.query(`
        SELECT slug, updatedAt as lastmod
        FROM blog_posts
        WHERE status = 'published' AND published_at <= NOW()
        ORDER BY updatedAt DESC
    `);
    return rows;
}

async function getRSSFeedData() {
    const [rows] = await db.query(`
        SELECT p.title, p.slug, p.excerpt, p.published_at, u.name as authorName
        FROM blog_posts p
        LEFT JOIN users u ON p.author_id = u.uid
        WHERE p.status = 'published' AND p.published_at <= NOW()
        ORDER BY p.published_at DESC LIMIT 20
    `);
    return rows;
}

async function publishScheduledPosts() {
    const [result] = await db.query(`
        UPDATE blog_posts
        SET status = 'published', published_at = NOW(), scheduled_for = NULL
        WHERE status = 'scheduled' AND scheduled_for <= NOW()
    `);
    if (result.affectedRows > 0) {
        console.log(`⏰ [Background Publisher] Automatically published ${result.affectedRows} scheduled blog post(s).`);
    }
    return result.affectedRows;
}

module.exports = {
    // Categories
    createCategory,
    getAllCategories,
    getCategoryById,
    getCategoryBySlug,
    updateCategory,
    deleteCategory,
    
    // Tags
    createTag,
    getAllTags,
    getTagById,
    getTagBySlug,
    updateTag,
    deleteTag,
    findOrCreateTags,
    
    // Posts
    createPost,
    getPostById,
    getPostBySlug,
    getAdminPosts,
    getPublicPosts,
    updatePost,
    updatePostStatus,
    deletePost,
    incrementViewCount,
    
    // Slug history
    createSlugHistory,
    getNewSlugFromHistory,
    
    // Associations
    setPostProducts,
    getPostProducts,
    setPostTags,
    getPostTags,
    getRelatedPosts,
    
    // Workers & Sitemap
    getSitemapData,
    getRSSFeedData,
    publishScheduledPosts
};
