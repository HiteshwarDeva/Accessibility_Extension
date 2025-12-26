const IS_PRODUCTION = false;

const CONFIG = {
    IS_PRODUCTION,

    API_BASE_URL: IS_PRODUCTION
        ? 'https://armourwebcomply.duckdns.org/api'
        : 'http://localhost:3000/api',

    APP_URL: IS_PRODUCTION
        ? 'https://armourwebcomply.duckdns.org'
        : 'http://localhost:3000', // 🔴 BACKEND DOMAIN

    OAUTH: {
        AUTHORIZE_URL: IS_PRODUCTION
            ? 'https://armourwebcomply.duckdns.org/auth/authorize'
            : 'http://localhost:3000/auth/authorize',

        TOKEN_URL: IS_PRODUCTION
            ? 'https://armourwebcomply.duckdns.org/auth/token'
            : 'http://localhost:3000/auth/token'
    }
};

export default CONFIG;
