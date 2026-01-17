// config.js - Minimal configuration

export default {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    debug: process.env.DEBUG === 'true' || false,
    cors: true,
    rateLimit: true,
    cache: true
};
