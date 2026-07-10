const db = require('../utils/dbconnect');

async function runMigration() {
    console.log('🚀 Starting affiliate tables migration...');

    try {
        // affiliates table
        await db.query(`
            CREATE TABLE IF NOT EXISTS affiliates (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                uid VARCHAR(255) NOT NULL,
                referral_code VARCHAR(20) NOT NULL UNIQUE,
                status ENUM('ACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
                total_clicks INT DEFAULT 0,
                total_orders INT DEFAULT 0,
                total_commission_earned DECIMAL(12,2) DEFAULT 0,
                total_commission_paid DECIMAL(12,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_uid (uid)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created affiliates table');

        // affiliate_links table
        await db.query(`
            CREATE TABLE IF NOT EXISTS affiliate_links (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                affiliate_id BIGINT NOT NULL,
                type ENUM('PRODUCT', 'GENERAL') NOT NULL,
                productID VARCHAR(255) NULL,
                slug VARCHAR(40) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT TRUE,
                clicks INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created affiliate_links table');

        // affiliate_settings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS affiliate_settings (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                scope ENUM('GLOBAL', 'PRODUCT') NOT NULL,
                productID VARCHAR(255) NULL,
                commission_percentage DECIMAL(5,2) NOT NULL,
                commission_cap_amount DECIMAL(12,2) NULL,
                is_active BOOLEAN DEFAULT TRUE,
                effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by_uid VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created affiliate_settings table');

        // Insert default global setting if not exists
        const [settings] = await db.query(`SELECT id FROM affiliate_settings WHERE scope = 'GLOBAL' AND is_active = TRUE`);
        if (settings.length === 0) {
            await db.query(`
                INSERT INTO affiliate_settings (scope, commission_percentage, commission_cap_amount, is_active)
                VALUES ('GLOBAL', 5.00, NULL, TRUE)
            `);
            console.log('✅ Created default global affiliate settings (5%)');
        }

        // affiliate_attributions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS affiliate_attributions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                customer_uid VARCHAR(255) NOT NULL,
                affiliate_link_id BIGINT NOT NULL,
                affiliate_id BIGINT NOT NULL,
                attributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id) ON DELETE CASCADE,
                FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
                INDEX idx_customer_uid (customer_uid)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created affiliate_attributions table');

        // affiliate_commissions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS affiliate_commissions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                orderID VARCHAR(255) NOT NULL UNIQUE,
                affiliate_id BIGINT NOT NULL,
                affiliate_link_id BIGINT NULL,
                order_amount DECIMAL(12,2) NOT NULL,
                commission_percentage_applied DECIMAL(5,2) NOT NULL,
                commission_cap_applied DECIMAL(12,2) NULL,
                commission_amount DECIMAL(12,2) NOT NULL,
                status ENUM('PENDING', 'APPROVED', 'REJECTED', 'VOIDED', 'PAID') DEFAULT 'PENDING',
                voided_reason VARCHAR(255) NULL,
                approved_at TIMESTAMP NULL,
                paid_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
                FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id) ON DELETE SET NULL,
                INDEX idx_orderID (orderID),
                INDEX idx_status (status)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created affiliate_commissions table');

        // affiliate_payouts table
        await db.query(`
            CREATE TABLE IF NOT EXISTS affiliate_payouts (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                affiliate_id BIGINT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                payout_method_note VARCHAR(255) NOT NULL,
                marked_paid_by_uid VARCHAR(255) NULL,
                paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created affiliate_payouts table');

        // affiliate_payout_commissions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS affiliate_payout_commissions (
                payout_id BIGINT NOT NULL,
                commission_id BIGINT NOT NULL,
                PRIMARY KEY (payout_id, commission_id),
                FOREIGN KEY (payout_id) REFERENCES affiliate_payouts(id) ON DELETE CASCADE,
                FOREIGN KEY (commission_id) REFERENCES affiliate_commissions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Created affiliate_payout_commissions table');

        // Create affiliates for existing users
        const [users] = await db.query(`
            SELECT uid FROM users u 
            WHERE NOT EXISTS (SELECT 1 FROM affiliates a WHERE a.uid = u.uid)
        `);

        if (users.length > 0) {
            console.log(`⏳ Backfilling ${users.length} existing users as affiliates...`);
            let count = 0;
            for (const user of users) {
                // Generate referral code: first 4 of uid + random 4 string
                
                // Add retry logic for unique code collision, just in case
                let success = false;
                while(!success) {
                    try {
                        const newCode = (user.uid.substring(0, 4) + Math.random().toString(36).substring(2, 6)).toUpperCase();
                        await db.query(`INSERT INTO affiliates (uid, referral_code) VALUES (?, ?)`, [user.uid, newCode]);
                        success = true;
                    } catch (err) {
                        if (err.code !== 'ER_DUP_ENTRY') throw err;
                    }
                }
                count++;
            }
            console.log(`✅ Backfilled ${count} users into affiliates table.`);
        } else {
             console.log(`✅ All users already have an affiliate profile.`);
        }

        console.log('\n✅ All affiliate migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runMigration();
}

module.exports = runMigration;
