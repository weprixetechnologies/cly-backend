require('dotenv').config(); // Load .env variables

/**
 * SMS Service — SMSGatewayHub API Integration
 * ============================================
 * Templates match EXACTLY what is approved on SMSGatewayHub DLT portal.
 *
 * ─── APPROVED DLT TEMPLATES ─────────────────────────────────────────────────
 *
 * 1. LOGIN OTP  (Template ID: 1777178411219440996)
 *    "Your OTP for creating your new Cursive Letters LY account is {#var#}.
 *     This OTP is valid for {#var#} minutes. Please do not share it with anyone."
 *    Variables: otp, validityMinutes
 *
 * 2. PASSWORD RESET OTP  (Template ID: 1777178411690264265)
 *    "Your OTP for resetting your password is {#var#}. This OTP is valid for
 *     10 minutes. Please do not share it with anyone. Cursive Letters LY"
 *    Variables: otp  (validity hardcoded as "10" in template)
 *
 * 3. ORDER CONFIRMATION  (Template ID: 1777178411694628739)
 *    "Dear {#var#}, your order {#var#} has been successfully placed. You can
 *     view your order details on our website. We will process your order for
 *     dispatch shortly. Thank you for shopping with us. Cursive Letters LY"
 *    Variables: customerName, orderID
 *    Fires: when customer places order (NOT on admin acceptance)
 *
 * 4. ORDER DISPATCH  (Template ID: 1777178411685590457)
 *    "Dear {#var#}, your order {#var#} has been dispatched and is on its way.
 *     Track your shipment here: {#var#}. Thank you for shopping with us.
 *     Cursive Letters LY"
 *    Variables: customerName, orderID, trackingLink
 *
 * ─── SENDER ID  : CURSLY
 * ─── DLT ENTITY : 1701178349513253892
 */

const axios = require('axios');

// ─── Config (loaded from .env) ──────────────────────────────────────�// Exact DLT-registered template IDs (matches SMSGatewayHub portal)
const TEMPLATE_IDS = {
    LOGIN_OTP: process.env.SMS_TEMPLATE_OTP || '1777178411219440996',
    RESET_OTP: process.env.SMS_TEMPLATE_RESET_OTP || '1777178411690264265',
    ORDER_CONFIRM: process.env.SMS_TEMPLATE_CONFIRMED || '1777178411694628739',
    DISPATCH: process.env.SMS_TEMPLATE_DISPATCH || '1777178417937552272',
};

const SMS_BASE_URL = 'https://www.smsgatewayhub.com/api/mt/SendSMS';
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_SENDER_ID = process.env.SMS_SENDER_ID;
const SMS_ENTITY_ID = process.env.SMS_ENTITY_ID;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sanitise a phone number to 91XXXXXXXXXX format (Indian mobile).
 * Accepts: 9876543210  |  +919876543210  |  919876543210
 */
function formatPhone(phone) {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length === 10) return `91${digits}`;
    return digits; // unknown — pass as-is for logging
}

/**
 * Core send — POST JSON payload to SMSGatewayHub.
 */
async function sendSMS(phone, text, templateId) {
    const number = formatPhone(phone);

    if (!number) {
        console.error('[SMS] Invalid phone number:', phone);
        return { success: false, error: 'Invalid phone number' };
    }

    if (!SMS_API_KEY) {
        console.warn('[SMS] SMS_API_KEY is not set — skipping SMS send.');
        return { success: false, error: 'SMS_API_KEY not configured' };
    }

    const payload = {
        Account: {
            APIkey: SMS_API_KEY,
            SenderId: SMS_SENDER_ID,
            Channel: '2',    // Transactional
            DCS: '0',    // English
            SchedTime: null,
            GroupId: null,
            EntityId: SMS_ENTITY_ID,
        },
        Messages: [
            {
                Text: text,
                DLTTemplateId: templateId,
                Number: number,
            },
        ],
    };

    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`[SMS] Sending to ${number} (Attempt ${attempt}/${maxAttempts}) | TemplateID: ${templateId}`);
            const response = await axios.post(SMS_BASE_URL, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000,
            });

            const data = response.data;

            if (data?.ErrorCode === '000') {
                console.log(`[SMS] ✅ Success | JobId: ${data.JobId} | MsgId: ${data.MessageData?.[0]?.MessageId}`);
                return { success: true, jobId: data.JobId, messageId: data.MessageData?.[0]?.MessageId };
            } else {
                console.warn(`[SMS] ⚠️ Attempt ${attempt} failed with API Error ${data?.ErrorCode}: ${data?.ErrorMessage}`);
                lastError = data?.ErrorMessage || `API Error ${data?.ErrorCode}`;
            }
        } catch (err) {
            console.warn(`[SMS] ⚠️ Attempt ${attempt} failed:`, err.message);
            lastError = err.message;
        }

        // Wait 1.5 seconds before retrying
        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    console.error(`[SMS] ❌ All ${maxAttempts} attempts failed. Last error: ${lastError}`);
    return { success: false, error: lastError };
}


// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send Signup / Login OTP via SMS.
 *
 * Approved template (ID: 1777178411219440996):
 *   "Your OTP for creating your new Cursive Letters LY account is {#var#}.
 *    This OTP is valid for {#var#} minutes. Please do not share it with anyone."
 *
 * @param {string} phone          Customer mobile number
 * @param {string} otp            6-digit OTP
 * @param {number} [validity=10]  OTP validity in minutes (default 10)
 */
async function sendSignupOTPSMS(phone, otp, validity = 10) {
    const text = `Your OTP for creating your new Cursive Letters LY account is ${otp}. This OTP is valid for ${validity} minutes. Please do not share it with anyone.`;
    return sendSMS(phone, text, TEMPLATE_IDS.LOGIN_OTP);
}

/**
 * Send Password-Reset OTP via SMS.
 *
 * Approved template (ID: 1777178411690264265):
 *   "Your OTP for resetting your password is {#var#}. This OTP is valid for
 *    10 minutes. Please do not share it with anyone. Cursive Letters LY"
 *
 * @param {string} phone  Customer mobile number
 * @param {string} otp    6-digit OTP
 */
async function sendPasswordResetOTPSMS(phone, otp) {
    const text = `Your OTP for resetting your password is ${otp}. This OTP is valid for 10 minutes. Please do not share it with anyone. Cursive Letters LY`;
    return sendSMS(phone, text, TEMPLATE_IDS.RESET_OTP);
}

/**
 * Send Order Confirmation SMS — fires immediately when customer places an order.
 *
 * Approved template (ID: 1777178411694628739):
 *   "Dear {#var#}, your order {#var#} has been successfully placed. You can
 *    view your order details on our website. We will process your order for
 *    dispatch shortly. Thank you for shopping with us. Cursive Letters LY"
 *
 * @param {string} phone        Customer mobile number
 * @param {string} customerName Customer's name
 * @param {string} orderID      Order ID
 */
async function sendOrderConfirmationSMS(phone, customerName, orderID) {
    const text = `Dear ${customerName}, your order ${orderID} has been successfully placed. You can view your order details on our website. We will process your order for dispatch shortly. Thank you for shopping with us. Cursive Letters LY`;
    return sendSMS(phone, text, TEMPLATE_IDS.ORDER_CONFIRM);
}

/**
 * Send order dispatch SMS notification.
 * Approved template (ID: 1777178417937552272):
 *   "Dear {#var#}, your order {#var#} has been dispatched and is on its way.
 *    Your delivery Partner is {#var#} and the tracking number is {#var#}.
 *    Thank you for shopping with us. Cursive Letters LY"
 *
 * @param {string} phone         Customer mobile number
 * @param {string} customerName  Customer's name
 * @param {string} orderID       Order ID
 * @param {string} companyName   Delivery Partner name
 * @param {string} awbNumber     Tracking Number
 */
async function sendDispatchSMS(phone, customerName, orderID, companyName, awbNumber) {
    const partner = companyName || 'our courier partner';
    const tracking = awbNumber || 'dispatched';
    const text = `Dear ${customerName}, your order ${orderID} has been dispatched and is on its way. Your delivery Partner is ${partner} and the tracking number is ${tracking}. Thank you for shopping with us. Cursive Letters LY`;
    return sendSMS(phone, text, TEMPLATE_IDS.DISPATCH);
}


/**
 * Query the SMS Gateway to check the delivery report/status of a job.
 * 
 * @param {string} jobId The JobId returned by SendSMS
 */
async function getDeliveryStatus(jobId) {
    if (!jobId) return { success: false, error: 'No Job ID provided' };
    if (!SMS_API_KEY) return { success: false, error: 'SMS_API_KEY not configured' };

    try {
        const url = `${SMS_BASE_URL.replace('/SendSMS', '/GetDelivery')}?APIKey=${SMS_API_KEY}&jobid=${jobId}`;
        const response = await axios.get(url, { timeout: 10000 });
        const data = response.data;

        if (data?.ErrorCode === '0') {
            const report = data.DeliveryReports?.[0];
            return {
                success: true,
                status: report?.DeliveryStatus || 'Unknown',
                recipient: report?.Recipient,
            };
        } else {
            return { success: false, error: data?.ErrorMessage || `Gateway error code ${data?.ErrorCode}` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ─── Legacy aliases (keep old callers working) ───────────────────────────────
/** @deprecated Use sendSignupOTPSMS */
const sendOTPSMS = sendSignupOTPSMS;
/** @deprecated Use sendOrderConfirmationSMS */
const sendOrderConfirmedSMS = sendOrderConfirmationSMS;
/** @deprecated Use sendOrderConfirmationSMS */
const sendOrderAcceptedSMS = sendOrderConfirmationSMS;

module.exports = {
    sendSignupOTPSMS,
    sendPasswordResetOTPSMS,
    sendOrderConfirmationSMS,
    sendDispatchSMS,
    getDeliveryStatus,
    // legacy aliases
    sendOTPSMS,
    sendOrderConfirmedSMS,
    sendOrderAcceptedSMS,
};
