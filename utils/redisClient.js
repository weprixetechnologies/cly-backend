const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_URL = process.env.REDIS_URL || undefined;

let client = null;
let isConnected = false;

try {
    const options = {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times) {
            // Retry up to 3 times with backoff, then stop attempting until next trigger
            if (times > 3) return null;
            return Math.min(times * 200, 1000);
        }
    };

    if (REDIS_PASSWORD) {
        options.password = REDIS_PASSWORD;
    }

    client = REDIS_URL ? new Redis(REDIS_URL, options) : new Redis({ host: REDIS_HOST, port: REDIS_PORT, ...options });

    client.on('connect', () => {
        isConnected = true;
        console.log('✅ Connected to Redis cache');
    });

    client.on('ready', () => {
        isConnected = true;
    });

    client.on('error', (err) => {
        isConnected = false;
        // Log once or quietly without crashing application
        if (process.env.NODE_ENV !== 'test') {
            console.warn(`[Redis warning] ${err.message}. Falling back to database directly.`);
        }
    });

    client.on('close', () => {
        isConnected = false;
    });

    // Attempt initial connection asynchronously
    client.connect().catch((err) => {
        isConnected = false;
        console.warn(`[Redis unavailable] Could not connect to ${REDIS_HOST}:${REDIS_PORT}: ${err.message}. System will serve from database.`);
    });
} catch (err) {
    console.warn('[Redis initialization failed]', err.message);
    client = null;
    isConnected = false;
}

/**
 * Get cached JSON value by key
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function get(key) {
    if (!client || !isConnected) return null;
    try {
        const data = await client.get(key);
        if (!data) return null;
        return JSON.parse(data);
    } catch (err) {
        console.warn(`[Redis.get error on key ${key}]`, err.message);
        return null;
    }
}

/**
 * Set cached JSON value with optional TTL (seconds)
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds=86400] Default 24 hours
 */
async function set(key, value, ttlSeconds = 86400) {
    if (!client || !isConnected) return false;
    try {
        const payload = JSON.stringify(value);
        if (ttlSeconds && ttlSeconds > 0) {
            await client.set(key, payload, 'EX', ttlSeconds);
        } else {
            await client.set(key, payload);
        }
        return true;
    } catch (err) {
        console.warn(`[Redis.set error on key ${key}]`, err.message);
        return false;
    }
}

/**
 * Delete key(s) from Redis cache
 * @param {string|string[]} keys
 */
async function del(keys) {
    if (!client || !isConnected) return false;
    try {
        const list = Array.isArray(keys) ? keys : [keys];
        if (list.length > 0) {
            await client.del(...list);
        }
        return true;
    } catch (err) {
        console.warn(`[Redis.del error on keys]`, err.message);
        return false;
    }
}

module.exports = {
    client,
    get,
    set,
    del,
    isConnected: () => isConnected
};
