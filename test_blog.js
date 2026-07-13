#!/usr/bin/env node
require('dotenv').config();
const blogModel = require('./models/blogModel');
const db = require('./utils/dbconnect');

async function runTests() {
    console.log('🧪 Starting Blog Module Database & Logic Tests...');
    console.log('--------------------------------------------------');

    try {
        // Find or create a test author from the users table
        const [users] = await db.query('SELECT uid FROM users LIMIT 1');
        if (users.length === 0) {
            console.error('❌ Aborting: No users found in database to link as author. Please run seed or signup a user first.');
            process.exit(1);
        }
        const authorId = users[0].uid;
        console.log(`👤 Using existing user UID as author: ${authorId}`);

        // Find a test product from the products table
        const [products] = await db.query('SELECT productID FROM products LIMIT 1');
        if (products.length === 0) {
            console.error('❌ Aborting: No products found in database to link to posts.');
            process.exit(1);
        }
        const productId = products[0].productID;
        console.log(`📦 Using existing product ID for links: ${productId}`);

        // --- TEST 1: CATEGORIES CRUD ---
        console.log('\n📂 Test 1: Category CRUD...');
        const catSlug = `test-category-${Date.now()}`;
        const catId = await blogModel.createCategory({
            name: 'Test Category',
            slug: catSlug,
            description: 'Category for automated test runs'
        });
        console.log(`   ✅ Category created with ID: ${catId}`);

        const fetchedCat = await blogModel.getCategoryBySlug(catSlug);
        if (!fetchedCat || fetchedCat.name !== 'Test Category') {
            throw new Error('Category fetch or name verification failed');
        }
        console.log(`   ✅ Category retrieved successfully by slug`);

        await blogModel.updateCategory(catId, {
            name: 'Updated Category Name',
            slug: catSlug,
            description: 'Updated category description'
        });
        const updatedCat = await blogModel.getCategoryById(catId);
        if (!updatedCat || updatedCat.name !== 'Updated Category Name') {
            throw new Error('Category update failed');
        }
        console.log(`   ✅ Category updated successfully`);

        // --- TEST 2: TAGS AND RESOLUTION ---
        console.log('\n🏷️ Test 2: Tags findOrCreate logic...');
        const tagNames = ['Calligraphy', 'Stationery', `Ink-${Date.now()}`];
        const tagIds = await blogModel.findOrCreateTags(tagNames);
        if (tagIds.length !== 3) {
            throw new Error(`Expected 3 tag IDs, got ${tagIds.length}`);
        }
        console.log(`   ✅ Resolved/Created tags: [${tagIds.join(', ')}]`);

        // --- TEST 3: POSTS CRUD & SLUG CHANGE REDIRECTION ---
        console.log('\n📝 Test 3: Post CRUD & Slug Redirects...');
        const postSlug = `test-post-title-${Date.now()}`;
        const postData = {
            title: 'Test Post Title',
            slug: postSlug,
            excerpt: 'Brief summary of the test post.',
            content: '<h2>Heading 2</h2><p>This is the test content body. It must contain at least one H2 tag.</p>',
            content_format: 'html',
            cover_image_url: 'https://example.com/test-cover.jpg',
            cover_image_alt: 'Test Cover Alt Text',
            author_id: authorId,
            category_id: catId,
            status: 'draft',
            is_featured: true,
            meta_title: 'Test Post Meta Title',
            meta_description: 'Test Post Meta Description',
            reading_time_min: 2
        };

        const postId = await blogModel.createPost(postData);
        console.log(`   ✅ Post created with ID: ${postId}`);

        // Associate tags & products
        await blogModel.setPostTags(postId, tagIds);
        await blogModel.setPostProducts(postId, [productId]);
        console.log(`   ✅ Associated tags and products successfully`);

        // Update post with a NEW slug
        const newPostSlug = `${postSlug}-revised`;
        const updatedPostData = {
            ...postData,
            title: 'Test Post Title Revised',
            slug: newPostSlug,
            content: '<h2>New Heading 2</h2><p>Revised content with products linked.</p>',
            category_id: catId
        };

        // Write old slug to history
        await blogModel.createSlugHistory(postId, postSlug);
        await blogModel.updatePost(postId, updatedPostData);
        console.log(`   ✅ Post slug updated to: ${newPostSlug}`);
        console.log(`   ✅ Wrote old slug "${postSlug}" to history table`);

        // Fetch post and check redirect
        // Change status to published so redirection checks succeed
        await blogModel.updatePostStatus(postId, 'published', new Date(), null);
        
        const redirectSlug = await blogModel.getNewSlugFromHistory(postSlug);
        if (redirectSlug !== newPostSlug) {
            throw new Error(`Expected redirect slug to be ${newPostSlug}, got ${redirectSlug}`);
        }
        console.log(`   ✅ Slug history redirection verified successfully! "${postSlug}" -> "${redirectSlug}"`);

        // Increment view count
        await blogModel.incrementViewCount(newPostSlug);
        const postDetails = await blogModel.getPostById(postId);
        if (postDetails.view_count !== 1) {
            throw new Error(`Expected views to be 1, got ${postDetails.view_count}`);
        }
        console.log(`   ✅ View counter increment verified (count: ${postDetails.view_count})`);

        // --- TEST 4: SCHEDULING SYSTEM ---
        console.log('\n⏰ Test 4: Scheduling Background Worker...');
        const schedPostSlug = `scheduled-post-${Date.now()}`;
        const schedPostId = await blogModel.createPost({
            ...postData,
            title: 'Scheduled Post Title',
            slug: schedPostSlug,
            status: 'scheduled',
            published_at: null,
            scheduled_for: new Date(Date.now() - 5000) // 5 seconds in the past!
        });
        console.log(`   ✅ Scheduled post created (release date in the past)`);

        const publishedCount = await blogModel.publishScheduledPosts();
        if (publishedCount === 0) {
            throw new Error('Background publisher worker failed to publish past-scheduled post');
        }
        
        const schedPost = await blogModel.getPostById(schedPostId);
        if (schedPost.status !== 'published') {
            throw new Error(`Expected post status to be 'published', got '${schedPost.status}'`);
        }
        console.log(`   ✅ Background publisher worker successfully published scheduled article!`);

        // --- CLEANUP ---
        console.log('\n🧹 Cleaning up test records...');
        await blogModel.deletePost(postId);
        await blogModel.deletePost(schedPostId);
        await blogModel.deleteCategory(catId);
        // Note: cascade tags deletes
        for (const tId of tagIds) {
            await blogModel.deleteTag(tId);
        }
        console.log('   ✅ Cleanup complete');

        console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runTests();
