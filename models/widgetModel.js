const settingsModel = require('./settingsModel');
const redisClient = require('../utils/redisClient');

const WIDGET_SETTINGS_KEY = 'widget_floating_settings';
const CHATBOT_FLOW_KEY = 'chatbot_flow_config';

const WIDGET_CONFIG_CACHE_KEY = 'cly:widget_config';
const CHATBOT_FLOW_CACHE_KEY = 'cly:chatbot_flow';

const DEFAULT_WIDGET_SETTINGS = {
    contact_form_enabled: true,
    chatbot_enabled: true,
    contact_button_label: 'Quick Inquiry',
    chatbot_button_label: 'Chat with Us',
    chatbot_title: 'CLY Assistant',
    chatbot_welcome_message: 'Hi there! 👋 Welcome to Cursive Letters. How can we help you today?',
    contact_form_title: 'Quick Inquiry',
    contact_form_subtitle: 'Leave your contact and requirements. We will get back to you promptly!',
    shake_interval_seconds: 6
};

const DEFAULT_CHATBOT_FLOW = {
    initialStepId: 'start',
    steps: [
        {
            id: 'start',
            message: 'Hello! Welcome to Cursive Letters. What can we help you with today?',
            options: [
                {
                    id: 'opt_products',
                    label: '🛍️ Explore Products',
                    action: 'step',
                    nextStepId: 'products_step'
                },
                {
                    id: 'opt_custom',
                    label: '📝 Custom Order / Bulk Inquiry',
                    action: 'contact_form'
                },
                {
                    id: 'opt_track',
                    label: '📦 Track Order & FAQ',
                    action: 'step',
                    nextStepId: 'faq_step'
                },
                {
                    id: 'opt_human',
                    label: '💬 Speak with Us Directly',
                    action: 'step',
                    nextStepId: 'contact_options_step'
                }
            ]
        },
        {
            id: 'products_step',
            message: 'We offer imported premium stationery, art supplies, pens, notebooks, and aesthetic gifts. What would you like to explore?',
            options: [
                {
                    id: 'opt_prod_catalog',
                    label: 'View All Products',
                    action: 'link',
                    url: '/products',
                    openInNewTab: false
                },
                {
                    id: 'opt_prod_categories',
                    label: 'Browse Categories',
                    action: 'link',
                    url: '/categories',
                    openInNewTab: false
                },
                {
                    id: 'opt_prod_bulk',
                    label: 'Custom Bulk Quotation',
                    action: 'contact_form'
                },
                {
                    id: 'opt_prod_back',
                    label: '« Back to Main Menu',
                    action: 'step',
                    nextStepId: 'start'
                }
            ]
        },
        {
            id: 'faq_step',
            message: 'You can check your order status from your Account Dashboard, or browse our frequently asked questions.',
            options: [
                {
                    id: 'opt_faq_account',
                    label: 'My Account / Orders',
                    action: 'link',
                    url: '/account',
                    openInNewTab: false
                },
                {
                    id: 'opt_faq_page',
                    label: 'View FAQs Page',
                    action: 'link',
                    url: '/faq',
                    openInNewTab: false
                },
                {
                    id: 'opt_faq_help',
                    label: 'Send an Inquiry',
                    action: 'contact_form'
                },
                {
                    id: 'opt_faq_back',
                    label: '« Back to Main Menu',
                    action: 'step',
                    nextStepId: 'start'
                }
            ]
        },
        {
            id: 'contact_options_step',
            message: 'We would love to assist you! You can submit your requirements right here or view our Contact Us page for addresses and direct phone lines.',
            options: [
                {
                    id: 'opt_co_form',
                    label: 'Fill Quick Inquiry Form',
                    action: 'contact_form'
                },
                {
                    id: 'opt_co_page',
                    label: 'Visit Contact Page',
                    action: 'link',
                    url: '/contact',
                    openInNewTab: false
                },
                {
                    id: 'opt_co_back',
                    label: '« Back to Main Menu',
                    action: 'step',
                    nextStepId: 'start'
                }
            ]
        }
    ]
};

/**
 * Get public widget config (cached in Redis for microsecond response)
 */
async function getWidgetConfig() {
    // 1. Try Redis cache first
    try {
        const cached = await redisClient.get(WIDGET_CONFIG_CACHE_KEY);
        if (cached) {
            return cached;
        }
    } catch (err) {
        console.warn('[widgetModel.getWidgetConfig] Redis cache read failed, falling back to database:', err.message);
    }

    // 2. Fetch from database
    let settings = DEFAULT_WIDGET_SETTINGS;
    let chatbotFlow = DEFAULT_CHATBOT_FLOW;

    try {
        const rawSettings = await settingsModel.getSetting(WIDGET_SETTINGS_KEY);
        if (rawSettings) {
            settings = { ...DEFAULT_WIDGET_SETTINGS, ...JSON.parse(rawSettings) };
        }
    } catch (e) {
        console.error('Error parsing widget settings:', e);
    }

    try {
        const rawFlow = await settingsModel.getSetting(CHATBOT_FLOW_KEY);
        if (rawFlow) {
            chatbotFlow = JSON.parse(rawFlow);
        }
    } catch (e) {
        console.error('Error parsing chatbot flow:', e);
    }

    const result = {
        contact_form_enabled: Boolean(settings.contact_form_enabled),
        chatbot_enabled: Boolean(settings.chatbot_enabled),
        contact_button_label: settings.contact_button_label,
        chatbot_button_label: settings.chatbot_button_label,
        chatbot_title: settings.chatbot_title,
        chatbot_welcome_message: settings.chatbot_welcome_message,
        contact_form_title: settings.contact_form_title,
        contact_form_subtitle: settings.contact_form_subtitle,
        shake_interval_seconds: Number(settings.shake_interval_seconds) || 6,
        chatbot_flow: chatbotFlow
    };

    // 3. Populate Redis cache (TTL: 24 hours)
    try {
        await redisClient.set(WIDGET_CONFIG_CACHE_KEY, result, 86400);
        await redisClient.set(CHATBOT_FLOW_CACHE_KEY, chatbotFlow, 86400);
    } catch (err) {
        console.warn('[widgetModel.getWidgetConfig] Redis cache write failed:', err.message);
    }

    return result;
}

/**
 * Save widget settings and bust Redis cache
 */
async function saveWidgetSettings(settings) {
    const merged = { ...DEFAULT_WIDGET_SETTINGS, ...settings };
    await settingsModel.setSetting(WIDGET_SETTINGS_KEY, JSON.stringify(merged));

    // Invalidate Redis cache
    try {
        await redisClient.del([WIDGET_CONFIG_CACHE_KEY]);
    } catch (err) {
        console.warn('[widgetModel.saveWidgetSettings] Redis cache invalidation error:', err.message);
    }

    return merged;
}

/**
 * Save chatbot flow, persist to DB and update Redis cache
 */
async function saveChatbotFlow(flow) {
    if (!flow || typeof flow !== 'object' || !Array.isArray(flow.steps)) {
        throw new Error('Invalid chatbot flow format');
    }
    await settingsModel.setSetting(CHATBOT_FLOW_KEY, JSON.stringify(flow));

    // Update Redis cache immediately and bust widget config cache
    try {
        await redisClient.set(CHATBOT_FLOW_CACHE_KEY, flow, 86400);
        await redisClient.del([WIDGET_CONFIG_CACHE_KEY]);
    } catch (err) {
        console.warn('[widgetModel.saveChatbotFlow] Redis cache update error:', err.message);
    }

    return flow;
}

module.exports = {
    DEFAULT_WIDGET_SETTINGS,
    DEFAULT_CHATBOT_FLOW,
    getWidgetConfig,
    saveWidgetSettings,
    saveChatbotFlow
};
