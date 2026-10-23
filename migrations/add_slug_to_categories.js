const db = require('../utils/dbconnect');
const slugify = require('../utils/slugify');

async function runMigration() {
    console.log('Adding slug column to categories table...');
    try {
        await db.execute('ALTER TABLE categories ADD COLUMN slug VARCHAR(255) DEFAULT NULL');
        console.log('Added slug column.');
    } catch (e) {
        console.log('slug column might already exist:', e.message);
    }

    console.log('Populating slugs for existing categories...');
    const [categories] = await db.execute('SELECT categoryID, categoryName, slug FROM categories');
    
    let updatedCount = 0;

    for (const cat of categories) {
        const baseSlug = slugify(cat.slug || cat.categoryName || 'category');
        
        // Check uniqueness
        let uniqueSlug = baseSlug || 'category';
        let counter = 1;
        while (true) {
            const [existing] = await db.execute(
                'SELECT categoryID FROM categories WHERE slug = ? AND categoryID != ?',
                [uniqueSlug, cat.categoryID]
            );
            if (existing.length === 0) break;
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }

        await db.execute('UPDATE categories SET slug = ? WHERE categoryID = ?', [uniqueSlug, cat.categoryID]);
        updatedCount++;
        console.log(`Updated category "${cat.categoryName}" (${cat.categoryID}) -> slug: "${uniqueSlug}"`);
    }

    console.log(`Successfully populated slugs for ${updatedCount} categories.`);

    try {
        await db.execute('ALTER TABLE categories ADD UNIQUE INDEX idx_category_slug (slug)');
        console.log('Added unique index idx_category_slug.');
    } catch (e) {
        console.log('Unique index on slug might already exist:', e.message);
    }
}

if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = runMigration;
