const blogModel = require('../models/blogModel');
const slugify = require('../utils/slugify');
const { uploadImage } = require('../utils/bunnyUpload');

// Helper to count words and estimate reading time
function calculateReadingTime(htmlContent) {
    if (!htmlContent) return 1;
    // Strip HTML tags
    const text = htmlContent.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    // Average reading speed: 200 words per minute
    return Math.max(1, Math.ceil(words / 200));
}

// --- CATEGORIES ---

async function createCategory(req, res) {
    try {
        const { name, slug, description } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required.' });
        }
        const finalSlug = slug ? slugify(slug) : slugify(name);
        
        // Check uniqueness
        const existing = await blogModel.getCategoryBySlug(finalSlug);
        if (existing) {
            return res.status(409).json({ success: false, message: 'A category with this slug already exists.' });
        }

        const id = await blogModel.createCategory({ name, slug: finalSlug, description });
        return res.status(201).json({ success: true, message: 'Category created successfully.', data: { id, slug: finalSlug } });
    } catch (error) {
        console.error('Error creating category:', error);
        return res.status(500).json({ success: false, message: 'Failed to create category.', error: error.message });
    }
}

async function getAllCategories(req, res) {
    try {
        const categories = await blogModel.getAllCategories();
        return res.status(200).json({ success: true, data: categories });
    } catch (error) {
        console.error('Error listing categories:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch categories.', error: error.message });
    }
}

async function updateCategory(req, res) {
    try {
        const { id } = req.params;
        const { name, slug, description } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required.' });
        }

        const finalSlug = slug ? slugify(slug) : slugify(name);
        const existing = await blogModel.getCategoryBySlug(finalSlug);
        if (existing && existing.id !== id) {
            return res.status(409).json({ success: false, message: 'A category with this slug already exists.' });
        }

        await blogModel.updateCategory(id, { name, slug: finalSlug, description });
        return res.status(200).json({ success: true, message: 'Category updated successfully.' });
    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ success: false, message: 'Failed to update category.', error: error.message });
    }
}

async function deleteCategory(req, res) {
    try {
        const { id } = req.params;
        await blogModel.deleteCategory(id);
        return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
    } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete category.', error: error.message });
    }
}

// --- TAGS ---

async function createTag(req, res) {
    try {
        const { name, slug } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tag name is required.' });
        }
        const finalSlug = slug ? slugify(slug) : slugify(name);

        const existing = await blogModel.getTagBySlug(finalSlug);
        if (existing) {
            return res.status(409).json({ success: false, message: 'A tag with this slug already exists.' });
        }

        const id = await blogModel.createTag({ name, slug: finalSlug });
        return res.status(201).json({ success: true, message: 'Tag created successfully.', data: { id, slug: finalSlug } });
    } catch (error) {
        console.error('Error creating tag:', error);
        return res.status(500).json({ success: false, message: 'Failed to create tag.', error: error.message });
    }
}

async function getAllTags(req, res) {
    try {
        const tags = await blogModel.getAllTags();
        return res.status(200).json({ success: true, data: tags });
    } catch (error) {
        console.error('Error listing tags:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch tags.', error: error.message });
    }
}

async function updateTag(req, res) {
    try {
        const { id } = req.params;
        const { name, slug } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tag name is required.' });
        }

        const finalSlug = slug ? slugify(slug) : slugify(name);
        const existing = await blogModel.getTagBySlug(finalSlug);
        if (existing && existing.id !== id) {
            return res.status(409).json({ success: false, message: 'A tag with this slug already exists.' });
        }

        await blogModel.updateTag(id, { name, slug: finalSlug });
        return res.status(200).json({ success: true, message: 'Tag updated successfully.' });
    } catch (error) {
        console.error('Error updating tag:', error);
        return res.status(500).json({ success: false, message: 'Failed to update tag.', error: error.message });
    }
}

async function deleteTag(req, res) {
    try {
        const { id } = req.params;
        await blogModel.deleteTag(id);
        return res.status(200).json({ success: true, message: 'Tag deleted successfully.' });
    } catch (error) {
        console.error('Error deleting tag:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete tag.', error: error.message });
    }
}

// --- POSTS ADMIN ---

async function createPost(req, res) {
    try {
        const {
            title, slug, excerpt, content, cover_image_url, cover_image_alt,
            category_id, meta_title, meta_description, canonical_url, og_image_url, is_featured,
            tags, productIds
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Title and content are required.' });
        }

        const author_id = req.user.uid; // Get from JWT payload
        const finalSlug = slug ? slugify(slug) : slugify(title);

        // Check uniqueness
        const existing = await blogModel.getPostBySlug(finalSlug);
        if (existing) {
            return res.status(409).json({ success: false, message: 'A blog post with this slug already exists.' });
        }

        const reading_time_min = calculateReadingTime(content);

        const postId = await blogModel.createPost({
            title, slug: finalSlug, excerpt, content, content_format: 'html', cover_image_url, cover_image_alt,
            author_id, category_id, status: 'draft', published_at: null, scheduled_for: null,
            meta_title, meta_description, canonical_url, og_image_url, reading_time_min, is_featured
        });

        // Save associations
        if (tags && tags.length > 0) {
            const tagIds = await blogModel.findOrCreateTags(tags);
            await blogModel.setPostTags(postId, tagIds);
        }
        if (productIds && productIds.length > 0) {
            await blogModel.setPostProducts(postId, productIds);
        }

        return res.status(201).json({ success: true, message: 'Post created successfully as draft.', data: { id: postId, slug: finalSlug } });
    } catch (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({ success: false, message: 'Failed to create blog post.', error: error.message });
    }
}

async function getAdminPosts(req, res) {
    try {
        const { status, category_id, search, page, limit } = req.query;
        const result = await blogModel.getAdminPosts({ status, category_id, search, page, limit });
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error listing admin posts:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch posts.', error: error.message });
    }
}

async function getPostById(req, res) {
    try {
        const { id } = req.params;
        const post = await blogModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Blog post not found.' });
        }
        
        // Fetch tags and products
        const tags = await blogModel.getPostTags(id);
        const products = await blogModel.getPostProducts(id);

        return res.status(200).json({
            success: true,
            data: {
                ...post,
                tags,
                products
            }
        });
    } catch (error) {
        console.error('Error fetching admin post by ID:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch blog post.', error: error.message });
    }
}

async function updatePost(req, res) {
    try {
        const { id } = req.params;
        const {
            title, slug, excerpt, content, cover_image_url, cover_image_alt,
            category_id, meta_title, meta_description, canonical_url, og_image_url, is_featured,
            tags, productIds
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Title and content are required.' });
        }

        const post = await blogModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Blog post not found.' });
        }

        const finalSlug = slug ? slugify(slug) : slugify(title);
        const existing = await blogModel.getPostBySlug(finalSlug);
        if (existing && existing.id !== id) {
            return res.status(409).json({ success: false, message: 'A blog post with this slug already exists.' });
        }

        // If slug changed, write old slug to history
        if (post.slug !== finalSlug) {
            await blogModel.createSlugHistory(id, post.slug);
        }

        const reading_time_min = calculateReadingTime(content);

        await blogModel.updatePost(id, {
            title, slug: finalSlug, excerpt, content, content_format: 'html', cover_image_url, cover_image_alt,
            category_id, meta_title, meta_description, canonical_url, og_image_url, reading_time_min, is_featured
        });

        // Save associations
        if (tags) {
            const tagIds = await blogModel.findOrCreateTags(tags);
            await blogModel.setPostTags(id, tagIds);
        }
        if (productIds) {
            await blogModel.setPostProducts(id, productIds);
        }

        return res.status(200).json({ success: true, message: 'Blog post updated successfully.', data: { slug: finalSlug } });
    } catch (error) {
        console.error('Error updating post:', error);
        return res.status(500).json({ success: false, message: 'Failed to update blog post.', error: error.message });
    }
}

async function updatePostStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, scheduled_for } = req.body;

        if (!['draft', 'published', 'scheduled', 'archived'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value.' });
        }

        const post = await blogModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Blog post not found.' });
        }

        let publishedAt = post.published_at;
        let scheduledFor = null;

        if (status === 'published') {
            publishedAt = publishedAt || new Date();
        } else if (status === 'scheduled') {
            if (!scheduled_for) {
                return res.status(400).json({ success: false, message: 'Release date is required for scheduled posts.' });
            }
            scheduledFor = new Date(scheduled_for);
            if (scheduledFor <= new Date()) {
                return res.status(400).json({ success: false, message: 'Scheduled date must be in the future.' });
            }
        }

        await blogModel.updatePostStatus(id, status, publishedAt, scheduledFor);
        return res.status(200).json({ success: true, message: `Post status updated to '${status}' successfully.` });
    } catch (error) {
        console.error('Error updating status:', error);
        return res.status(500).json({ success: false, message: 'Failed to update post status.', error: error.message });
    }
}

async function deletePost(req, res) {
    try {
        const { id } = req.params;
        const { confirm_hard_delete } = req.query;

        // Default to soft-delete by changing status to archived, unless hard delete is explicitly confirmed
        if (confirm_hard_delete === 'true') {
            await blogModel.deletePost(id);
            return res.status(200).json({ success: true, message: 'Blog post deleted permanently.' });
        } else {
            await blogModel.updatePostStatus(id, 'archived', null, null);
            return res.status(200).json({ success: true, message: 'Blog post moved to archived status.' });
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete post.', error: error.message });
    }
}

async function linkPostProducts(req, res) {
    try {
        const { id } = req.params;
        const { productIds } = req.body;
        if (!Array.isArray(productIds)) {
            return res.status(400).json({ success: false, message: 'productIds must be an array.' });
        }
        await blogModel.setPostProducts(id, productIds);
        return res.status(200).json({ success: true, message: 'Related products updated successfully.' });
    } catch (error) {
        console.error('Error linking products:', error);
        return res.status(500).json({ success: false, message: 'Failed to update linked products.', error: error.message });
    }
}

async function uploadBlogImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        const uploadResult = await uploadImage(req.file, 'blog');
        if (uploadResult.success) {
            return res.status(200).json({
                success: true,
                message: 'Image uploaded successfully.',
                url: uploadResult.url
            });
        } else {
            return res.status(500).json({ success: false, message: 'CDN upload failed.', error: uploadResult.error });
        }
    } catch (error) {
        console.error('Editor upload image error:', error);
        return res.status(500).json({ success: false, message: 'Image upload failed.', error: error.message });
    }
}

async function getPostSeoCheck(req, res) {
    try {
        const { id } = req.params;
        const post = await blogModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const products = await blogModel.getPostProducts(id);
        const tags = await blogModel.getPostTags(id);

        const checkResults = {
            titleLength: {
                status: post.title.length <= 60 ? 'pass' : 'warn',
                message: `Title length: ${post.title.length} characters (Recommended limit: 60)`
            },
            metaTitle: {
                status: !post.meta_title ? 'warn' : post.meta_title.length <= 60 ? 'pass' : 'warn',
                message: !post.meta_title 
                    ? 'Meta Title is missing (falls back to Title)' 
                    : `Meta Title length: ${post.meta_title.length} characters (Recommended: 50-60)`
            },
            metaDescription: {
                status: !post.meta_description ? 'fail' : post.meta_description.length <= 160 ? 'pass' : 'warn',
                message: !post.meta_description
                    ? 'Meta Description is missing (SEO-critical!)'
                    : `Meta Description: ${post.meta_description.length} characters (Recommended: 120-160)`
            },
            coverImageAlt: {
                status: post.cover_image_url && !post.cover_image_alt ? 'fail' : 'pass',
                message: post.cover_image_url && !post.cover_image_alt
                    ? 'Cover Image alt text is missing (required for SEO + accessibility)'
                    : 'Cover Image validation passed or no cover image set'
            },
            h2Tags: {
                status: (post.content.includes('<h2>') || post.content.includes('##')) ? 'pass' : 'fail',
                message: (post.content.includes('<h2>') || post.content.includes('##'))
                    ? 'Contains at least one H2 tag'
                    : 'H2 headings are missing (required for indexing hierarchy)'
            },
            internalLinks: {
                status: products.length > 0 ? 'pass' : 'fail',
                message: products.length > 0
                    ? `Linked to ${products.length} related product(s)`
                    : 'No internal product links (pass authority and drive commercial traffic!)'
            },
            readingTime: {
                status: 'pass',
                message: `Estimated reading time: ${post.reading_time_min || 1} min`
            }
        };

        return res.status(200).json({ success: true, data: checkResults });
    } catch (error) {
        console.error('Error running SEO check:', error);
        return res.status(500).json({ success: false, message: 'Failed to run SEO check.', error: error.message });
    }
}

// --- PUBLIC POSTS ---

async function getPublicPosts(req, res) {
    try {
        const { category_slug, tag_slug, search, page, limit } = req.query;
        const result = await blogModel.getPublicPosts({ category_slug, tag_slug, search, page, limit });
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error listing public posts:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch public posts.', error: error.message });
    }
}

async function getPublicPostBySlug(req, res) {
    try {
        const { slug } = req.params;
        let post = await blogModel.getPostBySlug(slug);

        if (!post) {
            // Check redirect history
            const currentSlug = await blogModel.getNewSlugFromHistory(slug);
            if (currentSlug) {
                return res.status(200).json({
                    success: true,
                    redirect: true,
                    status: 301,
                    newSlug: currentSlug
                });
            }
            return res.status(404).json({ success: false, message: 'Blog post not found.' });
        }

        // Post must be published
        if (post.status !== 'published' || new Date(post.published_at) > new Date()) {
            return res.status(404).json({ success: false, message: 'Blog post not published yet.' });
        }

        // Fetch associated tags, products, and related articles
        const tags = await blogModel.getPostTags(post.id);
        const products = await blogModel.getPostProducts(post.id);
        const relatedPosts = await blogModel.getRelatedPosts(post.id, post.category_id, 3);

        return res.status(200).json({
            success: true,
            data: {
                ...post,
                tags,
                products,
                relatedPosts
            }
        });
    } catch (error) {
        console.error('Error fetching public post:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch blog post.', error: error.message });
    }
}

async function incrementPostView(req, res) {
    try {
        const { slug } = req.params;
        await blogModel.incrementViewCount(slug);
        return res.status(200).json({ success: true, message: 'View count updated.' });
    } catch (error) {
        console.error('Error incrementing view count:', error);
        return res.status(500).json({ success: false, message: 'Failed to increment view count.', error: error.message });
    }
}

async function getSitemapData(req, res) {
    try {
        const rows = await blogModel.getSitemapData();
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching sitemap data:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch sitemap data.', error: error.message });
    }
}

async function getRSSFeed(req, res) {
    try {
        const posts = await blogModel.getRSSFeedData();
        const siteUrl = 'https://cursiveletters.in'; // Fallback root site url

        let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
        rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
        rss += `<channel>\n`;
        rss += `  <title>Cursive Letters Blog</title>\n`;
        rss += `  <link>${siteUrl}/blog</link>\n`;
        rss += `  <description>Guides and reviews on quality stationery and imported goods</description>\n`;
        rss += `  <atom:link href="${siteUrl}/api/blog/rss" rel="self" type="application/rss+xml" />\n`;

        posts.forEach(post => {
            const postUrl = `${siteUrl}/blog/${post.slug}`;
            rss += `  <item>\n`;
            rss += `    <title><![CDATA[${post.title}]]></title>\n`;
            rss += `    <link>${postUrl}</link>\n`;
            rss += `    <guid isPermaLink="true">${postUrl}</guid>\n`;
            rss += `    <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>\n`;
            rss += `    <description><![CDATA[${post.excerpt || ''}]]></description>\n`;
            if (post.authorName) {
                rss += `    <author>${post.authorName}</author>\n`;
            }
            rss += `  </item>\n`;
        });

        rss += `</channel>\n`;
        rss += `</rss>\n`;

        res.set('Content-Type', 'application/xml');
        return res.status(200).send(rss);
    } catch (error) {
        console.error('Error generating RSS XML:', error);
        return res.status(500).set('Content-Type', 'text/plain').send('Failed to generate RSS feed.');
    }
}

module.exports = {
    // Categories
    createCategory,
    getAllCategories,
    updateCategory,
    deleteCategory,
    
    // Tags
    createTag,
    getAllTags,
    updateTag,
    deleteTag,
    
    // Posts Admin
    createPost,
    getAdminPosts,
    getPostById,
    updatePost,
    updatePostStatus,
    deletePost,
    linkPostProducts,
    uploadBlogImage,
    getPostSeoCheck,
    
    // Posts Public
    getPublicPosts,
    getPublicPostBySlug,
    incrementPostView,
    getSitemapData,
    getRSSFeed
};
