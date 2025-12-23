/**
 * src/content/auth-injector.js
 *
 * This script runs ONLY on the specific dashboard URL.
 * It monitors localStorage for the 'token' and syncs it to chrome.storage.local.
 */

let lastToken = null;

function syncToken() {
    try {
        const token = localStorage.getItem('token');

        if (token !== lastToken) {
            lastToken = token;

            if (token) {
                console.log('[ArmourAI Injector] Token found, syncing to extension storage.');
                chrome.storage.local.set({ extension_auth_token: token }, () => {
                    console.log('[ArmourAI Injector] Token saved to chrome.storage.local');
                });
            } else {
                console.log('[ArmourAI Injector] Token not found (user might be logged out). Clearing from storage.');
                chrome.storage.local.remove('extension_auth_token', () => {
                    console.log('[ArmourAI Injector] Token removed from chrome.storage.local');
                });
            }
        }
    } catch (e) {
        console.error('[ArmourAI Injector] Error syncing token:', e);
    }
}

// Initial check
syncToken();

// Poll every 1 second to catch login/logout events in the SPA without page reload
setInterval(syncToken, 1000);

console.log('[ArmourAI Injector] Loaded and monitoring token.');
