const db = require('../utils/dbconnect');

async function migrate() {
    try {
        console.log('Adding seoName and slug to products table...');
        try {
            await db.execute('ALTER TABLE products ADD COLUMN seoName VARCHAR(255) DEFAULT NULL');
        } catch (e) {
            console.log('seoName might already exist', e.message);
        }
        
        try {
            await db.execute('ALTER TABLE products ADD COLUMN slug VARCHAR(255) DEFAULT NULL');
        } catch (e) {
            console.log('slug might already exist', e.message);
        }

        console.log('Populating slugs for existing products...');
        const [products] = await db.execute('SELECT productID, productName, seoName FROM products');
        
        for (const p of products) {
            const baseName = p.seoName || p.productName || 'product';
            let slug = baseName.toString().toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
            
            // Check uniqueness (simple approach for migration)
            let uniqueSlug = slug;
            let counter = 1;
            while (true) {
                const [existing] = await db.execute('SELECT productID FROM products WHERE slug = ? AND productID != ?', [uniqueSlug, p.productID]);
                if (existing.length === 0) break;
                uniqueSlug = `${slug}-${counter}`;
                counter++;
            }
            
            await db.execute('UPDATE products SET slug = ? WHERE productID = ?', [uniqueSlug, p.productID]);
        }
        
        try {
            await db.execute('ALTER TABLE products ADD UNIQUE INDEX idx_slug (slug)');
        } catch (e) {
            console.log('Unique index on slug might already exist', e.message);
        }
        
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
