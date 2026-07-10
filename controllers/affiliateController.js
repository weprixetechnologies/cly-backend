const db = require('../utils/dbconnect');
const affiliateModel = require('../models/affiliateModel');

// Resolve link and track click (Public)
exports.resolveLink = async (req, res) => {
    try {
        const { slug } = req.params;
        const linkData = await affiliateModel.resolveAffiliateLink(slug);

        if (!linkData) {
            return res.status(200).json({ success: false, message: 'Link not found or inactive' });
        }

        // Track click asynchronously (only if there's an actual link row)
        if (linkData.id) {
            affiliateModel.trackClick(linkData.id, linkData.affiliate_id).catch(err => {
                console.error('Error tracking affiliate click:', err);
            });
        } else {
            // Just increment affiliate total_clicks for referral-code based links
            db.query('UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = ?', [linkData.affiliate_id]).catch(err => {
                console.error('Error tracking affiliate click:', err);
            });
        }

        res.status(200).json({
            success: true,
            data: {
                affiliate_link_id: linkData.id || null,
                affiliate_id: linkData.affiliate_id,
                type: linkData.type,
                productID: linkData.productID,
                affiliate_status: linkData.affiliate_status
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create an attribution (User Auth Required)
exports.createAttribution = async (req, res) => {
    try {
        const { affiliate_link_id, affiliate_id } = req.body;
        const customer_uid = req.user.uid; // From auth middleware

        if (!affiliate_link_id || !affiliate_id) {
            return res.status(400).json({ success: false, message: 'Missing affiliate data' });
        }

        // Check if self-referral
        if (customer_uid === affiliate_id) { // wait, affiliate_id is BIGINT, customer_uid is string
            // We need to check if the affiliate's uid matches customer_uid
            const aff = await db.query('SELECT uid FROM affiliates WHERE id = ?', [affiliate_id]);
            if (aff[0].length > 0 && aff[0][0].uid === customer_uid) {
                // Silently return success, but don't attribute (self-referral)
                return res.status(200).json({ success: true, message: 'Self referral ignored' });
            }
        }

        await affiliateModel.createAttribution(customer_uid, affiliate_link_id, affiliate_id);

        res.status(200).json({ success: true, message: 'Attribution recorded' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get current user's affiliate profile (User Auth Required)
exports.getMe = async (req, res) => {
    try {
        const uid = req.user.uid;
        let profile = await affiliateModel.getAffiliateByUid(uid);
        
        // Auto enroll if not found
        if (!profile) {
            profile = await affiliateModel.enrollAffiliate(uid);
        }

        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create a new link for current affiliate (User Auth Required)
exports.createLink = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { type, productID } = req.body;

        const profile = await affiliateModel.getAffiliateByUid(uid);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Affiliate profile not found' });
        }

        // Generate a random slug
        const slug = Math.random().toString(36).substring(2, 10).toUpperCase();

        const [result] = await db.query(`
            INSERT INTO affiliate_links (affiliate_id, type, productID, slug)
            VALUES (?, ?, ?, ?)
        `, [profile.id, type, productID || null, slug]);

        res.status(201).json({
            success: true,
            data: { id: result.insertId, slug, type, productID }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get current user's affiliate profile (User Auth Required)
exports.getMyAffiliateProfile = async (req, res) => {
    try {
        const uid = req.user.uid;
        const profile = await affiliateModel.getAffiliateByUid(uid);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Affiliate profile not found' });
        }
        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// List links for current affiliate (User Auth Required)
exports.getMyLinks = async (req, res) => {
    try {
        const uid = req.user.uid;
        const profile = await affiliateModel.getAffiliateByUid(uid);
        if (!profile) {
            return res.status(200).json({ success: true, data: [] });
        }

        const [links] = await db.query(`
            SELECT al.*, p.productName 
            FROM affiliate_links al
            LEFT JOIN products p ON al.productID = p.productID
            WHERE al.affiliate_id = ?
            ORDER BY al.created_at DESC
        `, [profile.id]);

        res.status(200).json({ success: true, data: links });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// List commissions for current affiliate (User Auth Required)
exports.getMyCommissions = async (req, res) => {
    try {
        const uid = req.user.uid;
        const profile = await affiliateModel.getAffiliateByUid(uid);
        if (!profile) {
            return res.status(200).json({ success: true, data: [] });
        }

        const [commissions] = await db.query(`
            SELECT * FROM affiliate_commissions
            WHERE affiliate_id = ?
            ORDER BY created_at DESC
        `, [profile.id]);

        res.status(200).json({ success: true, data: commissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ----- ADMIN ENDPOINTS -----

// Get global settings (Admin)
exports.getSettings = async (req, res) => {
    try {
        const [settings] = await db.query(`SELECT * FROM affiliate_settings WHERE scope = 'GLOBAL' ORDER BY created_at DESC`);
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update global settings (Admin)
exports.updateSettings = async (req, res) => {
    try {
        const { commission_percentage, commission_cap_amount } = req.body;
        const admin_uid = req.user ? req.user.uid : null;

        // Deactivate old
        await db.query(`UPDATE affiliate_settings SET is_active = FALSE WHERE scope = 'GLOBAL'`);

        // Insert new version
        await db.query(`
            INSERT INTO affiliate_settings (scope, commission_percentage, commission_cap_amount, is_active, created_by_uid)
            VALUES ('GLOBAL', ?, ?, TRUE, ?)
        `, [commission_percentage, commission_cap_amount || null, admin_uid]);

        res.status(200).json({ success: true, message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// List all affiliates (Admin)
exports.getAllAffiliates = async (req, res) => {
    try {
        const [affiliates] = await db.query(`
            SELECT a.*, u.name, u.emailID 
            FROM affiliates a
            JOIN users u ON a.uid = u.uid
            ORDER BY a.created_at DESC
        `);
        res.status(200).json({ success: true, data: affiliates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update affiliate status (Admin)
exports.updateAffiliateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.query(`UPDATE affiliates SET status = ? WHERE id = ?`, [status, id]);
        res.status(200).json({ success: true, message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all commissions (Admin)
exports.getAllCommissions = async (req, res) => {
    try {
        const [commissions] = await db.query(`
            SELECT c.*, a.referral_code, u.name as affiliate_name
            FROM affiliate_commissions c
            JOIN affiliates a ON c.affiliate_id = a.id
            JOIN users u ON a.uid = u.uid
            ORDER BY c.created_at DESC
        `);
        res.status(200).json({ success: true, data: commissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get users not enrolled in affiliate program (Admin)
exports.getUnenrolledUsers = async (req, res) => {
    try {
        const [unregisteredUsers] = await db.query(`
            SELECT u.uid, u.name, u.emailID, u.username FROM users u
            LEFT JOIN affiliates a ON u.uid = a.uid
            WHERE a.uid IS NULL
        `);
        res.status(200).json({ success: true, data: unregisteredUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Enroll a specific user as an affiliate (Admin)
exports.enrollUserAsAffiliate = async (req, res) => {
    try {
        const { uid } = req.params;
        
        // Check if already an affiliate
        const existing = await affiliateModel.getAffiliateByUid(uid);
        if (existing) {
            return res.status(400).json({ success: false, message: 'User is already an affiliate' });
        }
        
        const affiliate = await affiliateModel.enrollAffiliate(uid);
        res.status(200).json({ success: true, message: 'User enrolled as affiliate successfully', data: affiliate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Bulk enroll all users as affiliates (Admin)
exports.bulkEnrollUsersAsAffiliates = async (req, res) => {
    try {
        // Find all users who are not in the affiliates table
        const [unregisteredUsers] = await db.query(`
            SELECT u.uid FROM users u
            LEFT JOIN affiliates a ON u.uid = a.uid
            WHERE a.uid IS NULL
        `);
        
        console.log(`[BulkEnroll] FOUND USERS to make affiliate:`, unregisteredUsers);
        
        let enrolledCount = 0;
        let enrolledUids = [];
        
        for (const user of unregisteredUsers) {
            try {
                console.log(`[BulkEnroll] Making ${user.uid} an affiliate...`);
                await affiliateModel.enrollAffiliate(user.uid);
                enrolledCount++;
                enrolledUids.push(user.uid);
            } catch (err) {
                console.error(`[BulkEnroll] Failed to enroll user ${user.uid}: `, err);
            }
        }
        
        res.status(200).json({ 
            success: true, 
            message: `Successfully enrolled ${enrolledCount} users as affiliates.`,
            count: enrolledCount,
            found_users: unregisteredUsers,
            enrolled_users: enrolledUids
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get pending payouts grouped by affiliate (Admin)
exports.getPendingPayouts = async (req, res) => {
    try {
        const [payouts] = await db.query(`
            SELECT c.affiliate_id, a.uid, u.name, a.referral_code,
                   SUM(c.commission_amount) as total_amount,
                   GROUP_CONCAT(c.id) as commission_ids
            FROM affiliate_commissions c
            JOIN affiliates a ON c.affiliate_id = a.id
            JOIN users u ON a.uid = u.uid
            WHERE c.status = 'APPROVED'
            GROUP BY c.affiliate_id, a.uid, u.name, a.referral_code
            HAVING total_amount > 0
        `);
        res.status(200).json({ success: true, data: payouts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create a payout batch (Admin)
exports.createPayout = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { affiliate_id, commission_ids, note } = req.body;
        const admin_uid = req.user ? req.user.uid : null;

        // verify these commissions are approved and belong to the affiliate
        const placeholders = commission_ids.map(() => '?').join(',');
        const [commissions] = await connection.query(`
            SELECT id, commission_amount FROM affiliate_commissions 
            WHERE id IN (${placeholders}) AND affiliate_id = ? AND status = 'APPROVED'
        `, [...commission_ids, affiliate_id]);

        if (commissions.length !== commission_ids.length) {
            throw new Error('Some commissions are invalid or not in APPROVED status');
        }

        const totalAmount = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);

        // create payout record
        const [payoutResult] = await connection.query(`
            INSERT INTO affiliate_payouts (affiliate_id, amount, payout_method_note, marked_paid_by_uid)
            VALUES (?, ?, ?, ?)
        `, [affiliate_id, totalAmount, note, admin_uid]);
        const payoutId = payoutResult.insertId;

        // link and update commissions
        for (const cid of commission_ids) {
            await connection.query(`
                INSERT INTO affiliate_payout_commissions (payout_id, commission_id) VALUES (?, ?)
            `, [payoutId, cid]);
            
            await connection.query(`
                UPDATE affiliate_commissions SET status = 'PAID', paid_at = NOW() WHERE id = ?
            `, [cid]);
        }

        // update denormalized
        await connection.query(`
            UPDATE affiliates SET total_commission_paid = total_commission_paid + ? WHERE id = ?
        `, [totalAmount, affiliate_id]);

        await connection.commit();
        res.status(200).json({ success: true, message: 'Payout created successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// Get commission details for a specific order (Admin)
exports.getOrderCommission = async (req, res) => {
    try {
        const { orderID } = req.params;

        const [rows] = await db.query(`
            SELECT 
                ac.id,
                ac.orderID,
                ac.affiliate_id,
                ac.order_amount,
                ac.commission_percentage_applied,
                ac.commission_cap_applied,
                ac.commission_amount,
                ac.status,
                ac.created_at,
                ac.approved_at,
                ac.paid_at,
                a.uid as affiliate_uid,
                a.referral_code,
                a.status as affiliate_status,
                u.name as affiliate_name,
                u.emailID as affiliate_email
            FROM affiliate_commissions ac
            JOIN affiliates a ON ac.affiliate_id = a.id
            JOIN users u ON a.uid = u.uid
            WHERE ac.orderID = ?
        `, [orderID]);

        res.status(200).json({
            success: true,
            data: rows.length > 0 ? rows[0] : null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
