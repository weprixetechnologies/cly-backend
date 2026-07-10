const db = require('../utils/dbconnect');

// Generate a unique referral code
async function generateUniqueReferralCode(uid) {
    let success = false;
    let code = '';
    while (!success) {
        // Base: first 4 chars of uid + random 4 chars
        const baseStr = uid ? uid.substring(0, 4) : 'USER';
        code = (baseStr + Math.random().toString(36).substring(2, 6)).toUpperCase();
        try {
            const [rows] = await db.query('SELECT id FROM affiliates WHERE referral_code = ?', [code]);
            if (rows.length === 0) {
                success = true;
            }
        } catch (err) {
            throw err;
        }
    }
    return code;
}

// Enroll a user as an affiliate
async function enrollAffiliate(uid, connection = null) {
    try {
        const queryRunner = connection || db;
        // Check if already enrolled
        const [existing] = await queryRunner.query('SELECT * FROM affiliates WHERE uid = ?', [uid]);
        if (existing.length > 0) {
            return existing[0];
        }

        const referralCode = await generateUniqueReferralCode(uid);
        const [result] = await queryRunner.query(
            'INSERT INTO affiliates (uid, referral_code) VALUES (?, ?)',
            [uid, referralCode]
        );
        
        return {
            id: result.insertId,
            uid,
            referral_code: referralCode,
            status: 'ACTIVE'
        };
    } catch (error) {
        throw new Error(`Error enrolling affiliate: ${error.message}`);
    }
}

// Get affiliate profile by UID
async function getAffiliateByUid(uid) {
    try {
        const [rows] = await db.query('SELECT * FROM affiliates WHERE uid = ?', [uid]);
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching affiliate profile: ${error.message}`);
    }
}

// Resolve referral link to affiliate
async function resolveAffiliateLink(slug) {
    try {
        // 1. First try resolving from the affiliate_links table (custom links)
        const [rows] = await db.query(`
            SELECT al.*, a.status as affiliate_status, a.uid as affiliate_uid
            FROM affiliate_links al
            JOIN affiliates a ON al.affiliate_id = a.id
            WHERE al.slug = ? AND al.is_active = TRUE
        `, [slug]);
        
        if (rows.length > 0) {
            return rows[0];
        }

        // 2. Fallback: check if the slug matches an affiliate's referral_code directly
        const [affiliateRows] = await db.query(`
            SELECT id as affiliate_id, uid as affiliate_uid, referral_code, status as affiliate_status
            FROM affiliates
            WHERE referral_code = ? AND status = 'ACTIVE'
        `, [slug]);

        if (affiliateRows.length > 0) {
            const aff = affiliateRows[0];
            // Return a virtual link object that the rest of the system can use
            return {
                id: null,  // no link row exists
                affiliate_id: aff.affiliate_id,
                affiliate_uid: aff.affiliate_uid,
                affiliate_status: aff.affiliate_status,
                type: 'GENERAL',
                productID: null,
                slug: slug,
                is_active: true,
                clicks: 0
            };
        }

        return null;
    } catch (error) {
        throw new Error(`Error resolving affiliate link: ${error.message}`);
    }
}

// Track a click on a link
async function trackClick(linkId, affiliateId) {
    try {
        await db.query('UPDATE affiliate_links SET clicks = clicks + 1 WHERE id = ?', [linkId]);
        await db.query('UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = ?', [affiliateId]);
    } catch (error) {
        console.error('Error tracking click:', error.message);
    }
}

// Create an attribution
async function createAttribution(customerUid, linkId, affiliateId) {
    try {
        // Last click wins: disable or delete previous active attributions for this customer?
        // Actually, since we resolve the latest one by 'attributed_at DESC' or 'expires_at > NOW()',
        // we can just insert the new one. But to keep it clean, we can delete older active ones for the same customer.
        await db.query(`DELETE FROM affiliate_attributions WHERE customer_uid = ?`, [customerUid]);

        // 30 days window
        await db.query(`
            INSERT INTO affiliate_attributions (customer_uid, affiliate_link_id, affiliate_id, expires_at)
            VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
        `, [customerUid, linkId, affiliateId]);
        
    } catch (error) {
        throw new Error(`Error creating attribution: ${error.message}`);
    }
}

// Get active attribution for a customer
async function getActiveAttribution(customerUid) {
    try {
        const [rows] = await db.query(`
            SELECT aa.*, a.status as affiliate_status
            FROM affiliate_attributions aa
            JOIN affiliates a ON aa.affiliate_id = a.id
            WHERE aa.customer_uid = ? AND aa.expires_at > NOW()
            ORDER BY aa.attributed_at DESC
            LIMIT 1
        `, [customerUid]);
        
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching active attribution: ${error.message}`);
    }
}

// Get global commission settings
async function getGlobalCommissionSettings() {
    try {
        const [rows] = await db.query(`SELECT * FROM affiliate_settings WHERE scope = 'GLOBAL' AND is_active = TRUE LIMIT 1`);
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching commission settings: ${error.message}`);
    }
}

// Create commission for an order
async function createCommission(orderID, affiliateId, linkId, orderAmount, percentage, cap) {
    try {
        // MIN(computed, cap) — cap of 0 or NULL should mean "no cap"
        let computed = (orderAmount * percentage) / 100;
        let finalAmount = computed;
        
        if (cap !== null && cap !== undefined && cap > 0) {
            finalAmount = Math.min(computed, cap);
        }

        await db.query(`
            INSERT INTO affiliate_commissions 
            (orderID, affiliate_id, affiliate_link_id, order_amount, commission_percentage_applied, commission_cap_applied, commission_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `, [orderID, affiliateId, linkId, orderAmount, percentage, cap, finalAmount]);
    } catch (error) {
        throw new Error(`Error creating commission: ${error.message}`);
    }
}

// Handle order status change (Accepted / Rejected / Cancelled)
async function handleOrderStatusChange(orderID, orderStatus) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get the pending or approved commission for this order
        const [commissions] = await connection.query(`
            SELECT * FROM affiliate_commissions WHERE orderID = ? FOR UPDATE
        `, [orderID]);

        if (commissions.length > 0) {
            const commission = commissions[0];

            if (orderStatus === 'accepted') {
                // If it was already approved, maybe we are re-accepting? We'll just recalculate just in case.
                // Fetch the FINAL order amount from orders table. The order amount might be duplicated across rows, 
                // but we know `order_amount` is updated to be the same for all rows of the same orderID in updateOrderAcceptance.
                const [orderRows] = await connection.query(`
                    SELECT order_amount FROM orders WHERE orderID = ? LIMIT 1
                `, [orderID]);

                const currentOrderAmount = orderRows.length > 0 ? parseFloat(orderRows[0].order_amount || 0) : commission.order_amount;
                const percentage = parseFloat(commission.commission_percentage_applied);
                const cap = commission.commission_cap_applied ? parseFloat(commission.commission_cap_applied) : null;
                
                let newCommissionAmount = (currentOrderAmount * percentage) / 100;
                if (cap !== null && cap > 0) {
                    newCommissionAmount = Math.min(newCommissionAmount, cap);
                }

                // If moving from PENDING to APPROVED, we add to total_commission_earned
                // If it was already APPROVED, we adjust the difference
                let earningsDiff = 0;
                if (commission.status === 'PENDING') {
                    earningsDiff = newCommissionAmount;
                } else if (commission.status === 'APPROVED') {
                    earningsDiff = newCommissionAmount - parseFloat(commission.commission_amount);
                }
                
                // Note: If it was VOIDED, we could restore it, but spec says "immutable ledger"
                // Let's assume we can restore VOIDED -> APPROVED
                if (commission.status === 'VOIDED' || commission.status === 'REJECTED') {
                    earningsDiff = newCommissionAmount;
                }

                await connection.query(`
                    UPDATE affiliate_commissions 
                    SET order_amount = ?, commission_amount = ?, status = 'APPROVED', approved_at = NOW()
                    WHERE id = ?
                `, [currentOrderAmount, newCommissionAmount, commission.id]);

                if (earningsDiff !== 0) {
                    await connection.query(`
                        UPDATE affiliates SET total_commission_earned = total_commission_earned + ?, total_orders = total_orders + (CASE WHEN ? = 'PENDING' THEN 1 ELSE 0 END)
                        WHERE id = ?
                    `, [earningsDiff, commission.status, commission.affiliate_id]);
                }

            } else if (['rejected', 'cancelled'].includes(orderStatus.toLowerCase())) {
                // Moving to VOIDED
                let earningsDiff = 0;
                if (commission.status === 'APPROVED') {
                    earningsDiff = -parseFloat(commission.commission_amount);
                }

                await connection.query(`
                    UPDATE affiliate_commissions 
                    SET status = 'VOIDED', voided_reason = ? 
                    WHERE id = ?
                `, [`Order ${orderStatus} by admin`, commission.id]);

                if (earningsDiff !== 0) {
                    await connection.query(`
                        UPDATE affiliates SET total_commission_earned = total_commission_earned + ?, total_orders = total_orders - 1
                        WHERE id = ?
                    `, [earningsDiff, commission.affiliate_id]);
                }
            }
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        console.error('Error handling order status change for affiliate commission:', error);
    } finally {
        connection.release();
    }
}

module.exports = {
    enrollAffiliate,
    getAffiliateByUid,
    resolveAffiliateLink,
    trackClick,
    createAttribution,
    getActiveAttribution,
    getGlobalCommissionSettings,
    createCommission,
    handleOrderStatusChange
};
